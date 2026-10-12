import test from 'node:test';
import assert from 'node:assert/strict';

// Ausschließlich eine ausdrücklich konfigurierte, lokale Wegwerf-Datenbank nutzen.
const testUrl = process.env.MANAGEMENT_TEST_DATABASE_URL;
if (!testUrl) {
  test('Management-API (isolierte PostgreSQL-Datenbank erforderlich)', { skip: 'MANAGEMENT_TEST_DATABASE_URL fehlt' }, () => {});
} else {
  const url = new URL(testUrl);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname === '/management_test', 'Nur lokale management_test-Datenbank erlaubt.');
  process.env.DATABASE_URL = testUrl;
  process.env.JWT_ACCESS_SECRET = 'management-api-tests-local-only';
  const [{ default: express }, { default: cookieParser }, { default: jwt }, { default: prisma }, { default: router }, { defaultConfig }] = await Promise.all([
    import('express'), import('cookie-parser'), import('jsonwebtoken'), import('../src/config/prisma.js'), import('../src/routes/management.routes.js'), import('../../shared/management.mjs'),
  ]);
  test('Management-API speichert und berechnet Geschäftsvorfälle, Zahlungen, Anlagen und Darlehen', async t => {
    await prisma.$transaction([
      prisma.auditLog.deleteMany({ where: { action: { startsWith: 'management.' } } }),
      prisma.managementTransaction.deleteMany(), prisma.managementLoan.deleteMany(),
      prisma.managementAsset.deleteMany(), prisma.managementPeriod.deleteMany(),
      prisma.customer.deleteMany({ where: { companyName: 'Management-Testzeiten' } }),
      prisma.user.deleteMany({ where: { email: { endsWith: '@management.test' } } }),
    ]);
    const app = express(); app.use(express.json()); app.use(cookieParser()); app.use('/api/management', router);
    const server = await new Promise(resolve => { const next = app.listen(0, '127.0.0.1', () => resolve(next)); });
    const origin = `http://127.0.0.1:${server.address().port}/api/management`;
    const users = [];
    for (const role of ['admin', 'manager', 'user']) users.push(await prisma.user.create({ data: { email: `${role}-${Date.now()}@management.test`, login: `${role}-${Date.now()}`, passwordHash: 'test-fixture', role } }));
    const request = async (path = '', { method = 'GET', data, role = 'admin', anonymous = false } = {}) => {
      const user = users.find(item => item.role === role);
      const token = jwt.sign({ id: user.id, authVersion: user.authVersion }, process.env.JWT_ACCESS_SECRET);
      const target = new URL(`${origin}${path}`);
      if (!target.searchParams.has('year')) target.searchParams.set('year', '2026');
      const response = await fetch(target, { method, headers: { 'content-type': 'application/json', ...(anonymous ? {} : { cookie: `token=${token}` }) }, body: data === undefined ? undefined : JSON.stringify(data) });
      return { status: response.status, body: await response.json() };
    };
    try {
      await t.test('Zugriff verlangt Managementrolle', async () => {
        assert.equal((await request('', { anonymous: true })).status, 401);
        assert.equal((await request('', { role: 'user' })).status, 403);
        assert.equal((await request('', { role: 'manager' })).status, 200);
      });
      const config = defaultConfig(); config.mode = 'full'; config.openingCash = 1000;
      config.costCenters = [{ id: 'workshop', name: 'Werkstatt', kind: 'production', hours: 1000, area: 100, employees: 1, directBase: 1000, redistributionKey: 'hours' }];
      config.rules = [{ id: 'electricity', match: 'Strom', costTypeId: 'energy', centerId: 'workshop' }];
      await t.test('Einstellungen prüfen Versionen und bleiben dauerhaft gespeichert', async () => {
        assert.equal((await request('/settings', { method: 'PUT', data: { config, revision: 0 } })).status, 200);
        assert.equal((await request('/settings', { method: 'PUT', data: { config, revision: 0 } })).status, 409);
        const saved = (await request()).body; assert.equal(saved.config.mode, 'full'); assert.equal(saved.revision, 1);
      });
      let invoice;
      await t.test('Ausgabe wendet Zuordnungsregel an und verhindert doppelte Quellübernahme', async () => {
        const data = { title: 'Strom Werkstatt', kind: 'expense', basis: 'actual', date: '2026-03-01', dueDate: '2026-03-10', amount: 100, vatRate: 19, sourceKey: 'document:test-invoice' };
        const response = await request('/transactions', { method: 'POST', data }); assert.equal(response.status, 201); invoice = response.body;
        assert.equal(invoice.costTypeId, 'energy'); assert.equal(invoice.centerId, 'workshop');
        assert.equal((await request('/transactions', { method: 'POST', data })).status, 409);
        assert.equal((await request('/transactions', { method: 'POST', data: { ...data, sourceKey: null, fileId: '00000000-0000-0000-0000-000000000000' } })).status, 400);
      });
      await t.test('Teilzahlungen, Überzahlungsschutz und Parallelzahlungen erhalten den offenen Betrag', async () => {
        assert.equal((await request(`/transactions/${invoice.id}/payments`, { method: 'POST', data: { date: '2026-03-05', amount: 50 } })).status, 201);
        const snapshot = (await request()).body; assert.equal(snapshot.calculation.expense, 100); assert.equal(snapshot.calculation.payables, 69); assert.equal(snapshot.calculation.cash, 950);
        assert.equal((await request(`/transactions/${invoice.id}/payments`, { method: 'POST', data: { date: '2026-03-05', amount: 70 } })).status, 400);
        const attempts = await Promise.all([1, 2].map(() => request(`/transactions/${invoice.id}/payments`, { method: 'POST', data: { date: '2026-03-06', amount: 69 } })));
        assert.equal(attempts.filter(item => item.status === 201).length, 1);
        assert.ok(attempts.some(item => [400, 409].includes(item.status)));
        const complete = (await request()).body; assert.equal(complete.calculation.cash, 881); assert.equal(complete.calculation.payables, 0); assert.equal(complete.calculation.expense, 100);
      });
      await t.test('Bearbeitung verhindert veraltete Versionen und Beträge unter vorhandenen Zahlungen', async () => {
        assert.equal((await request(`/transactions/${invoice.id}`, { method: 'PUT', data: { ...invoice, date: '2026-03-01', dueDate: '2026-03-10' } })).status, 409);
        const latest = (await request()).body.transactions.find(item => item.id === invoice.id);
        assert.equal((await request(`/transactions/${invoice.id}`, { method: 'PUT', data: { ...latest, date: '2026-03-01', dueDate: '2026-03-10', amount: 90 } })).status, 400);
      });
      await t.test('Planwerte ändern keine Ist-Zahlungen oder Ist-Kosten', async () => {
        const response = await request('/transactions', { method: 'POST', data: { title: 'Planmiete', kind: 'expense', basis: 'plan', date: '2026-03-01', amount: 200, vatRate: 0, costTypeId: 'space' } }); assert.equal(response.status, 201);
        assert.equal((await request(`/transactions/${response.body.id}/payments`, { method: 'POST', data: { amount: 50, date: '2026-03-01' } })).status, 400);
        assert.equal((await request()).body.calculation.expense, 100);
        assert.equal((await request('?basis=plan')).body.calculation.expense, 200);
      });
      await t.test('Regeln ergänzen vorhandene Ausgaben ohne gesetzte Kostenarten zu überschreiben', async () => {
        await prisma.managementTransaction.update({ where: { id: invoice.id }, data: { costTypeId: 'material', centerId: null } });
        const response = await request('/rules/apply', { method: 'POST', data: {} }); assert.equal(response.status, 200); assert.equal(response.body.count, 1);
        const assigned = (await request()).body.transactions.find(item => item.id === invoice.id);
        assert.equal(assigned.costTypeId, 'material'); assert.equal(assigned.centerId, 'workshop');
      });
      let asset;
      await t.test('Anlagenabschreibung fließt in den BAB und Änderungen werden versioniert', async () => {
        const data = { name: 'Maschine', acquiredAt: '2026-01-01', purchaseCost: 1200, residualValue: 0, usefulLifeYears: 10, centerId: 'workshop' };
        const response = await request('/assets', { method: 'POST', data }); assert.equal(response.status, 201); asset = response.body;
        const snapshot = (await request()).body; assert.ok(snapshot.calculation.depreciation > 0); assert.equal(snapshot.calculation.cash, 881);
        assert.equal((await request(`/assets/${asset.id}`, { method: 'PUT', data: { ...asset, acquiredAt: '2026-01-01', name: 'CNC' } })).status, 200);
        assert.equal((await request(`/assets/${asset.id}`, { method: 'PUT', data: { ...asset, acquiredAt: '2026-01-01' } })).status, 409);
      });
      let loan;
      await t.test('Darlehensauszahlung und Tilgung werden atomar als neutrale Geldbewegungen erfasst', async () => {
        const response = await request('/loans', { method: 'POST', data: { name: 'Investitionskredit', startDate: '2026-03-01', principal: 1000, interestRate: 5 } }); assert.equal(response.status, 201); loan = response.body;
        const before = (await request()).body; assert.equal(before.calculation.cash, 1881); assert.equal(before.calculation.loanBalance, 1000); assert.equal(before.calculation.expense, 100);
        assert.equal((await request(`/loans/${loan.id}/repayments`, { method: 'POST', data: { date: '2026-03-10', amount: 100 } })).status, 201);
        assert.equal((await request(`/loans/${loan.id}/repayments`, { method: 'POST', data: { date: '2026-03-11', amount: 901 } })).status, 400);
        const after = (await request()).body; assert.equal(after.calculation.cash, 1781); assert.equal(after.calculation.loanBalance, 900); assert.equal(after.calculation.expense, 100);
        const repayment = after.loans.find(item => item.id === loan.id).repayments[0];
        assert.equal((await request(`/repayments/${repayment.id}`, { method: 'DELETE' })).status, 200);
        assert.equal((await request(`/loans/${loan.id}`, { method: 'DELETE' })).status, 200);
        assert.equal((await request()).body.calculation.cash, 881);
      });
      await t.test('Verwendete Kostenstellen bleiben referenziert; Auditdaten erfassen Änderungen', async () => {
        const removed = { ...config, costCenters: [], rules: [] };
        assert.equal((await request('/settings', { method: 'PUT', data: { config: removed, revision: 1 } })).status, 400);
        assert.ok(await prisma.auditLog.count({ where: { action: { startsWith: 'management.' } } }) >= 8);
      });
      await t.test('Überschneidende Geschäftsjahre werden beim Speichern abgelehnt', async () => {
        assert.equal((await request('/settings?year=2025', { method: 'PUT', data: { config: { ...config, startMonth: 4 }, revision: 0 } })).status, 400);
      });
      await t.test('Kalkulatorische Werte haben keine offenen Posten und erlauben keine Zahlungen', async () => {
        const response = await request('/transactions', { method: 'POST', data: { title: 'Unternehmerlohn', kind: 'expense', basis: 'actual', source: 'imputed', date: '2026-03-01', amount: 500, vatRate: 19, costTypeId: 'imputed', centerId: 'workshop' } });
        assert.equal(response.status, 201); assert.equal(Number(response.body.vatRate), 0);
        assert.equal((await request(`/transactions/${response.body.id}/payments`, { method: 'POST', data: { amount: 50, date: '2026-03-01' } })).status, 400);
        const snapshot = (await request()).body; assert.equal(snapshot.calculation.payables, 0); assert.equal(snapshot.calculation.cash, 881); assert.equal(snapshot.calculation.expense, 600);
      });
      await t.test('Unvollständige Einrichtung lässt sich nicht freigeben', async () => {
        assert.equal((await request('/setup/approve', { method: 'POST', data: { revision: 1 } })).status, 400);
        assert.equal((await request('/setup/approve', { method: 'POST', data: { revision: 999 } })).status, 409);
      });
      const customer = await prisma.customer.create({ data: { companyName: 'Management-Testzeiten' } });
      const project = await prisma.project.create({ data: { customerId: customer.id, title: 'Management-Stundentest' } });
      await prisma.timeEntry.create({ data: { projectId: project.id, userId: users[0].id, workType: 'cutting', duration: 60, startedAt: new Date('2026-01-01T08:00:00Z'), endedAt: new Date('2026-01-01T09:00:00Z') } });
      let configured;
      await t.test('Einrichtung übernimmt Tätigkeiten und speichert Plan / Ist ohne Vorfallabhängigkeit', async () => {
        const snapshot = (await request()).body;
        configured = snapshot.config; configured.setup.initialized = true; configured.setup.companyName = 'Schreinerei Test'; configured.setup.assets = []; configured.setup.loans = []; configured.setup.hoursMode = 'recorded';
        configured.costCenters[0].activityIds = ['cutting', 'edging'];
        configured.setup.annualCosts = [{ id: 'annual-rent', name: 'Miete', costTypeId: 'space', amount: 12000, actualAmount: 3000, centerId: 'workshop', keyId: 'area', source: 'manual' }];
        assert.equal((await request('/settings', { method: 'PUT', data: { config: configured, revision: snapshot.revision } })).status, 200);
        const saved = (await request()).body; assert.equal(saved.setupCalculation.totalCosts, 12000); assert.equal(saved.operatingActual.totalCosts, 3000); assert.equal(saved.operatingActual.actualHours.total, 1);
        assert.ok((await request('/references')).body.employees.some(employee => employee.id === users[0].id));
      });
      await t.test('Freigabe speichert Version und behält Planstunden bei späteren Berichten unverändert', async () => {
        const before = (await request()).body;
        assert.equal((await request('/setup/approve', { method: 'POST', data: { revision: before.revision, note: 'Erste Version' } })).status, 200);
        const published = (await request()).body; assert.equal(published.config.setup.approvals.length, 1); assert.equal(published.operatingPlan.rates[0].hours, 1);
        await prisma.timeEntry.create({ data: { projectId: project.id, userId: users[0].id, workType: 'edging', duration: 30, startedAt: new Date('2026-01-01T09:00:00Z'), endedAt: new Date('2026-01-01T09:30:00Z') } });
        const live = (await request()).body; assert.equal(live.operatingActual.actualHours.total, 1.5); assert.equal(live.operatingPlan.rates[0].hours, 1); assert.equal(live.setupCalculation.rates[0].hours, 1.5);
      });
      await t.test('Entwurfsänderung und manipulierte Historie verändern die freigegebene Version nicht', async () => {
        const current = (await request()).body;
        current.config.setup.annualCosts[0].amount = 24000; current.config.setup.annualCosts[0].actualAmount = 4000;
        current.config.setup.approvals = [{ version: 999 }];
        assert.equal((await request('/settings', { method: 'PUT', data: { config: current.config, revision: current.revision } })).status, 200);
        const changed = (await request()).body; assert.equal(changed.config.setup.approvals[0].version, 1); assert.equal(changed.setupCalculation.totalCosts, 24000); assert.equal(changed.operatingPlan.totalCosts, 12000); assert.equal(changed.operatingActual.totalCosts, 4000);
        assert.equal((await request('/setup/approve', { method: 'POST', data: { revision: current.revision } })).status, 409);
        assert.equal((await request('/setup/approve', { method: 'POST', data: { revision: changed.revision, note: 'Neue Planung' } })).status, 200);
        const versioned = (await request()).body; assert.equal(versioned.config.setup.approvals.length, 2); assert.equal(versioned.config.setup.approvals[0].totalCosts, 12000); assert.equal(versioned.operatingPlan.totalCosts, 24000);
      });
      await t.test('Folgejahr erhält den gespeicherten Vorjahresvergleich und seine eigene Freigabe', async () => {
        const next = defaultConfig(); next.mode = 'easy'; next.setup.initialized = true; next.setup.companyName = 'Folgejahr'; next.easyRates = [{ id: 'easy', name: 'Werkstatt', rate: 50 }]; next.costCenters = structuredClone(config.costCenters);
        assert.equal((await request('/settings?year=2027', { method: 'PUT', data: { config: next, revision: 0 } })).status, 200);
        const comparison = (await request('?year=2027')).body; assert.equal(comparison.previous.plan.totalCosts, 24000); assert.equal(comparison.previous.actual.totalCosts, 4000);
        assert.equal((await request('/setup/approve?year=2027', { method: 'POST', data: { revision: 1 } })).status, 200);
        assert.equal((await request('?year=2027')).body.config.setup.approvals[0].version, 1);
      });
    } finally {
      await new Promise(resolve => server.close(resolve)); await prisma.$disconnect();
    }
  });
}
