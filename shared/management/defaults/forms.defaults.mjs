/** Vorgaben für Anlagen; Ist-Aufwendungen bleiben unbekannt, bis sie ausdrücklich erfasst werden. */
export const ASSET_DEFAULTS = {
  name: '', category: 'machine', acquiredAt: '', purchaseCost: 0, replacementCost: 0,
  useReplacement: false, residualValue: 0, usefulLifeYears: 10, usedYears: null,
  centerId: null, loanId: null, maintenance: 0, energy: 0, space: 0, operating: 0,
  actualMaintenance: null, actualEnergy: null, actualSpace: null, actualOperating: null,
  hours: 0, activityIds: [], interestRate: 3, interestAmount: null,
};

/** Kapazitätsannahmen sind überprüfbare Startwerte und keine erfassten Arbeitszeiten. */
export const STAFF_DEFAULTS = {
  name: 'Mitarbeiter', userId: null, annualHours: null, workDays: 260, holidays: 10,
  vacation: 30, sickDays: 10, trainingDays: 5, hoursPerDay: 8, productivity: 80,
  annualCost: 0, fte: 1, allocations: [],
};
export const CENTER_DEFAULTS = {
  name: 'Neuer Bereich', kind: 'production', hours: 0, area: 0, employees: 0,
  directBase: 0, redistributionKey: 'hours', consumption: 0, usage: 0, activityIds: [],
};
export const LOAN_DEFAULTS = { name: 'Darlehen', balance: 0, interestRate: 0, repayment: 0, centerId: null };
export const ANNUAL_COST_DEFAULTS = {
  name: 'Weitere Betriebskosten', costTypeId: 'other', amount: 0, actualAmount: null,
  centerId: null, keyId: 'hours', source: 'manual',
};
export const EASY_RATE_DEFAULTS = { name: 'Werkstatt', rate: 0 };
export const DISTRIBUTION_KEY_DEFAULTS = { name: 'Eigener Schlüssel', metric: 'custom', weights: {} };

/** Erstellt eine unabhängige Anlage mit vorgegebener ID und Anschaffungsdatum. */
export function createAssetDefaults(id, acquiredAt = ASSET_DEFAULTS.acquiredAt) {
  return { ...structuredClone(ASSET_DEFAULTS), id, acquiredAt };
}
/** Erstellt eine unabhängige Personalplanung; abgeleitete Arbeitszeiten überschreiben die Vorgaben. */
export function createStaffDefaults(id, overrides = {}) {
  return { ...structuredClone(STAFF_DEFAULTS), id, ...overrides };
}
/** Erstellt eine Kostenstelle; eigene Bereiche und Katalogvorschläge verwenden dieselbe Struktur. */
export function createCenterDefaults(id, overrides = {}) {
  return { ...structuredClone(CENTER_DEFAULTS), id, ...overrides };
}
/** Erstellt eine Restschuldposition ohne Zahlungs- oder Buchungsbewegung. */
export function createLoanDefaults(id, overrides = {}) {
  return { ...structuredClone(LOAN_DEFAULTS), id, ...overrides };
}
/** Erstellt eine Jahreskostenposition; null als Ist-Wert bedeutet weiterhin fehlende Daten. */
export function createAnnualCostDefaults(id, overrides = {}) {
  return { ...structuredClone(ANNUAL_COST_DEFAULTS), id, ...overrides };
}
/** Erstellt eine zunächst unvollständige Easy-Rate, die der Benutzer vor Freigabe ergänzen muss. */
export function createEasyRateDefaults(id) {
  return { ...structuredClone(EASY_RATE_DEFAULTS), id };
}
/** Erstellt einen eigenen Schlüssel mit unabhängigen, zunächst leeren Verteilungsgewichten. */
export function createDistributionKeyDefaults(id) {
  return { ...structuredClone(DISTRIBUTION_KEY_DEFAULTS), id };
}
