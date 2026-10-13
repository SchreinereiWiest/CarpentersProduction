import { ACTUAL_ASSET_FIELDS } from '../../../../Engine/management/defaults/validation.defaults.mjs';
import prisma from '../../config/prisma.js';
import { defaultConfig } from '../../../../Engine/management/defaults/config.defaults.mjs';
import { fiscalRange } from '../../../../Engine/management/utils/dates.mjs';
import { approvedConfig } from '../../../../Engine/management/config/approval.mjs';
import { prepareSetupConfig } from '../../../../Engine/management/config/normalize.mjs';
import { calculateSetup } from '../../../../Engine/management/calculation/accounting.mjs';
import { readLegacyInventory } from './legacyInventory.js';
import { READ_OPTIONS, TIME_ENTRY_SELECT } from './defaults/persistence.defaults.js';

/** Lädt abgeschlossene Zeitberichte für aktuelles und vorheriges Geschäftsjahr mit Zeitzonenpuffer. */
export function loadTimeEntries(db, year) {
  const start = new Date(new Date(`${year - 1}-01-01T00:00:00Z`).getTime() - 86400000);
  const end = new Date(`${year + 2}-01-01T00:00:00Z`);
  return db.timeEntry.findMany({
    where: { startedAt: { gte: start, lt: end }, endedAt: { not: null }, duration: { gt: 0 } },
    select: TIME_ENTRY_SELECT,
  });
}

/** Liest Jahreskonfigurationen und Zeitberichte als konsistenten Snapshot; Altdaten nur vor der ersten Einrichtung. */
export function loadSnapshot(year) {
  return prisma.$transaction(
    /** Liest Jahreskonfiguration, Vorjahr, gegebenenfalls Inventar und Zeitberichte innerhalb desselben Read-Snapshots. */
    async function readYearSnapshot(db) {
      const period = await db.managementPeriod.findUnique({ where: { year } });
      const previous = await db.managementPeriod.findUnique({ where: { year: year - 1 } });
      const config = await readLegacyInventory(db, period?.config || defaultConfig());
      return {
        year, config, revision: period?.revision || 0,
        timeEntries: await loadTimeEntries(db, year), previousConfig: previous?.config || null,
      };
    }, READ_OPTIONS);
}

/** Baut Entwurf, eingefrorene Planbasis, laufende Ist-Rechnung und den Vorjahresvergleich auf. */
export function presentSnapshot(state) {
  const { year, timeEntries, revision } = state;
  const draft = prepareSetupConfig(state);
  const operational = operationalConfig(draft);
  const latest = draft.setup.approvals.at(-1);
  const previousConfig = state.previousConfig
    ? operationalConfig(prepareSetupConfig({ config: state.previousConfig })) : null;
  return {
    year, revision, timeEntries, config: draft, operationalConfig: operational,
    setupCalculation: calculateSetup(draft, { year, timeEntries }),
    operatingPlan: latest?.calculation || calculateSetup(operational, { year, timeEntries }),
    operatingActual: calculateSetup(operational, { year, timeEntries, basis: 'actual' }),
    previous: previousConfig ? {
      config: previousConfig,
      plan: state.previousConfig.setup?.approvals?.at(-1)?.calculation || calculateSetup(previousConfig, { year: year - 1, timeEntries, asOf: `${year}-12-31` }),
      actual: calculateSetup(previousConfig, { year: year - 1, timeEntries, basis: 'actual', asOf: fiscalRange(year - 1, previousConfig.startMonth).end }),
    } : null,
  };
}

/** Übernimmt nur aktuelle Ist-Felder in die freigegebenen Eingaben; Planwerte bleiben unverändert. */
export function operationalConfig(draft) {
  const approved = approvedConfig(draft);
  if (!approved) return structuredClone(draft);
  const operational = structuredClone(approved);
  for (const cost of operational.setup.annualCosts) {
    cost.actualAmount = draft.setup.annualCosts.find(item => item.id === cost.id)?.actualAmount ?? null;
  }
  for (const asset of operational.setup.assets) {
    for (const field of ACTUAL_ASSET_FIELDS) asset[field] = draft.setup.assets.find(item => item.id === asset.id)?.[field] ?? null;
  }
  return operational;
}
