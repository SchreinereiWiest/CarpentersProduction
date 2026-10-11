import express from 'express';
import prisma from '../config/prisma.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { calculateManagement, defaultConfig, fiscalRange, grossAmount, today } from '../../../shared/management.mjs';
import { dateValue, invalid, number, reference, textValue, uuid, validateConfig, validateTransaction, versionValue, yearValue } from '../services/managementValidation.js';

const router = express.Router();
router.use(authenticate, authorizeRoles('admin', 'manager'));
const run = handler => async (req, res) => {
  try { await handler(req, res); }
  catch (error) {
    const conflict = ['P2002', 'P2034'].includes(error.code);
    const missing = error.code === 'P2025';
    if (!error.status && !conflict && !missing) console.error('Management:', error);
    res.status(error.status || (conflict ? 409 : missing ? 404 : 500)).json({ message: error.status ? error.message : conflict ? 'Die Daten wurden zwischenzeitlich geändert oder bereits übernommen. Bitte neu laden.' : missing ? 'Eintrag nicht gefunden.' : 'Betriebsdaten konnten nicht verarbeitet werden.' });
  }
};
const requestYear = req => yearValue(req.query.year || today().slice(0, 4));
const periodConfig = async (db, year) => (await db.managementPeriod.findUnique({ where: { year } }))?.config || defaultConfig();
const audit = (db, req, action, entityId) => db.auditLog.create({ data: { actorUserId: req.user.id, action: `management.${action}`, entityType: 'Management', entityId: entityId || null } });
const write = (req, action, operation) => prisma.$transaction(async db => {
  const result = await operation(db);
  await audit(db, req, action, result?.id);
  return result;
}, { isolationLevel: 'Serializable' });

router.get('/', run(async (req, res) => {
  const year = requestYear(req);
  // Ein konsistenter Snapshot für Übersicht, BAB und Kalkulationssätze.
  const state = await prisma.$transaction(async db => {
    const period = await db.managementPeriod.findUnique({ where: { year } });
    const transactions = await db.managementTransaction.findMany({ include: { payments: true }, orderBy: { date: 'desc' } });
    const assets = await db.managementAsset.findMany({ orderBy: { acquiredAt: 'desc' } });
    const loans = await db.managementLoan.findMany({ include: { repayments: true }, orderBy: { startDate: 'desc' } });
    return { year, config: period?.config || defaultConfig(), revision: period?.revision || 0, transactions, assets, loans };
  }, { isolationLevel: 'RepeatableRead' });
  res.json({ ...state, calculation: calculateManagement(state, { year, basis: req.query.basis === 'plan' ? 'plan' : 'actual' }) });
}));

router.get('/references', run(async (_req, res) => {
  const [projects, files] = await Promise.all([
    prisma.project.findMany({ where: { deletedAt: null }, select: { id: true, title: true, projectNumber: true } }),
    prisma.file.findMany({ where: { deletedAt: null, OR: [{ category: 'management-document' }, { mimeType: 'application/pdf' }, { mimeType: { startsWith: 'image/' } }] }, select: { id: true, fileName: true, projectId: true, category: true }, orderBy: { uploadedAt: 'desc' } }),
  ]);
  res.json({ projects, files });
}));

router.put('/settings', run(async (req, res) => {
  const year = requestYear(req);
  const config = validateConfig(req.body.config);
  const revision = versionValue(req.body.revision);
  const result = await write(req, 'settings.save', async db => {
    const range = fiscalRange(year, config.startMonth);
    const periods = await db.managementPeriod.findMany({ where: { year: { not: year } } });
    for (const period of periods) {
      const other = fiscalRange(period.year, period.config.startMonth);
      if (range.start <= other.end && range.end >= other.start) invalid(`Geschäftsjahr überschneidet sich mit ${period.year}. Geschäftsmonat passend zu den bestehenden Jahren wählen.`);
    }
    const transactions = await db.managementTransaction.findMany({ where: { date: { gte: new Date(range.start), lte: new Date(range.end) } } });
    const assets = await db.managementAsset.findMany({ where: { acquiredAt: { lte: new Date(range.end) } } });
    for (const entry of transactions) {
      reference(entry.costTypeId, config.costTypes, 'Noch verwendete Kostenart');
      reference(entry.centerId, config.costCenters, 'Noch verwendete Kostenstelle');
    }
    for (const asset of assets) reference(asset.centerId, config.costCenters, 'Kostenstelle eines Anlageguts');
    const existing = await db.managementPeriod.findUnique({ where: { year } });
    if (!existing) {
      if (revision !== 0) invalid('Einstellungen wurden zwischenzeitlich geändert. Bitte neu laden.', 409);
      return db.managementPeriod.create({ data: { year, config, revision: 1 } });
    }
    if (existing.revision !== revision) invalid('Einstellungen wurden zwischenzeitlich geändert. Bitte neu laden.', 409);
    return db.managementPeriod.update({ where: { year }, data: { config, revision: { increment: 1 } } });
  });
  res.json(result);
}));

async function checkLinks(db, data) {
  if (data.projectId && !await db.project.findFirst({ where: { id: data.projectId, deletedAt: null } })) invalid('Projekt nicht gefunden.');
  if (data.fileId && !await db.file.findFirst({ where: { id: data.fileId, deletedAt: null } })) invalid('Beleg nicht gefunden.');
}
router.post('/rules/apply', run(async (req, res) => {
  const result = await write(req, 'rules.apply', async db => {
    const year = requestYear(req);
    const config = await periodConfig(db, year);
    const range = fiscalRange(year, config.startMonth);
    const entries = await db.managementTransaction.findMany({ where: { kind: 'expense', date: { gte: new Date(range.start), lte: new Date(range.end) } } });
    let count = 0;
    for (const entry of entries) {
      const assigned = validateTransaction({ ...entry, amount: Number(entry.amount), vatRate: Number(entry.vatRate), date: entry.date.toISOString().slice(0, 10), dueDate: entry.dueDate?.toISOString().slice(0, 10) }, config);
      if (assigned.costTypeId !== entry.costTypeId || assigned.centerId !== entry.centerId) {
        await db.managementTransaction.update({ where: { id: entry.id }, data: { costTypeId: assigned.costTypeId, centerId: assigned.centerId, version: { increment: 1 } } });
        count++;
      }
    }
    return { count };
  });
  res.json(result);
}));
router.post('/transactions', run(async (req, res) => {
  const result = await write(req, 'transaction.create', async db => {
    const data = validateTransaction(req.body, await periodConfig(db, requestYear(req)));
    await checkLinks(db, data);
    return db.managementTransaction.create({ data });
  });
  res.status(201).json(result);
}));
router.put('/transactions/:id', run(async (req, res) => {
  const id = uuid(req.params.id);
  const result = await write(req, 'transaction.update', async db => {
    const old = await db.managementTransaction.findUniqueOrThrow({ where: { id }, include: { payments: true } });
    if (old.version !== versionValue(req.body.version)) invalid('Geschäftsvorfall wurde geändert. Bitte neu laden.', 409);
    if (old.source === 'loan') invalid('Darlehensbewegungen werden über das Darlehen gepflegt.');
    const data = validateTransaction(req.body, await periodConfig(db, requestYear(req)));
    const paid = old.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    if (paid > grossAmount(data) + 0.001) invalid('Der Betrag darf die vorhandenen Zahlungen nicht unterschreiten.');
    if (old.payments.length && (data.basis !== old.basis || data.kind !== old.kind)) invalid('Art und Datenbasis können bei vorhandenen Zahlungen nicht geändert werden.');
    if (old.payments.length && data.source === 'imputed') invalid('Bezahlte Geschäftsvorfälle können nicht in kalkulatorische Kosten umgewandelt werden.');
    data.sourceKey = old.sourceKey;
    await checkLinks(db, data);
    return db.managementTransaction.update({ where: { id }, data: { ...data, version: { increment: 1 } } });
  });
  res.json(result);
}));
router.delete('/transactions/:id', run(async (req, res) => {
  await write(req, 'transaction.delete', async db => {
    const item = await db.managementTransaction.findUniqueOrThrow({ where: { id: uuid(req.params.id) } });
    if (item.source === 'loan') invalid('Darlehensbewegungen werden über das Darlehen gepflegt.');
    if (item.version !== versionValue(req.query.version)) invalid('Geschäftsvorfall wurde geändert. Bitte neu laden.', 409);
    return db.managementTransaction.delete({ where: { id: item.id } });
  });
  res.json({ success: true });
}));
router.post('/transactions/:id/payments', run(async (req, res) => {
  const result = await write(req, 'payment.create', async db => {
    const entry = await db.managementTransaction.findUniqueOrThrow({ where: { id: uuid(req.params.id) }, include: { payments: true } });
    if (entry.basis !== 'actual' || ['loan', 'imputed'].includes(entry.source)) invalid('Für diesen Vorfall können keine Zahlungen erfasst werden.');
    const amount = number(req.body.amount, 'Zahlungsbetrag', 0.01);
    const paid = entry.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    if (roundPayment(paid + amount) > grossAmount(entry)) invalid('Die Zahlung übersteigt den offenen Betrag.');
    await db.managementTransaction.update({ where: { id: entry.id }, data: { version: { increment: 1 } } });
    return db.managementPayment.create({ data: { transactionId: entry.id, amount, date: dateValue(req.body.date, 'Zahlungsdatum'), note: textValue(req.body.note, 'Notiz') } });
  });
  res.status(201).json(result);
}));
const roundPayment = value => Math.round(value * 100) / 100;
router.delete('/payments/:id', run(async (req, res) => {
  await write(req, 'payment.delete', async db => {
    const payment = await db.managementPayment.findUniqueOrThrow({ where: { id: uuid(req.params.id) }, include: { transaction: true } });
    if (payment.transaction.source === 'loan') invalid('Darlehensbewegungen werden über das Darlehen gepflegt.');
    await db.managementTransaction.update({ where: { id: payment.transactionId }, data: { version: { increment: 1 } } });
    return db.managementPayment.delete({ where: { id: payment.id } });
  });
  res.json({ success: true });
}));

router.post('/assets', run(async (req, res) => {
  const result = await write(req, 'asset.create', async db => {
    const config = await periodConfig(db, requestYear(req));
    const purchaseCost = number(req.body.purchaseCost, 'Anschaffungskosten', 0.01);
    return db.managementAsset.create({ data: {
      name: textValue(req.body.name, 'Anlagegut', true, 200), acquiredAt: dateValue(req.body.acquiredAt, 'Anschaffungsdatum'), purchaseCost,
      residualValue: number(req.body.residualValue, 'Restwert', 0, purchaseCost), usefulLifeYears: number(req.body.usefulLifeYears, 'Nutzungsdauer', 0.01, 100),
      centerId: reference(req.body.centerId, config.costCenters, 'Kostenstelle'), note: textValue(req.body.note, 'Notiz'),
    } });
  });
  res.status(201).json(result);
}));
router.delete('/assets/:id', run(async (req, res) => {
  await write(req, 'asset.delete', db => db.managementAsset.delete({ where: { id: uuid(req.params.id) } }));
  res.json({ success: true });
}));
router.put('/assets/:id', run(async (req, res) => {
  const result = await write(req, 'asset.update', async db => {
    const old = await db.managementAsset.findUniqueOrThrow({ where: { id: uuid(req.params.id) } });
    if (old.version !== versionValue(req.body.version)) invalid('Anlagegut wurde geändert. Bitte neu laden.', 409);
    const config = await periodConfig(db, requestYear(req));
    const purchaseCost = number(req.body.purchaseCost, 'Anschaffungskosten', 0.01);
    return db.managementAsset.update({ where: { id: old.id }, data: {
      name: textValue(req.body.name, 'Anlagegut', true, 200), acquiredAt: dateValue(req.body.acquiredAt, 'Anschaffungsdatum'), purchaseCost,
      residualValue: number(req.body.residualValue, 'Restwert', 0, purchaseCost), usefulLifeYears: number(req.body.usefulLifeYears, 'Nutzungsdauer', 0.01, 100),
      centerId: reference(req.body.centerId, config.costCenters, 'Kostenstelle'), note: textValue(req.body.note, 'Notiz'), version: { increment: 1 },
    } });
  });
  res.json(result);
}));
router.post('/loans', run(async (req, res) => {
  const result = await write(req, 'loan.create', async db => {
    const principal = number(req.body.principal, 'Darlehensbetrag', 0.01);
    const startDate = dateValue(req.body.startDate, 'Auszahlungsdatum');
    const name = textValue(req.body.name, 'Darlehen', true, 200);
    const loan = await db.managementLoan.create({ data: { name, startDate, principal, interestRate: number(req.body.interestRate, 'Zinssatz', 0, 100), note: textValue(req.body.note, 'Notiz') } });
    await db.managementTransaction.create({ data: { kind: 'cash_in', basis: 'actual', source: 'loan', sourceKey: `loan:${loan.id}`, title: `Darlehensauszahlung · ${name}`, date: startDate, amount: principal, payments: { create: { date: startDate, amount: principal } } } });
    return loan;
  });
  res.status(201).json(result);
}));
router.post('/loans/:id/repayments', run(async (req, res) => {
  const result = await write(req, 'loan.repay', async db => {
    const loan = await db.managementLoan.findUniqueOrThrow({ where: { id: uuid(req.params.id) }, include: { repayments: true } });
    const date = dateValue(req.body.date, 'Tilgungsdatum');
    if (date < loan.startDate) invalid('Tilgung liegt vor der Auszahlung.');
    const amount = number(req.body.amount, 'Tilgung', 0.01);
    if (roundPayment(loan.repayments.reduce((sum, item) => sum + Number(item.amount), 0) + amount) > Number(loan.principal)) invalid('Tilgung übersteigt die Restschuld.');
    const repayment = await db.managementRepayment.create({ data: { loanId: loan.id, date, amount } });
    await db.managementTransaction.create({ data: { kind: 'cash_out', basis: 'actual', source: 'loan', sourceKey: `repayment:${repayment.id}`, title: `Tilgung · ${loan.name}`, date, amount, payments: { create: { date, amount } } } });
    return repayment;
  });
  res.status(201).json(result);
}));
router.put('/loans/:id', run(async (req, res) => {
  const result = await write(req, 'loan.update', db => db.managementLoan.update({ where: { id: uuid(req.params.id) }, data: {
    name: textValue(req.body.name, 'Darlehen', true, 200), interestRate: number(req.body.interestRate, 'Zinssatz', 0, 100), note: textValue(req.body.note, 'Notiz'),
  } }));
  res.json(result);
}));
router.delete('/repayments/:id', run(async (req, res) => {
  await write(req, 'loan.repayment.delete', async db => {
    const payment = await db.managementRepayment.findUniqueOrThrow({ where: { id: uuid(req.params.id) } });
    await db.managementTransaction.delete({ where: { sourceKey: `repayment:${payment.id}` } });
    return db.managementRepayment.delete({ where: { id: payment.id } });
  });
  res.json({ success: true });
}));
router.delete('/loans/:id', run(async (req, res) => {
  await write(req, 'loan.delete', async db => {
    const loan = await db.managementLoan.findUniqueOrThrow({ where: { id: uuid(req.params.id) }, include: { repayments: true } });
    await db.managementTransaction.deleteMany({ where: { sourceKey: { in: [`loan:${loan.id}`, ...loan.repayments.map(item => `repayment:${item.id}`)] } } });
    return db.managementLoan.delete({ where: { id: loan.id } });
  });
  res.json({ success: true });
}));

export default router;
