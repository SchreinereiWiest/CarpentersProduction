// Gemeinsames Rechenmodell für die API und interaktive Vorschauen.
export const round = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
export const day = value => value instanceof Date ? value.toISOString().slice(0, 10) : value ? String(value).slice(0, 10) : '';
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const grossAmount = entry => round(Number(entry.amount) * (1 + Number(entry.vatRate || 0) / 100));

export function defaultSetup() {
  return {
    companyName: '', initialized: false, hoursMode: 'manual', interestMode: 'imputed', materialStock: 0,
    assets: [], loans: [], annualCosts: [], staff: [], approvals: [],
  };
}

export function defaultConfig() {
  return {
    mode: 'easy', startMonth: 1, openingCash: 0, openingOtherAssets: 0, openingOtherLiabilities: 0,
    profitPercent: 10, easyRates: [], costCenters: [], rules: [], babAdjustments: { actual: {}, plan: {} }, setup: defaultSetup(),
    costTypes: [
      ['material', 'Material', 'direct', false, 'hours'],
      ['personnel', 'Personal', 'overhead', true, 'employees'],
      ['space', 'Raumkosten', 'overhead', true, 'area'],
      ['energy', 'Energie', 'overhead', true, 'hours'],
      ['vehicles', 'Fahrzeuge', 'overhead', true, 'hours'],
      ['machines', 'Maschinen', 'overhead', true, 'hours'],
      ['administration', 'Verwaltung', 'overhead', true, 'hours'],
      ['insurance', 'Versicherungen und Beiträge', 'overhead', true, 'hours'],
      ['maintenance', 'Wartung und Reparaturen', 'overhead', true, 'hours'],
      ['other', 'Sonstige Gemeinkosten', 'overhead', true, 'hours'],
      ['depreciation', 'Abschreibungen', 'overhead', true, 'hours'],
      ['imputed', 'Kalkulatorische Kosten', 'overhead', true, 'hours'],
      ['interest', 'Finanzierungskosten', 'overhead', true, 'hours'],
    ].map(([id, name, treatment, hourly, key]) => ({ id, name, treatment, hourly, key })),
    distributionKeys: [
      { id: 'hours', name: 'Produktive Stunden', metric: 'hours', weights: {} },
      { id: 'area', name: 'Fläche (m²)', metric: 'area', weights: {} },
      { id: 'employees', name: 'Mitarbeitende (Vollzeitäquivalente)', metric: 'employees', weights: {} },
      { id: 'equal', name: 'Gleichmäßig', metric: 'equal', weights: {} },
    ],
  };
}

export function fiscalRange(year, startMonth = 1) {
  const start = `${year}-${String(startMonth).padStart(2, '0')}-01`;
  const end = new Date(Date.UTC(Number(year) + 1, Number(startMonth) - 1, 0)).toISOString().slice(0, 10);
  return { start, end };
}

// Ganzzahlige Cent-Verteilung; der größte Rest erhält den verbleibenden Cent.
export function distribute(amount, weights) {
  const usable = weights.filter(item => Number(item.weight) > 0);
  const sum = usable.reduce((total, item) => total + Number(item.weight), 0);
  if (!sum) return {};
  const cents = Math.round(Math.abs(amount) * 100);
  const sign = Math.sign(amount);
  const shares = usable.map(item => {
    const exact = cents * Number(item.weight) / sum;
    return { id: item.id, cents: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remainder = cents - shares.reduce((total, item) => total + item.cents, 0);
  for (const item of [...shares].sort((a, b) => b.remainder - a.remainder)) {
    if (remainder-- > 0) item.cents++;
  }
  return Object.fromEntries(shares.map(item => [item.id, sign * item.cents / 100]));
}

function assetValue(asset, at) {
  if (day(asset.acquiredAt) > at) return 0;
  const startMonth = Number(day(asset.acquiredAt).slice(0, 4)) * 12 + Number(day(asset.acquiredAt).slice(5, 7));
  const atMonth = Number(at.slice(0, 4)) * 12 + Number(at.slice(5, 7));
  const elapsed = Math.max(0, atMonth - startMonth + 1);
  const monthly = (Number(asset.purchaseCost) - Number(asset.residualValue)) / (Number(asset.usefulLifeYears) * 12);
  return round(Math.max(Number(asset.residualValue), Number(asset.purchaseCost) - monthly * elapsed));
}

export function calculateManagement(state, { year, basis = 'actual', asOf = today() } = {}) {
  const config = state.config || defaultConfig();
  const range = fiscalRange(year, config.startMonth);
  const cutoff = asOf < range.end ? asOf : range.end;
  const inPeriod = date => day(date) >= range.start && day(date) <= range.end;
  const transactions = (state.transactions || []).filter(item => inPeriod(item.date) && item.basis === basis);
  const economic = transactions.filter(item => ['income', 'expense'].includes(item.kind) && (basis === 'plan' || day(item.date) <= cutoff));
  const income = round(economic.filter(item => item.kind === 'income').reduce((sum, item) => sum + Number(item.amount), 0));
  const expense = round(economic.filter(item => item.kind === 'expense').reduce((sum, item) => sum + Number(item.amount), 0));
  let cash = Number(config.openingCash);
  const openItems = [];
  for (const item of state.transactions || []) {
    if (item.basis !== 'actual' || item.source === 'imputed') continue;
    const payments = item.payments || [];
    const sign = ['income', 'cash_in'].includes(item.kind) ? 1 : -1;
    cash += sign * payments.filter(payment => inPeriod(payment.date) && day(payment.date) <= cutoff).reduce((sum, payment) => sum + Number(payment.amount), 0);
    if (['income', 'expense'].includes(item.kind) && day(item.date) <= cutoff) {
      const paid = round(payments.filter(payment => day(payment.date) <= cutoff).reduce((sum, payment) => sum + Number(payment.amount), 0));
      const open = round(grossAmount(item) - paid);
      if (open > 0) openItems.push({ ...item, paid, open, overdue: Boolean(item.dueDate && day(item.dueDate) < cutoff) });
    }
  }
  const receivables = round(openItems.filter(item => item.kind === 'income').reduce((sum, item) => sum + item.open, 0));
  const payables = round(openItems.filter(item => item.kind === 'expense').reduce((sum, item) => sum + item.open, 0));
  const costEntries = economic.filter(item => item.kind === 'expense').map(item => ({ ...item, amount: Number(item.amount), source: 'transaction' }));
  const assets = (state.assets || []).map(asset => {
    const beforeStart = new Date(`${range.start}T00:00:00Z`);
    beforeStart.setUTCDate(beforeStart.getUTCDate() - 1);
    const startValue = assetValue(asset, beforeStart.toISOString().slice(0, 10));
    const depreciationEnd = basis === 'plan' ? range.end : cutoff;
    const additions = inPeriod(asset.acquiredAt) && day(asset.acquiredAt) <= depreciationEnd ? Number(asset.purchaseCost) : 0;
    const depreciation = depreciationEnd < range.start ? 0 : round(Math.max(0, startValue + additions - assetValue(asset, depreciationEnd)));
    // Plan und Ist sind eigenständige Szenarien. Anlagen laufen in beiden mit.
    if (depreciation > 0) costEntries.push({ id: asset.id, amount: depreciation, costTypeId: 'depreciation', centerId: asset.centerId, source: 'asset' });
    return { ...asset, bookValue: assetValue(asset, cutoff), depreciation };
  });
  const centers = config.costCenters;
  const costTypes = config.costTypes;
  const warnings = [];
  const rows = costTypes.map(type => ({ ...type, total: 0, unallocated: 0, values: Object.fromEntries(centers.map(center => [center.id, 0])) }));
  let unknownCosts = 0;
  const keyWeights = (keyId, candidates) => {
    const key = config.distributionKeys.find(item => item.id === keyId);
    return candidates.map(center => ({ id: center.id, weight: !key ? 0 : key.metric === 'custom' ? Number(key.weights[center.id] || 0) : key.metric === 'equal' ? 1 : Number(center[key.metric] || 0) }));
  };
  for (const [typeId, values] of Object.entries(config.babAdjustments[basis] || {})) {
    for (const [centerId, amount] of Object.entries(values)) {
      if (Number(amount)) costEntries.push({ id: `manual-${typeId}-${centerId}`, amount: Number(amount), costTypeId: typeId, centerId, source: 'manual' });
    }
  }
  for (const entry of costEntries) {
    const row = rows.find(item => item.id === entry.costTypeId);
    if (!row) { unknownCosts += entry.amount; continue; }
    row.total = round(row.total + entry.amount);
    if (centers.some(center => center.id === entry.centerId)) {
      row.values[entry.centerId] = round(row.values[entry.centerId] + entry.amount);
    } else if (row.treatment === 'direct') {
      row.unallocated = round(row.unallocated + entry.amount);
    } else {
      const allocation = distribute(entry.amount, keyWeights(row.key, centers));
      if (!Object.keys(allocation).length) row.unallocated = round(row.unallocated + entry.amount);
      for (const [id, value] of Object.entries(allocation)) row.values[id] = round(row.values[id] + value);
    }
  }
  // Hilfskostenstellen werden einstufig auf Hauptkostenstellen umgelegt.
  const primaryCenters = centers.filter(center => center.kind !== 'support');
  const transfers = Object.fromEntries(centers.map(center => [center.id, 0]));
  const beforeTransfers = Object.fromEntries(centers.map(center => [center.id, round(rows.reduce((sum, row) => sum + row.values[center.id], 0))]));
  for (const center of centers.filter(item => item.kind === 'support')) {
    let unresolved = 0;
    for (const row of rows) {
      const amount = row.values[center.id];
      const allocation = distribute(amount, keyWeights(center.redistributionKey, primaryCenters));
      if (!Object.keys(allocation).length) { unresolved += amount; continue; }
      row.values[center.id] = 0;
      transfers[center.id] = round(transfers[center.id] - amount);
      for (const [id, value] of Object.entries(allocation)) {
        row.values[id] = round(row.values[id] + value);
        transfers[id] = round(transfers[id] + value);
      }
    }
    if (unresolved) warnings.push(`${center.name}: ${round(unresolved)} € können ohne gültigen Umlageschlüssel nicht weiterverteilt werden.`);
  }
  const unallocated = round(unknownCosts + rows.reduce((sum, row) => sum + row.unallocated, 0));
  if (unallocated) warnings.push(`${unallocated} € sind keiner Kostenstelle zugeordnet. Kostenart, direkte Zuordnung oder Verteilungsschlüssel ergänzen.`);
  const rates = centers.map(center => {
    const total = round(rows.reduce((sum, row) => sum + row.values[center.id], 0));
    const overhead = round(rows.filter(row => row.treatment === 'overhead').reduce((sum, row) => sum + row.values[center.id], 0));
    const hourlyCosts = round(rows.filter(row => row.hourly).reduce((sum, row) => sum + row.values[center.id], 0));
    const hours = Number(center.hours);
    if (center.kind !== 'support' && hourlyCosts > 0 && hours <= 0) warnings.push(`${center.name}: Produktive Jahresstunden fehlen; es kann kein Stundensatz ermittelt werden.`);
    const fullRate = hours > 0 ? round(hourlyCosts / hours) : null;
    return { ...center, total, overhead, hourlyCosts, fullRate, sellingRate: fullRate === null ? null : round(fullRate * (1 + Number(config.profitPercent) / 100)), overheadRate: hours > 0 ? round(overhead / hours) : null, surcharge: Number(center.directBase) > 0 ? round(overhead / Number(center.directBase) * 100) : null };
  });
  const depreciation = round(assets.reduce((sum, asset) => sum + asset.depreciation, 0));
  const manualCosts = round(costEntries.filter(entry => entry.source === 'manual').reduce((sum, entry) => sum + entry.amount, 0));
  const totalCosts = round(expense + depreciation + manualCosts);
  const loanBalance = round((state.loans || []).filter(loan => day(loan.startDate) <= cutoff).reduce((sum, loan) => sum + Number(loan.principal) - (loan.repayments || []).filter(payment => day(payment.date) <= cutoff).reduce((paid, payment) => paid + Number(payment.amount), 0), 0));
  const fixedAssets = round(assets.reduce((sum, asset) => sum + asset.bookValue, 0));
  const totalAssets = round(cash + receivables + fixedAssets + Number(config.openingOtherAssets));
  const liabilities = round(payables + loanBalance + Number(config.openingOtherLiabilities));
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(Number(year), Number(config.startMonth) - 1 + index, 1));
    const prefix = date.toISOString().slice(0, 7);
    const entries = economic.filter(item => day(item.date).startsWith(prefix));
    return { month: prefix, income: round(entries.filter(item => item.kind === 'income').reduce((sum, item) => sum + Number(item.amount), 0)), expense: round(entries.filter(item => item.kind === 'expense').reduce((sum, item) => sum + Number(item.amount), 0)) };
  });
  return { range, cutoff, income, expense, depreciation, manualCosts, totalCosts, result: round(income - totalCosts), cash: round(cash), receivables, payables, openItems, assets, loanBalance, balance: { fixedAssets, otherAssets: Number(config.openingOtherAssets), otherLiabilities: Number(config.openingOtherLiabilities), totalAssets, liabilities, equity: round(totalAssets - liabilities) }, rows, rates, transfers, beforeTransfers, unallocated, warnings, months, transactionCount: transactions.length };
}
