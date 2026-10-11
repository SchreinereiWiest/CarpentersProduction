import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateManagement, day, defaultConfig, distribute, fiscalRange } from '../../shared/management.mjs';
import { dateValue, validateConfig, validateTransaction } from '../src/services/managementValidation.js';

const center = (id, values = {}) => ({ id, name: id, kind: 'production', hours: 1000, area: 100, employees: 1, directBase: 1000, redistributionKey: 'hours', ...values });
const entry = (id, values = {}) => ({ id, kind: 'expense', basis: 'actual', amount: 100, vatRate: 19, date: '2026-03-01', costTypeId: 'space', centerId: null, payments: [], ...values });
const state = (values = {}) => ({ config: defaultConfig(), transactions: [], assets: [], loans: [], ...values });
const calc = (data, basis = 'actual', asOf = '2026-12-31') => calculateManagement(data, { year: 2026, basis, asOf });

test('Perioden unterstützen abweichende Geschäftsjahre und echte Prisma-Datumswerte', () => {
  assert.deepEqual(fiscalRange(2026, 4), { start: '2026-04-01', end: '2027-03-31' });
  assert.equal(day(new Date('2026-03-01T00:00:00Z')), '2026-03-01');
  const config = defaultConfig(); config.startMonth = 4;
  const data = state({ config, transactions: [entry('before', { date: '2026-03-31' }), entry('start', { date: new Date('2026-04-01') }), entry('end', { date: '2027-03-31' }), entry('after', { date: '2027-04-01' })] });
  assert.equal(calc(data, 'actual', '2027-04-01').expense, 200);
});

test('Zahlungen ändern Liquidität und offene Posten ohne doppelte Kosten', () => {
  const config = defaultConfig(); config.openingCash = 1000;
  const data = state({ config, transactions: [entry('invoice', { payments: [{ amount: 50, date: '2026-03-03' }, { amount: 69, date: '2026-04-01' }] })] });
  const partial = calc(data, 'actual', '2026-03-10');
  assert.equal(partial.expense, 100); assert.equal(partial.cash, 950); assert.equal(partial.payables, 69);
  const complete = calc(data); assert.equal(complete.expense, 100); assert.equal(complete.cash, 881); assert.equal(complete.payables, 0);
});

test('Offene Vorjahresrechnungen bleiben offen, ohne den aktuellen Ertrag zu erhöhen', () => {
  const data = state({ transactions: [entry('old', { date: '2025-12-01', kind: 'income', dueDate: '2025-12-31', payments: [{ amount: 50, date: '2025-12-02' }, { amount: 20, date: '2026-01-02' }] })] });
  const result = calc(data); assert.equal(result.income, 0); assert.equal(result.cash, 20); assert.equal(result.receivables, 49); assert.equal(result.openItems[0].overdue, true);
});

test('Ist und Plan bleiben getrennte Szenarien; Finanzbestände zeigen immer Ist', () => {
  const data = state({ transactions: [entry('actual', { amount: 100, payments: [{ amount: 119, date: '2026-03-01' }] }), entry('plan', { amount: 200, basis: 'plan' })] });
  assert.equal(calc(data).expense, 100); assert.equal(calc(data, 'plan').expense, 200); assert.equal(calc(data, 'plan').cash, -119);
  assert.equal(calc(data, 'plan').payables, 0);
});

test('Zukünftige tatsächliche Leistungen und Zahlungen werden vor ihrem Datum nicht gerechnet', () => {
  const data = state({ transactions: [entry('future', { date: '2026-12-01', payments: [{ amount: 119, date: '2026-12-10' }] })] });
  const result = calc(data, 'actual', '2026-10-11'); assert.equal(result.expense, 0); assert.equal(result.cash, 0); assert.equal(result.openItems.length, 0);
});

test('Gewichtete Verteilung erhält jeden Cent auch bei negativen Korrekturen', () => {
  const weights = [{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }, { id: 'c', weight: 1 }];
  assert.deepEqual(distribute(10.01, weights), { a: 3.34, b: 3.34, c: 3.33 });
  assert.deepEqual(distribute(-10.01, weights), { a: -3.34, b: -3.34, c: -3.33 });
  assert.deepEqual(distribute(10, [{ id: 'a', weight: 0 }]), {});
});

test('BAB verteilt Raumkosten nach Fläche und legt Hilfskostenstellen auf Leistungen um', () => {
  const config = defaultConfig();
  config.costCenters = [center('workshop'), center('installation', { hours: 500, area: 50 }), center('office', { kind: 'support', hours: 0, area: 50 })];
  const result = calc(state({ config, transactions: [entry('rent', { amount: 1200 })] }));
  assert.equal(result.beforeTransfers.office, 300);
  assert.equal(result.transfers.office, -300); assert.equal(result.transfers.workshop, 200); assert.equal(result.transfers.installation, 100);
  assert.deepEqual(result.rows.find(row => row.id === 'space').values, { workshop: 800, installation: 400, office: 0 });
  assert.equal(result.rates[0].fullRate, 0.8); assert.equal(result.rates[1].fullRate, 0.8); assert.equal(result.unallocated, 0);
  assert.equal(result.rates.reduce((sum, rate) => sum + rate.total, 0), result.totalCosts);
});

test('Material bleibt außerhalb des Vollstundensatzes; Einzelkosten und Zuschlagsbasis bleiben nachvollziehbar', () => {
  const config = defaultConfig(); config.costCenters = [center('workshop')];
  const result = calc(state({ config, transactions: [entry('material', { amount: 1000, costTypeId: 'material', centerId: 'workshop' }), entry('rent', { amount: 500 })] }));
  assert.equal(result.rates[0].total, 1500); assert.equal(result.rates[0].hourlyCosts, 500); assert.equal(result.rates[0].fullRate, 0.5); assert.equal(result.rates[0].surcharge, 50);
});

test('BAB-Ergänzungen wirken nur auf interne Kosten, passende Basis und kalkulierte Sätze', () => {
  const config = defaultConfig(); config.costCenters = [center('workshop')]; config.babAdjustments.actual = { imputed: { workshop: 300 } };
  const actual = calc(state({ config })); assert.equal(actual.totalCosts, 300); assert.equal(actual.manualCosts, 300); assert.equal(actual.cash, 0); assert.equal(actual.payables, 0); assert.equal(actual.rates[0].fullRate, 0.3);
  assert.equal(calc(state({ config }), 'plan').totalCosts, 0);
});

test('Kalkulatorische Geschäftsvorfälle erzeugen Kosten ohne offene Rechnungen oder Liquiditätsänderung', () => {
  const input = { title: 'Unternehmerlohn', kind: 'expense', basis: 'actual', source: 'imputed', amount: 500, date: '2026-03-01', dueDate: '2026-03-31', vatRate: 19, costTypeId: 'imputed' };
  const validated = validateTransaction(input, defaultConfig());
  assert.equal(validated.vatRate, 0); assert.equal(validated.dueDate, null);
  const result = calc(state({ transactions: [entry('imputed', validated)] }));
  assert.equal(result.totalCosts, 500); assert.equal(result.payables, 0); assert.equal(result.cash, 0);
  assert.throws(() => validateTransaction({ ...input, kind: 'income' }, defaultConfig()), /interne Kosten/);
});

test('Unbekannte Zuordnungen und fehlende Bezugsgrößen werden ausgewiesen', () => {
  const config = defaultConfig(); config.costCenters = [center('workshop', { hours: 0, area: 0 })];
  const result = calc(state({ config, transactions: [entry('rent'), entry('unknown', { costTypeId: null }), entry('direct', { costTypeId: 'material' }), entry('assigned', { centerId: 'workshop', costTypeId: 'personnel' })] }));
  assert.equal(result.unallocated, 300); assert.equal(result.rates[0].fullRate, null); assert.equal(result.warnings.length, 2);
});

test('Abschreibungen laufen monatsanteilig, respektieren Restwert und verändern keine Liquidität', () => {
  const asset = { id: 'machine', name: 'CNC', acquiredAt: new Date('2026-07-15'), purchaseCost: 12000, residualValue: 0, usefulLifeYears: 10, centerId: null };
  const data = state({ assets: [asset] });
  const result = calc(data); assert.equal(result.depreciation, 600); assert.equal(result.assets[0].bookValue, 11400); assert.equal(result.totalCosts, 600); assert.equal(result.cash, 0);
  assert.equal(calc(data, 'actual', '2026-08-31').depreciation, 200); assert.equal(calc(data, 'plan', '2026-08-31').depreciation, 600);
  assert.equal(calculateManagement(data, { year: 2027, asOf: '2027-12-31' }).depreciation, 1200);
  const depreciated = state({ assets: [{ ...asset, acquiredAt: '2000-01-01', residualValue: 1000 }] }); assert.equal(calc(depreciated).assets[0].bookValue, 1000); assert.equal(calc(depreciated).depreciation, 0);
});

test('Darlehen, Tilgung und Anschaffung sind neutral; Bilanzbestand stimmt zum Stichtag', () => {
  const data = state({ transactions: [entry('loan', { kind: 'cash_in', amount: 1000, vatRate: 0, payments: [{ amount: 1000, date: '2026-03-01' }] }), entry('repayment', { kind: 'cash_out', amount: 100, vatRate: 0, payments: [{ amount: 100, date: '2026-05-01' }] })], loans: [{ id: 'loan', principal: 1000, startDate: '2026-03-01', repayments: [{ amount: 100, date: '2026-05-01' }] }] });
  const result = calc(data); assert.equal(result.income, 0); assert.equal(result.expense, 0); assert.equal(result.cash, 900); assert.equal(result.loanBalance, 900); assert.equal(result.balance.equity, 0);
});

test('Konfiguration validiert Namen, doppelte IDs, Referenzen und Bezugsgrößen', () => {
  assert.deepEqual(validateConfig(defaultConfig()), defaultConfig());
  const duplicate = defaultConfig(); duplicate.costTypes.push(duplicate.costTypes[0]); assert.throws(() => validateConfig(duplicate), /doppelte ID/);
  const invalidReference = defaultConfig(); invalidReference.costTypes[0].key = 'missing'; assert.throws(() => validateConfig(invalidReference), /nicht gefunden/);
  const negative = defaultConfig(); negative.costCenters = [center('x', { hours: -1 })]; assert.throws(() => validateConfig(negative), /gültigen Wert/);
});

test('Geschäftsvorfälle validieren Daten und wenden die erste passende Regel nur auf leere Felder an', () => {
  const config = defaultConfig(); config.costCenters = [center('workshop')]; config.rules = [{ id: 'first', match: 'strom', costTypeId: 'energy', centerId: 'workshop' }, { id: 'second', match: 'strom', costTypeId: 'space', centerId: null }];
  const input = { title: 'STROM April', kind: 'expense', basis: 'actual', date: '2026-04-01', amount: 20, vatRate: 19 };
  const assigned = validateTransaction(input, config); assert.equal(assigned.costTypeId, 'energy'); assert.equal(assigned.centerId, 'workshop');
  assert.equal(validateTransaction({ ...input, costTypeId: 'material' }, config).costTypeId, 'material');
  assert.throws(() => dateValue('2026-02-30', 'Datum'), /gültiges Datum/); assert.throws(() => validateTransaction({ ...input, amount: -1 }, config), /gültigen Wert/);
});
