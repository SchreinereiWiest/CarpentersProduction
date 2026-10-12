import { defaultConfig, defaultSetup, round } from '../../../shared/management.mjs';

export function invalid(message, status = 400) { throw Object.assign(new Error(message), { status }); }
export function number(value, label, min = 0, max = 999999999999.99) {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) invalid(`${label}: gültigen Wert zwischen ${min} und ${max} eingeben.`);
  return round(value);
}
export function textValue(value, label, required = false, max = 2000) {
  if (value === null || value === undefined || value === '') {
    if (required) invalid(`${label} fehlt.`);
    return null;
  }
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) invalid(`${label} ist ungültig.`);
  return value.trim() || null;
}
export function dateValue(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) invalid(`${label}: gültiges Datum eingeben.`);
  return new Date(`${value}T00:00:00Z`);
}
export function uuid(value) {
  if (!value) return null;
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) invalid('Ungültige Verknüpfung.');
  return value;
}
export function yearValue(value) { const year = number(value, 'Geschäftsjahr', 2000, 2200); if (!Number.isInteger(year)) invalid('Geschäftsjahr muss ganzzahlig sein.'); return year; }
export function versionValue(value) { const version = number(value, 'Version', 0, 2147483646); if (!Number.isInteger(version)) invalid('Ungültige Version.'); return version; }
export function reference(value, entries, label) {
  if (!value) return null;
  if (!entries.some(entry => entry.id === value)) invalid(`${label} wurde nicht gefunden.`);
  return value;
}

export function validateConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('Einstellungen fehlen.');
  const config = structuredClone(input);
  config.setup = { ...defaultSetup(), ...config.setup };
  const lists = ['costTypes', 'costCenters', 'distributionKeys', 'rules', 'easyRates'];
  for (const name of lists) {
    if (!Array.isArray(config[name]) || config[name].length > 200) invalid(`Ungültige Liste: ${name}.`);
    const ids = new Set();
    for (const item of config[name]) {
      if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id) || ids.has(item.id)) invalid(`Ungültige oder doppelte ID: ${name}.`);
      ids.add(item.id);
      if (name !== 'rules') item.name = textValue(item.name, 'Bezeichnung', true, 160);
    }
  }
  if (!['easy', 'full'].includes(config.mode)) invalid('Ungültiger Modus.');
  config.startMonth = number(config.startMonth, 'Geschäftsjahresbeginn', 1, 12);
  if (!Number.isInteger(config.startMonth)) invalid('Ungültiger Geschäftsmonat.');
  for (const field of ['openingCash', 'openingOtherAssets', 'openingOtherLiabilities']) config[field] = number(config[field], field, field === 'openingCash' ? -999999999999 : 0);
  config.profitPercent = number(config.profitPercent, 'Gewinnaufschlag', 0, 1000);
  for (const center of config.costCenters) {
    if (!['production', 'machine', 'support'].includes(center.kind)) invalid('Ungültiger Kostenstellentyp.');
    for (const field of ['hours', 'area', 'employees', 'directBase']) center[field] = number(center[field], field);
    center.redistributionKey = reference(center.redistributionKey, config.distributionKeys, 'Umlageschlüssel');
    if (center.activityIds !== undefined && (!Array.isArray(center.activityIds) || center.activityIds.length > 200 || center.activityIds.some(id => typeof id !== 'string' || !id || id.length > 200) || new Set(center.activityIds).size !== center.activityIds.length)) invalid('Ungültige Tätigkeitszuordnung.');
    if (center.consumption !== undefined) center.consumption = number(center.consumption, 'Energieverbrauch');
    if (center.usage !== undefined) center.usage = number(center.usage, 'Fahrzeugnutzung');
  }
  for (const key of config.distributionKeys) {
    if (!['hours', 'area', 'employees', 'equal', 'custom'].includes(key.metric)) invalid('Ungültiger Verteilungsschlüssel.');
    if (!key.weights || typeof key.weights !== 'object' || Array.isArray(key.weights)) invalid('Verteilungsgewichte fehlen.');
    for (const [id, weight] of Object.entries(key.weights)) {
      reference(id, config.costCenters, 'Kostenstelle des Schlüssels');
      key.weights[id] = number(weight, 'Verteilungsgewicht');
    }
  }
  for (const type of config.costTypes) {
    if (!['direct', 'overhead'].includes(type.treatment) || typeof type.hourly !== 'boolean') invalid('Ungültige Kostenart.');
    type.key = reference(type.key, config.distributionKeys, 'Verteilungsschlüssel');
  }
  if (!config.costTypes.some(type => type.id === 'depreciation')) invalid('Die Kostenart Abschreibungen wird für Anlagegüter benötigt.');
  for (const rate of config.easyRates) rate.rate = number(rate.rate, 'Stundensatz');
  for (const rule of config.rules) {
    rule.match = textValue(rule.match, 'Suchtext', true, 160);
    rule.costTypeId = reference(rule.costTypeId, config.costTypes, 'Kostenart');
    rule.centerId = reference(rule.centerId, config.costCenters, 'Kostenstelle');
    if (!rule.costTypeId && !rule.centerId) invalid('Eine Regel benötigt eine Kostenart oder Kostenstelle.');
  }
  if (!config.babAdjustments || typeof config.babAdjustments !== 'object') invalid('BAB-Ergänzungen fehlen.');
  for (const basis of ['actual', 'plan']) {
    const adjustments = config.babAdjustments[basis];
    if (!adjustments || typeof adjustments !== 'object' || Array.isArray(adjustments)) invalid('Ungültige BAB-Ergänzungen.');
    for (const [typeId, centers] of Object.entries(adjustments)) {
      reference(typeId, config.costTypes, 'Kostenart');
      if (!centers || typeof centers !== 'object' || Array.isArray(centers)) invalid('Ungültige BAB-Zellen.');
      for (const [centerId, value] of Object.entries(centers)) {
        reference(centerId, config.costCenters, 'Kostenstelle');
        centers[centerId] = number(value, 'BAB-Ergänzung', -999999999999);
      }
    }
  }
  config.setup = validateSetup(config.setup, config);
  // Nur bekannte Konfigurationsfelder persistieren.
  return Object.fromEntries(Object.keys(defaultConfig()).map(key => [key, config[key]]));
}

function validateSetup(input, config) {
  const setup = { ...defaultSetup(), ...input };
  setup.companyName = textValue(setup.companyName, 'Betriebsname', false, 200) || '';
  if (typeof setup.initialized !== 'boolean') invalid('Ungültiger Einrichtungsstatus.');
  if (!['manual', 'recorded'].includes(setup.hoursMode) || !['imputed', 'financing', 'none'].includes(setup.interestMode)) invalid('Ungültige Berechnungsgrundlage.');
  setup.materialStock = number(setup.materialStock, 'Materialbestand');
  for (const list of ['assets', 'loans', 'annualCosts', 'staff']) {
    if (!Array.isArray(setup[list]) || setup[list].length > 500) invalid(`Ungültige Einrichtungsliste: ${list}.`);
    const ids = new Set();
    for (const item of setup[list]) {
      if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id) || ids.has(item.id)) invalid(`Ungültige oder doppelte ID: ${list}.`);
      ids.add(item.id); item.name = textValue(item.name, 'Bezeichnung', true, 200);
      if (list !== 'staff') item.centerId = reference(item.centerId, config.costCenters, 'Kostenstelle');
    }
  }
  for (const asset of setup.assets) {
    if (!['machine', 'cnc', 'vehicle', 'building', 'equipment'].includes(asset.category) || typeof asset.useReplacement !== 'boolean') invalid('Ungültiger Anlagentyp.');
    asset.acquiredAt = dateValue(asset.acquiredAt, 'Anschaffungsdatum').toISOString().slice(0, 10);
    for (const field of ['purchaseCost', 'replacementCost', 'maintenance', 'energy', 'space', 'operating', 'hours']) asset[field] = number(asset[field], field);
    for (const field of ['actualMaintenance', 'actualEnergy', 'actualSpace', 'actualOperating', 'interestAmount']) asset[field] = asset[field] === null || asset[field] === '' || asset[field] === undefined ? null : number(asset[field], field);
    asset.usefulLifeYears = number(asset.usefulLifeYears, 'Nutzungsdauer', 0.01, 100);
    const base = asset.useReplacement ? asset.replacementCost : asset.purchaseCost;
    if (base <= 0) invalid('Abschreibungsbasis muss größer als null sein.');
    asset.residualValue = number(asset.residualValue, 'Restwert', 0, Math.min(base, asset.purchaseCost));
    asset.usedYears = asset.usedYears === null || asset.usedYears === '' ? null : number(asset.usedYears, 'Vergangene Nutzungsjahre', 0, 200);
    asset.interestRate = number(asset.interestRate, 'Kalkulatorischer Zinssatz', 0, 100);
    asset.loanId = reference(asset.loanId, setup.loans, 'Darlehen');
    if (!Array.isArray(asset.activityIds) || asset.activityIds.length > 200 || asset.activityIds.some(id => typeof id !== 'string' || !id || id.length > 200)) invalid('Ungültige Maschinen-Tätigkeiten.');
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
    if (!['manual', 'staff'].includes(cost.source)) invalid('Ungültige Kostenquelle.');
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
    if (!Array.isArray(staff.allocations) || staff.allocations.length > 200) invalid('Ungültige Personalstundenverteilung.');
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

export function validateTransaction(input, config) {
  if (!['income', 'expense', 'cash_in', 'cash_out'].includes(input.kind)) invalid('Ungültiger Geschäftsvorfall.');
  if (!['actual', 'plan'].includes(input.basis)) invalid('Ungültige Datenbasis.');
  if (input.source && !['manual', 'invoice', 'payroll', 'rent', 'insurance', 'bank', 'imputed'].includes(input.source)) invalid('Ungültige Herkunft.');
  if (input.sourceKey && /^(loan|repayment):/.test(input.sourceKey)) invalid('Diese Quellkennung ist für Darlehensbewegungen reserviert.');
  const data = {
    kind: input.kind, basis: input.basis, source: textValue(input.source || 'manual', 'Herkunft', true, 100),
    sourceKey: textValue(input.sourceKey, 'Quellkennung', false, 250),
    title: textValue(input.title, 'Bezeichnung', true, 200), counterparty: textValue(input.counterparty, 'Geschäftspartner', false, 200),
    date: dateValue(input.date, 'Leistungsdatum'), dueDate: input.dueDate ? dateValue(input.dueDate, 'Fälligkeit') : null,
    amount: number(input.amount, 'Nettobetrag', 0.01), vatRate: number(input.vatRate ?? 0, 'Umsatzsteueranteil', 0, 100),
    costTypeId: reference(input.costTypeId, config.costTypes, 'Kostenart'), centerId: reference(input.centerId, config.costCenters, 'Kostenstelle'),
    projectId: uuid(input.projectId), fileId: uuid(input.fileId), note: textValue(input.note, 'Notiz'),
  };
  if (data.kind !== 'expense') { data.costTypeId = null; data.centerId = null; }
  if (data.kind.startsWith('cash_')) data.vatRate = 0;
  if (data.source === 'imputed') {
    if (data.kind !== 'expense') invalid('Kalkulatorische Werte werden als interne Kosten erfasst.');
    data.vatRate = 0; data.dueDate = null;
  }
  if (data.kind === 'expense') {
    const haystack = `${data.title} ${data.counterparty || ''}`.toLocaleLowerCase('de');
    const rule = config.rules.find(item => haystack.includes(item.match.toLocaleLowerCase('de')));
    if (rule) { data.costTypeId ||= rule.costTypeId; data.centerId ||= rule.centerId; }
  }
  return data;
}
