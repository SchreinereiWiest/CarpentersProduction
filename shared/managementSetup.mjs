import { defaultConfig, defaultSetup, day, distribute, fiscalRange, round, today } from './management.mjs';

export const SETUP_STEPS = [
  ['Business', 'Betrieb & Geschäftsjahr', 'Abrechnungszeitraum, Betriebsstruktur, Kostenstellen'],
  ['Assets', 'Vermögen & Finanzierung', 'Anlagen, Bestände, Darlehen und Abschreibungen'],
  ['AnnualCosts', 'Jährliche Betriebskosten', 'Personal, Räume, Energie und Verwaltung'],
  ['Hours', 'Mitarbeiter & Arbeitsstunden', 'Produktive Stunden je Tätigkeitsbereich'],
  ['Distribution', 'Kostenstellenverteilung', 'Direkte Kosten, Umlagen und Schlüssel'],
  ['Machines', 'Maschinenkostenrechnung', 'Standardmaschinen, CNC und Laufzeiten'],
  ['Bab', 'BAB & Vollkostenkalkulation', 'Stellenkosten und Verrechnungssätze'],
  ['Review', 'Prüfung & Freigabe', 'Prüfung, Simulation und Versionierung'],
];
export const ANNUAL_COST_CATALOG = [
  ['personnel', 'Personal inklusive Arbeitgeberanteile', 'hours'], ['space', 'Miete und Gebäude', 'area'],
  ['energy', 'Strom und Energie', 'consumption'], ['insurance', 'Versicherungen und Beiträge', 'hours'],
  ['vehicles', 'Fahrzeuge und Transport', 'usage'], ['maintenance', 'Wartung und Reparaturen', 'hours'],
  ['administration', 'Büro, IT und Software', 'hours'], ['other', 'Sonstige Gemeinkosten', 'hours'],
];
export function prepareSetupConfig(state) {
  const defaults = defaultConfig();
  const config = structuredClone({ ...defaults, ...state.config, setup: { ...defaultSetup(), ...state.config?.setup } });
  if (state.revision === 0 && !config.easyRates.length && !config.costCenters.length) config.mode = 'full';
  for (const type of defaults.costTypes) if (!config.costTypes.some(item => item.id === type.id)) config.costTypes.push(type);
  for (const id of ['consumption', 'usage']) if (!config.distributionKeys.some(key => key.id === id)) config.distributionKeys.push({ id, name: id === 'consumption' ? 'Energieverbrauch / Messwerte' : 'Fahrzeugnutzung', metric: 'custom', weights: {} });
  config.costCenters.forEach(center => { center.activityIds ||= []; center.consumption ||= 0; center.usage ||= 0; });
  // Vorhandene Eingaben bleiben beim Wechsel zum Assistenten erhalten.
  if (!config.setup.initialized && !config.setup.assets.length && state.assets?.length) config.setup.assets = state.assets.map(asset => ({
    id: asset.id, name: asset.name, category: 'machine', acquiredAt: day(asset.acquiredAt),
    purchaseCost: Number(asset.purchaseCost), replacementCost: 0, useReplacement: false, residualValue: Number(asset.residualValue),
    usefulLifeYears: Number(asset.usefulLifeYears), usedYears: null, centerId: asset.centerId, loanId: null,
    maintenance: 0, energy: 0, space: 0, operating: 0, actualMaintenance: null, actualEnergy: null, actualSpace: null, actualOperating: null, hours: 0, activityIds: [], interestRate: 3, interestAmount: null,
  }));
  if (!config.setup.initialized && !config.setup.loans.length && state.loans?.length) config.setup.loans = state.loans.map(loan => ({
    id: loan.id, name: loan.name, balance: round(Number(loan.principal) - (loan.repayments || []).reduce((sum, item) => sum + Number(item.amount), 0)), interestRate: Number(loan.interestRate), repayment: 0, centerId: null,
  }));
  config.setup.assets.forEach(asset => { for (const field of ['actualMaintenance', 'actualEnergy', 'actualSpace', 'actualOperating', 'interestAmount']) asset[field] ??= null; });
  config.setup.initialized = true;
  return config;
}
export function productiveHours(staff) {
  if (staff.annualHours !== null && staff.annualHours !== '' && staff.annualHours !== undefined) return Number(staff.annualHours);
  return round(Math.max(0, Number(staff.workDays) - Number(staff.holidays) - Number(staff.vacation) - Number(staff.sickDays) - Number(staff.trainingDays)) * Number(staff.hoursPerDay) * Number(staff.fte ?? 1) * Number(staff.productivity) / 100);
}
const dateInBerlin = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
export const activityKey = entry => entry.customWorkType ? `custom:${entry.customWorkType}` : entry.workType;
export function aggregateWorkingHours(entries, config, year, asOf = today()) {
  const range = fiscalRange(year, config.startMonth);
  const centers = config.costCenters;
  const employees = new Map(); const activities = new Map(); const months = new Map();
  const values = Object.fromEntries(centers.map(center => [center.id, 0]));
  let total = 0; let unmapped = 0;
  for (const entry of entries || []) {
    if (!entry.startedAt || !entry.endedAt || Number(entry.duration) <= 0) continue;
    const date = dateInBerlin(entry.startedAt);
    if (date < range.start || date > range.end || date > asOf) continue;
    const hours = Number(entry.duration) / 60;
    const key = activityKey(entry);
    const center = centers.find(item => (item.activityIds || []).includes(key));
    total += hours;
    if (center) values[center.id] += hours; else unmapped += hours;
    const employeeId = entry.userId || 'unassigned';
    if (!employees.has(employeeId)) employees.set(employeeId, { id: employeeId, name: [entry.user?.firstName, entry.user?.lastName].filter(Boolean).join(' ') || entry.user?.login || 'Ohne Mitarbeiter', total: 0, unmapped: 0, values: Object.fromEntries(centers.map(item => [item.id, 0])) });
    const employee = employees.get(employeeId); employee.total += hours;
    if (center) employee.values[center.id] += hours; else employee.unmapped += hours;
    if (!activities.has(key)) activities.set(key, { id: key, hours: 0, centerId: center?.id || null });
    activities.get(key).hours += hours;
    const month = date.slice(0, 7);
    if (!months.has(month)) months.set(month, { month, total: 0, values: Object.fromEntries(centers.map(item => [item.id, 0])) });
    months.get(month).total += hours; if (center) months.get(month).values[center.id] += hours;
  }
  for (const employee of employees.values()) { employee.total = round(employee.total); employee.unmapped = round(employee.unmapped); for (const id of Object.keys(employee.values)) employee.values[id] = round(employee.values[id]); }
  return { total: round(total), unmapped: round(unmapped), values: Object.fromEntries(Object.entries(values).map(([id, value]) => [id, round(value)])), employees: [...employees.values()], activities: [...activities.values()].map(item => ({ ...item, hours: round(item.hours) })), months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)) };
}
export function assetCalculation(asset, year, startMonth) {
  const start = fiscalRange(year, startMonth).start;
  const acquired = day(asset.acquiredAt);
  const base = Number(asset.useReplacement ? asset.replacementCost : asset.purchaseCost);
  const years = asset.usedYears === null || asset.usedYears === '' || asset.usedYears === undefined
    ? Math.max(0, (new Date(start) - new Date(acquired)) / (365.25 * 86400000)) : Number(asset.usedYears);
  const annual = (base - Number(asset.residualValue)) / Number(asset.usefulLifeYears);
  const remaining = Math.max(0, Number(asset.usefulLifeYears) - years);
  const fraction = acquired > start ? Math.max(0, (new Date(fiscalRange(year, startMonth).end) - new Date(acquired) + 86400000) / (365.25 * 86400000)) : 1;
  const depreciation = round(annual * Math.min(1, remaining, fraction));
  const bookValue = round(Math.max(Number(asset.residualValue), Number(asset.purchaseCost) - ((Number(asset.purchaseCost) - Number(asset.residualValue)) / Number(asset.usefulLifeYears)) * years));
  return { base, annualDepreciation: round(annual), depreciation, bookValue, boundCapital: round((base + Number(asset.residualValue)) / 2), yearsUsed: round(years) };
}
export function calculateSetup(config, { year, timeEntries = [], basis = 'plan', asOf = today() } = {}) {
  const setup = { ...defaultSetup(), ...config.setup };
  const range = fiscalRange(year, config.startMonth);
  const elapsed = Math.max(0, Math.min(1, (new Date(asOf) - new Date(range.start) + 86400000) / (new Date(range.end) - new Date(range.start) + 86400000)));
  const actualHours = aggregateWorkingHours(timeEntries, config, year, asOf);
  const planned = Object.fromEntries(config.costCenters.map(center => [center.id, 0]));
  for (const staff of setup.staff) for (const allocation of staff.allocations) if (allocation.centerId in planned) planned[allocation.centerId] += productiveHours(staff) * Number(allocation.percent) / 100;
  const useRecorded = setup.hoursMode === 'recorded' && actualHours.total > 0;
  const centers = config.costCenters.map(center => ({ ...center, hours: basis === 'actual' || useRecorded ? actualHours.values[center.id] || 0 : setup.staff.length ? round(planned[center.id]) : Number(center.hours), employees: setup.staff.length ? setup.staff.reduce((sum, staff) => sum + Number(staff.fte ?? 1) * (staff.allocations.find(item => item.centerId === center.id)?.percent || 0) / 100, 0) : Number(center.employees) }));
  centers.forEach(center => { center.laborHours = center.hours; });
  const manualHours = Object.fromEntries(centers.map(center => [center.id, setup.staff.length ? round(planned[center.id]) : Number(center.hours)]));
  const planHours = useRecorded ? { ...actualHours.values } : manualHours;
  const warnings = []; const entries = []; const missingActual = [];
  const factor = basis === 'actual' ? elapsed : 1;
  const assets = setup.assets.map(asset => ({ ...asset, ...assetCalculation(asset, year, config.startMonth) }));
  const loans = setup.loans.map(loan => ({ ...loan, annualInterest: round(Number(loan.balance) * Number(loan.interestRate) / 100) }));
  const financeInterest = round(loans.reduce((sum, loan) => sum + loan.annualInterest, 0));
  const assignedLoanIds = new Set();
  const loanInterestByAsset = {};
  if (setup.interestMode === 'financing') for (const loan of loans) {
    const linked = assets.filter(asset => asset.loanId === loan.id);
    if (linked.length) { assignedLoanIds.add(loan.id); Object.assign(loanInterestByAsset, distribute(loan.annualInterest, linked.map(asset => ({ id: asset.id, weight: asset.boundCapital })))); }
  }
  const machines = [];
  for (const asset of assets) {
    const costFactor = day(asset.acquiredAt) > range.end ? 0 : 1;
    const interest = round((setup.interestMode === 'imputed' ? (asset.interestAmount === null || asset.interestAmount === '' || asset.interestAmount === undefined ? asset.boundCapital * Number(asset.interestRate) / 100 : Number(asset.interestAmount)) : loanInterestByAsset[asset.id] || 0) * costFactor);
    const costs = { depreciation: asset.depreciation, interest, maintenance: Number(asset.maintenance) * costFactor, energy: Number(asset.energy) * costFactor, space: Number(asset.space) * costFactor, operating: Number(asset.operating) * costFactor };
    const annualDays = (new Date(range.end) - new Date(range.start)) / 86400000 + 1;
    const acquisition = day(asset.acquiredAt);
    const activeDays = Math.max(0, (new Date(asOf < range.end ? asOf : range.end) - new Date(acquisition > range.start ? acquisition : range.start)) / 86400000 + 1);
    const currentDepreciation = Math.min(asset.depreciation, asset.annualDepreciation * activeDays / annualDays);
    for (const [key, amount] of Object.entries(costs)) {
      let value = amount;
      if (basis === 'actual') {
        if (key === 'depreciation') value = currentDepreciation;
        else if (key === 'interest') value = amount * Math.min(1, activeDays / annualDays);
        else {
          const field = `actual${key[0].toUpperCase()}${key.slice(1)}`;
          if (asset[field] === null || asset[field] === '' || asset[field] === undefined) { if (amount) missingActual.push(`${asset.name} · ${key}`); value = 0; }
          else value = Number(asset[field]);
        }
      }
      if (value) entries.push({ id: `asset-${asset.id}-${key}`, name: `${asset.name} · ${key}`, amount: round(value), costTypeId: key === 'operating' ? 'machines' : key, centerId: asset.centerId, keyId: key === 'space' ? 'area' : 'hours' });
    }
    if (['machine', 'cnc'].includes(asset.category)) {
      const hours = Number(asset.hours) || ((asset.activityIds || []).length ? (useRecorded || basis === 'actual' ? actualHours.activities.filter(item => asset.activityIds.includes(item.id)).reduce((sum, item) => sum + item.hours, 0) : centers.filter(center => center.activityIds?.some(id => asset.activityIds.includes(id))).reduce((sum, center) => sum + center.hours, 0)) : centers.find(center => center.id === asset.centerId)?.hours || 0);
      const total = round(Object.values(costs).reduce((sum, amount) => sum + amount, 0));
      machines.push({ ...asset, costs, total, hours: round(hours), rate: hours > 0 ? round(total / hours) : null });
      if (total > 0 && hours <= 0) warnings.push(`${asset.name}: Verrechenbare Maschinenlaufzeit fehlt.`);
    }
  }
  if (setup.interestMode === 'financing') for (const loan of loans.filter(item => !assignedLoanIds.has(item.id))) if (loan.annualInterest) entries.push({ id: `loan-${loan.id}`, name: loan.name, amount: round(loan.annualInterest * factor), costTypeId: 'interest', centerId: loan.centerId, keyId: 'hours' });
  const staffCost = setup.staff.reduce((sum, staff) => sum + Number(staff.annualCost || 0), 0);
  for (const cost of setup.annualCosts) {
    // Ein kumulierter Ist-Wert ersetzt hier den Planwert vollständig.
    if (basis === 'actual' && (cost.actualAmount === null || cost.actualAmount === '' || cost.actualAmount === undefined)) { missingActual.push(cost.name); continue; }
    const amount = basis === 'actual' ? Number(cost.actualAmount) : cost.source === 'staff' ? staffCost : Number(cost.amount);
    if (basis === 'plan' && cost.source === 'staff' && !cost.centerId) {
      for (const staff of setup.staff) {
        const allocations = distribute(Number(staff.annualCost), staff.allocations.map(item => ({ id: item.centerId, weight: item.percent })));
        if (!Object.keys(allocations).length && Number(staff.annualCost)) entries.push({ ...cost, amount: Number(staff.annualCost) });
        for (const [centerId, allocated] of Object.entries(allocations)) if (allocated) entries.push({ ...cost, id: `${cost.id}-${staff.id}-${centerId}`, amount: allocated, centerId });
      }
      continue;
    }
    if (cost.costTypeId === 'interest' && amount) { warnings.push(`${cost.name}: Zinsen werden bereits über die gewählte Zinsmethode berechnet. Den zusätzlichen Zinsansatz entfernen.`); }
    if (amount) entries.push({ ...cost, amount, costTypeId: cost.costTypeId });
  }
  // Eine reine Maschinenkostenstelle verrechnet Laufzeit, Personal wird weiterhin
  // nach den tatsächlich erfassten bzw. geplanten Arbeitsstunden verteilt.
  for (const center of centers.filter(item => item.kind === 'machine')) {
    const assigned = machines.filter(machine => machine.centerId === center.id);
    if (assigned.length && assigned.some(machine => machine.hours > 0)) center.hours = round(assigned.reduce((sum, machine) => sum + machine.hours, 0));
  }
  const rows = config.costTypes.map(type => ({ ...type, total: 0, unallocated: 0, values: Object.fromEntries(centers.map(center => [center.id, 0])) }));
  const weights = (keyId, candidates) => {
    const key = config.distributionKeys.find(item => item.id === keyId);
    return candidates.map(center => ({ id: center.id, weight: keyId === 'consumption' || keyId === 'usage' ? Number(center[keyId]) : key?.metric === 'custom' ? Number(key.weights[center.id] || 0) : key?.metric === 'equal' ? 1 : key?.metric === 'hours' ? Number(center.laborHours) : Number(center[key?.metric] || 0) }));
  };
  let unknown = 0;
  for (const entry of entries) {
    const row = rows.find(item => item.id === entry.costTypeId);
    if (!row) { unknown += entry.amount; continue; }
    row.total = round(row.total + entry.amount);
    const allocation = centers.some(center => center.id === entry.centerId) ? { [entry.centerId]: entry.amount } : distribute(entry.amount, weights(entry.keyId || row.key, centers));
    if (!Object.keys(allocation).length) row.unallocated = round(row.unallocated + entry.amount);
    for (const [id, amount] of Object.entries(allocation)) row.values[id] = round(row.values[id] + amount);
  }
  const beforeTransfers = Object.fromEntries(centers.map(center => [center.id, round(rows.reduce((sum, row) => sum + row.values[center.id], 0))]));
  const transfers = Object.fromEntries(centers.map(center => [center.id, 0]));
  for (const center of centers.filter(item => item.kind === 'support')) for (const row of rows) {
    const amount = row.values[center.id];
    const allocation = distribute(amount, weights(center.redistributionKey, centers.filter(item => item.kind !== 'support')));
    if (amount && !Object.keys(allocation).length) { warnings.push(`${center.name}: Umlageschlüssel kann ${amount} € nicht verteilen.`); continue; }
    row.values[center.id] = 0;
    transfers[center.id] = round(transfers[center.id] - amount);
    for (const [id, value] of Object.entries(allocation)) { row.values[id] = round(row.values[id] + value); transfers[id] = round(transfers[id] + value); }
  }
  const unallocated = round(unknown + rows.reduce((sum, row) => sum + row.unallocated, 0));
  if (unallocated) warnings.push(`${unallocated} € sind noch nicht auf Kostenstellen verteilt.`);
  const rates = centers.map(center => {
    const total = round(rows.reduce((sum, row) => sum + row.values[center.id], 0));
    const hourlyCosts = round(rows.filter(row => row.hourly).reduce((sum, row) => sum + row.values[center.id], 0));
    const overhead = round(rows.filter(row => row.treatment === 'overhead').reduce((sum, row) => sum + row.values[center.id], 0));
    const fullRate = center.hours > 0 ? round(hourlyCosts / center.hours) : null;
    if (center.kind !== 'support' && hourlyCosts > 0 && fullRate === null) warnings.push(`${center.name}: Produktive Stunden fehlen.`);
    return { ...center, total, hourlyCosts, overhead, fullRate, sellingRate: fullRate === null ? null : round(fullRate * (1 + Number(config.profitPercent) / 100)), surcharge: Number(center.directBase) > 0 ? round(overhead / Number(center.directBase) * 100) : null };
  });
  const totalCosts = round(entries.reduce((sum, entry) => sum + entry.amount, 0));
  const fixedAssets = round(assets.filter(asset => day(asset.acquiredAt) <= range.start).reduce((sum, asset) => sum + asset.bookValue, 0));
  const boundCapital = round(assets.reduce((sum, asset) => sum + asset.boundCapital, 0));
  const totalAssets = round(fixedAssets + Number(setup.materialStock) + Number(config.openingCash) + Number(config.openingOtherAssets));
  const liabilities = round(loans.reduce((sum, loan) => sum + Number(loan.balance), 0) + Number(config.openingOtherLiabilities));
  return { range, basis, elapsed, actualHours, manualHours, planHours, useRecorded, rows, rates, machines, assets, loans, totalCosts, unallocated, warnings: [...new Set(warnings)], missingActual, beforeTransfers, transfers, financeInterest, boundCapital, depreciation: rows.find(row => row.id === 'depreciation')?.total || 0, balance: { fixedAssets, materialStock: Number(setup.materialStock), cash: Number(config.openingCash), otherAssets: Number(config.openingOtherAssets), totalAssets, liabilities, equity: round(totalAssets - liabilities) } };
}
export function setupChecks(config, calculation) {
  const easy = config.mode === 'easy';
  const errors = [];
  if (!config.setup.companyName.trim()) errors.push('Betriebsname fehlt.');
  if (easy) {
    if (!config.easyRates.some(rate => Number(rate.rate) > 0)) errors.push('Mindestens einen Easy-Stundensatz eingeben.');
  } else {
    if (!config.costCenters.some(center => center.kind !== 'support')) errors.push('Mindestens eine Hauptkostenstelle anlegen.');
    if (calculation.totalCosts <= 0) errors.push('Jährliche Kosten oder Anlagenkosten erfassen.');
    errors.push(...calculation.warnings);
    for (const staff of config.setup.staff) if (Math.abs(staff.allocations.reduce((sum, item) => sum + Number(item.percent), 0) - 100) > 0.01) errors.push(`${staff.name}: Tätigkeitsverteilung muss 100 % ergeben.`);
    const assigned = new Set();
    for (const center of config.costCenters) for (const id of center.activityIds || []) { if (assigned.has(id)) errors.push(`Tätigkeit ${id} ist mehreren Kostenstellen zugeordnet.`); assigned.add(id); }
  }
  if (config.setup.annualCosts.filter(cost => cost.source === 'staff').length > 1) errors.push('Personalkosten aus Mitarbeiterdaten dürfen nur einmal übernommen werden.');
  return [...new Set(errors)];
}
export function approvedConfig(config) { return config.setup?.approvals?.at(-1)?.config || null; }
