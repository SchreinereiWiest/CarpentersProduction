import { createUuid } from '../utils/uuid.js';
import { fiscalRange } from '@Engine/management/utils/dates.mjs';
import { defaultConfig } from '@Engine/management/defaults/config.defaults.mjs';
import { createAssetDefaults, createAnnualCostDefaults, createCenterDefaults, createDistributionKeyDefaults, createEasyRateDefaults, createLoanDefaults, createStaffDefaults, STAFF_DEFAULTS } from '@Engine/management/defaults/forms.defaults.mjs';
import { SUGGESTED_CENTERS } from '@Engine/management/defaults/catalog.defaults.mjs';
import { createWorkBlocks } from '../../../services/companySettings.js';

/** Erstellt eine neue Anlage mit Browser-ID und Jahresbeginn als überprüfbarem Anschaffungsdatum. */
export function newAsset(year) { return createAssetDefaults(createUuid(), `${year}-01-01`); }
/** Erstellt einen neuen betrieblichen Bereich mit unabhängigen Tätigkeiten und Gewichten. */
export function newCenter() { return createCenterDefaults(createUuid()); }
/** Erstellt eine Restschuldposition, ohne daraus einen Geschäftsvorfall abzuleiten. */
export function newLoan() { return createLoanDefaults(createUuid()); }
/** Erstellt eine Jahreskostenposition; Katalogwerte werden als ausdrückliche Überschreibungen übergeben. */
export function newAnnualCost(overrides = {}) { return createAnnualCostDefaults(createUuid(), overrides); }
/** Erstellt einen noch auszufüllenden Easy-Stundensatz. */
export function newEasyRate() { return createEasyRateDefaults(createUuid()); }
/** Erstellt einen eigenen Verteilungsschlüssel mit leeren Gewichten. */
export function newDistributionKey() { return createDistributionKeyDefaults(createUuid()); }

/** Leitet Jahreswerktage und Netto-Tagesstunden aus Geschäftsjahr und Firmeneinstellungen ab. */
export function newStaff(employee, centers, { year, startMonth = defaultConfig().startMonth, settings } = {}) {
  const available = centers.filter(center => center.kind !== 'support');
  let workDays = STAFF_DEFAULTS.workDays;
  if (year) {
    const range = fiscalRange(year, startMonth); workDays = 0;
    for (const date = new Date(range.start); date <= new Date(range.end); date.setUTCDate(date.getUTCDate() + 1)) {
      if (![0, 6].includes(date.getUTCDay())) workDays++;
    }
  }
  const hoursPerDay = settings ? createWorkBlocks(settings).reduce((sum, block) => sum + block.duration, 0) / 60 : STAFF_DEFAULTS.hoursPerDay;
  return createStaffDefaults(createUuid(), {
    userId: employee?.id || null,
    name: [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') || employee?.login || STAFF_DEFAULTS.name,
    workDays, hoursPerDay,
    allocations: available.map((center, index) => ({ centerId: center.id, percent: index === 0 ? 100 : 0 })),
  });
}

/** Schlägt typische Bereiche vor und filtert Tätigkeits-IDs auf den vorhandenen Firmenkatalog. */
export function suggestedCenters(activities) {
  const available = new Set(activities.map(item => item.id));
  return SUGGESTED_CENTERS.map(([id, name, kind, activityIds]) => createCenterDefaults(id, {
    name, kind, activityIds: activityIds.filter(id => available.has(id)),
  }));
}
