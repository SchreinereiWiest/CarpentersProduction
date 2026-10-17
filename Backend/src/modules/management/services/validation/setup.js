import { defaultSetup } from '../../../../../../Engine/src/management/defaults/config.defaults.mjs';
import { ASSET_CATEGORIES, COST_SOURCES, HOURS_MODES, IDENTIFIER_PATTERN, INTEREST_MODES, LIMITS, OPTIONAL_ASSET_FIELDS } from '../../../../../../Engine/src/management/defaults/validation.defaults.mjs';
import { dateValue, invalid, number, reference, textValue, uuid } from './values.js';

/** Prüft Anlagen, Restschulden, Jahreskosten und Personalplanung; Freigaben dürfen nur vom Server ergänzt werden. */
export function validateSetup(input, config) {
  const setup = { ...defaultSetup(), ...input };
  setup.companyName = textValue(setup.companyName, 'Betriebsname', false, 200) || '';
  if (typeof setup.initialized !== 'boolean') invalid('Ungültiger Einrichtungsstatus.');
  if (!HOURS_MODES.includes(setup.hoursMode) || !INTEREST_MODES.includes(setup.interestMode)) invalid('Ungültige Berechnungsgrundlage.');
  setup.materialStock = number(setup.materialStock, 'Materialbestand');
  for (const list of ['assets', 'loans', 'annualCosts', 'staff']) {
    if (!Array.isArray(setup[list]) || setup[list].length > LIMITS.setupListMax) invalid(`Ungültige Einrichtungsliste: ${list}.`);
    const ids = new Set();
    for (const item of setup[list]) {
      if (!item || typeof item.id !== 'string' || !IDENTIFIER_PATTERN.test(item.id) || ids.has(item.id)) invalid(`Ungültige oder doppelte ID: ${list}.`);
      ids.add(item.id); item.name = textValue(item.name, 'Bezeichnung', true, 200);
      if (list !== 'staff') item.centerId = reference(item.centerId, config.costCenters, 'Kostenstelle');
    }
  }
  for (const asset of setup.assets) {
    if (!ASSET_CATEGORIES.includes(asset.category) || typeof asset.useReplacement !== 'boolean') invalid('Ungültiger Anlagentyp.');
    asset.acquiredAt = dateValue(asset.acquiredAt, 'Anschaffungsdatum').toISOString().slice(0, 10);
    for (const field of ['purchaseCost', 'replacementCost', 'maintenance', 'energy', 'space', 'operating', 'hours']) asset[field] = number(asset[field], field);
    for (const field of OPTIONAL_ASSET_FIELDS) asset[field] = asset[field] === null || asset[field] === '' || asset[field] === undefined ? null : number(asset[field], field);
    asset.usefulLifeYears = number(asset.usefulLifeYears, 'Nutzungsdauer', 0.01, 100);
    const base = asset.useReplacement ? asset.replacementCost : asset.purchaseCost;
    if (base <= 0) invalid('Abschreibungsbasis muss größer als null sein.');
    asset.residualValue = number(asset.residualValue, 'Restwert', 0, Math.min(base, asset.purchaseCost));
    asset.usedYears = asset.usedYears === null || asset.usedYears === '' ? null : number(asset.usedYears, 'Vergangene Nutzungsjahre', 0, 200);
    asset.interestRate = number(asset.interestRate, 'Kalkulatorischer Zinssatz', 0, 100);
    asset.loanId = reference(asset.loanId, setup.loans, 'Darlehen');
    if (!Array.isArray(asset.activityIds) || asset.activityIds.length > LIMITS.activityListMax || asset.activityIds.some(id => typeof id !== 'string' || !id || id.length > 200)) invalid('Ungültige Maschinen-Tätigkeiten.');
  }
  for (const loan of setup.loans) {
    loan.balance = number(loan.balance, 'Restschuld'); loan.interestRate = number(loan.interestRate, 'Darlehenszinssatz', 0, 100); loan.repayment = number(loan.repayment, 'Jahrestilgung', 0, loan.balance);
  }
  for (const cost of setup.annualCosts) {
    cost.costTypeId = reference(cost.costTypeId, config.costTypes, 'Kostenart');
    if (!cost.costTypeId) invalid('Kostenart fehlt.');
    cost.keyId = reference(cost.keyId, config.distributionKeys, 'Verteilungsschlüssel');
    cost.amount = number(cost.amount, 'Jahresplanwert');
    cost.actualAmount = cost.actualAmount === null || cost.actualAmount === '' ? null : number(cost.actualAmount, 'Kumulierte Ist-Kosten');
    if (!COST_SOURCES.includes(cost.source)) invalid('Ungültige Kostenquelle.');
    if (cost.source === 'staff' && cost.costTypeId !== 'personnel') invalid('Personaldaten sind nur für Personalkosten zulässig.');
  }
  const staffUsers = new Set();
  for (const staff of setup.staff) {
    staff.userId = uuid(staff.userId);
    if (staff.userId && staffUsers.has(staff.userId)) invalid('Ein Personalkonto darf in der Jahresplanung nur einmal vorkommen.');
    if (staff.userId) staffUsers.add(staff.userId);
    staff.annualHours = staff.annualHours === null || staff.annualHours === '' ? null : number(staff.annualHours, 'Produktive Jahresstunden');
    for (const field of ['workDays', 'holidays', 'vacation', 'sickDays', 'trainingDays']) staff[field] = number(staff[field], field, 0, 366);
    staff.hoursPerDay = number(staff.hoursPerDay, 'Tagesstunden', 0, 24);
    staff.productivity = number(staff.productivity, 'Produktivität', 0, 100);
    staff.annualCost = number(staff.annualCost, 'Personalkosten'); staff.fte = number(staff.fte, 'Vollzeitäquivalent', 0, 10);
    if (!Array.isArray(staff.allocations) || staff.allocations.length > LIMITS.configListMax) invalid('Ungültige Personalstundenverteilung.');
    const centers = new Set();
    for (const allocation of staff.allocations) {
      allocation.centerId = reference(allocation.centerId, config.costCenters, 'Tätigkeitsbereich');
      if (!allocation.centerId || centers.has(allocation.centerId)) invalid('Doppelte oder fehlende Personalzuordnung.');
      centers.add(allocation.centerId); allocation.percent = number(allocation.percent, 'Zeitanteil', 0, 100);
    }
  }
  // Freigabehistorie wird ausschließlich vom Server gesetzt.
  setup.approvals = [];
  return Object.fromEntries(Object.keys(defaultSetup()).map(key => [key, setup[key]]));
}
