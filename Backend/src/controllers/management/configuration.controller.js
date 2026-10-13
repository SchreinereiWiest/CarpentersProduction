import { fiscalRange } from '../../../../shared/management/utils/dates.mjs';
import { calculateSetup } from '../../../../shared/management/calculation/accounting.mjs';
import { setupChecks } from '../../../../shared/management/config/approval.mjs';
import { requestYear } from '../../services/management/http.js';
import { write } from '../../services/management/persistence.js';
import { loadTimeEntries } from '../../services/management/snapshots.js';
import { validateConfig } from '../../services/management/validation/configuration.js';
import { invalid, textValue, versionValue } from '../../services/management/validation/values.js';
import { MAX_APPROVALS } from '../../../../shared/management/defaults/validation.defaults.mjs';

/** Speichert den validierten Entwurf revisionssicher; Freigabehistorie stammt ausschließlich vom Server. */
export async function saveManagementConfig(req, res) {
  const year = requestYear(req);
  const config = validateConfig(req.body?.config);
  const revision = versionValue(req.body?.revision);
  const result = await write(req, 'settings.save', 
    /** Prüft Periodenkonflikte und Revision, übernimmt die serverseitige Historie und speichert den Entwurf. */
    async function saveDraft(db) {
      const range = fiscalRange(year, config.startMonth);
      const periods = await db.managementPeriod.findMany({ where: { year: { not: year } } });
      for (const period of periods) {
        const other = fiscalRange(period.year, period.config.startMonth);
        if (range.start <= other.end && range.end >= other.start) invalid(`Geschäftsjahr überschneidet sich mit ${period.year}. Geschäftsmonat passend zu den bestehenden Jahren wählen.`);
      }
      const existing = await db.managementPeriod.findUnique({ where: { year } });
      if ((existing?.revision || 0) !== revision) invalid('Einstellungen wurden zwischenzeitlich geändert. Bitte neu laden.', 409);
      config.setup.approvals = existing?.config?.setup?.approvals || [];
      for (const staff of config.setup.staff) {
        if (staff.userId && !await db.user.findFirst({ where: { id: staff.userId, deletedAt: null } })) invalid('Mitarbeiter nicht gefunden.');
      }
      return existing
        ? db.managementPeriod.update({ where: { year }, data: { config, revision: { increment: 1 } } })
        : db.managementPeriod.create({ data: { year, config, revision: 1 } });
    });
  res.json(result);
}

/** Prüft einen gespeicherten Entwurf und fixiert Eingaben, BAB und Sätze als nächste Jahresversion. */
export async function approveManagementSetup(req, res) {
  const year = requestYear(req);
  const result = await write(req, 'setup.approve', 
    /** Prüft den gespeicherten Entwurf erneut und veröffentlicht Eingaben sowie Rechnung als neue Version. */
    async function publishVersion(db) {
      const period = await db.managementPeriod.findUnique({ where: { year } });
      if (!period || period.revision !== versionValue(req.body?.revision)) invalid('Einrichtung zuerst speichern oder neu laden.', 409);
      const config = validateConfig(period.config);
      const calculation = calculateSetup(config, { year, timeEntries: await loadTimeEntries(db, year) });
      const errors = setupChecks(config, calculation);
      if (errors.length) invalid(errors.join(' '));
      const history = period.config.setup?.approvals || [];
      if (history.length >= MAX_APPROVALS) invalid(`Maximal ${MAX_APPROVALS} Kalkulationsversionen pro Geschäftsjahr.`);
      const approval = {
        version: history.length + 1, approvedAt: new Date().toISOString(), approvedBy: req.user.id,
        note: textValue(req.body?.note, 'Versionsnotiz', false, 500) || '',
        config: structuredClone(config), calculation, rates: calculation.rates,
        machines: calculation.machines.map(({ id, name, total, hours, rate }) => ({ id, name, total, hours, rate })),
        totalCosts: calculation.totalCosts,
      };
      config.setup.approvals = [...history, approval];
      return db.managementPeriod.update({ where: { year }, data: { config, revision: { increment: 1 } } });
    });
  res.json(result);
}
