import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig } from '../../../Engine/src/management/defaults/config.defaults.mjs';
import { aggregateWorkingHours, productiveHours } from '../../../Engine/src/management/calculation/hours.mjs';
import { assetCalculation } from '../../../Engine/src/management/calculation/assets.mjs';
import { calculateSetup } from '../../../Engine/src/management/calculation/accounting.mjs';
import { prepareSetupConfig } from '../../../Engine/src/management/config/normalize.mjs';
import { setupChecks } from '../../../Engine/src/management/config/approval.mjs';
import { importManagementCsv, importNumber } from '../../../Engine/src/management/imports/csv.mjs';
import { validateConfig } from '../../src/modules/management/services/validation/configuration.js';

const center = (id, values = {}) => ({ id, name: id, kind: 'production', hours: 1000, area: 100, employees: 1, directBase: 0, redistributionKey: 'hours', activityIds: [id], consumption: 1, usage: 1, ...values });
const config = () => { const c = prepareSetupConfig({ config: defaultConfig() }); c.mode = 'full'; c.setup.companyName = 'Testschreinerei'; c.costCenters = [center('workshop')]; return c; };
const asset = (values = {}) => ({ id: 'cnc', name: 'CNC', category: 'cnc', acquiredAt: '2026-01-01', purchaseCost: 120000, replacementCost: 0, useReplacement: false, residualValue: 20000, usefulLifeYears: 10, usedYears: 0, centerId: 'workshop', loanId: null, maintenance: 5000, energy: 6000, space: 3000, operating: 0, hours: 1000, activityIds: [], interestRate: 3, interestAmount: 2000, actualMaintenance: null, actualEnergy: null, actualSpace: null, actualOperating: null, ...values });
const cost = (values = {}) => ({ id: 'rent', name: 'Miete', costTypeId: 'space', amount: 12000, actualAmount: null, centerId: null, keyId: 'area', source: 'manual', ...values });
const staff = (values = {}) => ({ id: 'staff', name: 'Mitarbeiter', userId: null, annualHours: null, workDays: 260, holidays: 10, vacation: 30, sickDays: 10, trainingDays: 5, hoursPerDay: 8, productivity: 80, annualCost: 60000, fte: 1, allocations: [{ centerId: 'workshop', percent: 100 }], ...values });
const calc = (c, options = {}) => calculateSetup(c, { year: 2026, asOf: '2026-12-31', ...options });
const time = (workType, duration, values = {}) => ({ id: `${workType}-${duration}`, workType, customWorkType: null, duration, startedAt: '2026-04-01T06:00:00Z', endedAt: '2026-04-01T16:00:00Z', userId: 'employee', user: { firstName: 'Anna', lastName: 'Holz' }, ...values });

test('CNC-Beispiel berechnet 10.000 € Abschreibung, 26.000 € Maschinenkosten und exakt 26 €/h', () => {
  const c = config(); c.setup.assets = [asset()];
  assert.equal(validateConfig(c).setup.assets[0].interestAmount, 2000);
  const result = calc(c);
  assert.equal(result.depreciation, 10000); assert.equal(result.machines[0].total, 26000); assert.equal(result.machines[0].rate, 26);
  assert.equal(result.totalCosts, 26000); assert.equal(result.rates[0].fullRate, 26); assert.deepEqual(setupChecks(c, result), []);
});

test('Restschuld ist ein Bestand und Tilgung keine Kosten; Zinsmethoden bleiben gegenseitig exklusiv', () => {
  const c = config(); c.setup.loans = [{ id: 'loan', name: 'Kredit', balance: 140000, interestRate: 5, repayment: 10000, centerId: null }]; c.setup.assets = [asset({ loanId: 'loan' })];
  const imputed = calc(c); assert.equal(imputed.financeInterest, 7000); assert.equal(imputed.totalCosts, 26000); assert.equal(imputed.balance.liabilities, 140000);
  c.setup.interestMode = 'financing'; const financed = calc(c); assert.equal(financed.machines[0].costs.interest, 7000); assert.equal(financed.totalCosts, 31000);
  c.setup.interestMode = 'none'; assert.equal(calc(c).totalCosts, 24000);
});

test('Ein Darlehen für mehrere Maschinen wird centgenau geteilt und nicht doppelt berechnet', () => {
  const c = config(); c.setup.interestMode = 'financing'; c.setup.loans = [{ id: 'loan', name: 'Kredit', balance: 1000, interestRate: 10, repayment: 0, centerId: null }];
  c.setup.assets = [asset({ loanId: 'loan' }), asset({ id: 'second', loanId: 'loan' })];
  const result = calc(c); assert.equal(result.machines.reduce((sum, item) => sum + item.costs.interest, 0), 100); assert.equal(result.rows.find(item => item.id === 'interest').total, 100);
});

test('Ist-Summen ersetzen Planwerte; ungefüllte Ist-Kosten bleiben fehlend', () => {
  const c = config(); c.setup.annualCosts = [cost()];
  assert.equal(calc(c).totalCosts, 12000);
  const missing = calc(c, { basis: 'actual' }); assert.equal(missing.totalCosts, 0); assert.deepEqual(missing.missingActual, ['Miete']);
  c.setup.annualCosts[0].actualAmount = 3000;
  assert.equal(calc(c, { basis: 'actual' }).totalCosts, 3000); assert.equal(calc(c).totalCosts, 12000);
  c.setup.annualCosts[0].actualAmount = 0; assert.deepEqual(calc(c, { basis: 'actual' }).missingActual, []);
});

test('Jährliche Maschinenaufwendungen werden nicht automatisch als Ist-Kosten gezählt', () => {
  const c = config(); c.setup.assets = [asset()]; c.setup.assets[0].actualMaintenance = 400;
  const result = calc(c, { basis: 'actual' });
  assert.equal(result.totalCosts, 12400); assert.equal(result.rows.find(row => row.id === 'maintenance').total, 400); assert.equal(result.rows.find(row => row.id === 'energy').total, 0);
  assert.equal(result.missingActual.length, 2);
});

test('Wiederbeschaffungswert und Nutzungsjahre begrenzen die Abschreibung bis zum Restwert', () => {
  const a = asset({ useReplacement: true, replacementCost: 140000, usedYears: 9.5 });
  const result = assetCalculation(a, 2026, 1); assert.equal(result.annualDepreciation, 12000); assert.equal(result.depreciation, 6000);
  assert.equal(assetCalculation({ ...a, usedYears: 12 }, 2026, 1).depreciation, 0);
  const c = config(); c.setup.assets = [asset({ acquiredAt: '2026-12-01', usedYears: null })];
  assert.equal(calc(c, { basis: 'actual', asOf: '2026-06-30' }).depreciation, 0);
});

test('Arbeitszeit berücksichtigt Ausfälle, Produktivität, Teilzeit und direkte Jahresstunden', () => {
  assert.equal(productiveHours(staff()), 1312); assert.equal(productiveHours(staff({ fte: 0.5 })), 656); assert.equal(productiveHours(staff({ annualHours: 1000 })), 1000);
  const c = config(); c.costCenters = [center('bank'), center('machine'), center('installation')];
  c.setup.staff = [staff({ annualHours: 1000, allocations: [{ centerId: 'bank', percent: 60 }, { centerId: 'machine', percent: 25 }, { centerId: 'installation', percent: 15 }] })];
  const result = calc(c); assert.deepEqual(result.planHours, { bank: 600, machine: 250, installation: 150 });
});

test('Kalenderzeiten bündeln Tätigkeiten, zeigen Mitarbeiteranteile und filtern laufende / fremde Perioden', () => {
  const c = config(); c.costCenters = [center('machines', { activityIds: ['cutting', 'edging'] }), center('installation')];
  const entries = [time('cutting', 60), time('edging', 30), time('installation', 90), time('unknown', 15), time('cutting', 120, { endedAt: null }), time('cutting', 60, { startedAt: '2025-01-01T08:00:00Z' }), time('cutting', 60, { startedAt: '2026-12-01T08:00:00Z' })];
  const actual = aggregateWorkingHours(entries, c, 2026, '2026-06-30');
  assert.equal(actual.total, 3.25); assert.deepEqual(actual.values, { machines: 1.5, installation: 1.5 }); assert.equal(actual.unmapped, 0.25);
  assert.equal(actual.employees[0].name, 'Anna Holz'); assert.equal(actual.months[0].month, '2026-04');
});

test('Zeiten verwenden Berliner Kalendertage und unterstützen eigene Tätigkeiten', () => {
  const c = config(); c.startMonth = 4; c.costCenters[0].activityIds = ['custom:Sonderbau'];
  const actual = aggregateWorkingHours([time('custom', 60, { customWorkType: 'Sonderbau', startedAt: '2026-03-31T22:30:00Z' })], c, 2026, '2026-04-01');
  assert.equal(actual.total, 1); assert.equal(actual.values.workshop, 1);
});

test('Stundenberichte ersetzen die Planbasis nur bei gewähltem Modus und vorhandenen Daten', () => {
  const c = config(); c.setup.hoursMode = 'recorded'; c.setup.staff = [staff({ annualHours: 1500 })];
  assert.equal(calc(c).rates[0].hours, 1500);
  assert.equal(calc(c, { timeEntries: [time('workshop', 60)] }).rates[0].hours, 1);
});

test('BAB nutzt Positionsschlüssel und legt Hilfskostenstellen ohne doppelte Kosten um', () => {
  const c = config(); c.costCenters = [center('a', { area: 100 }), center('b', { area: 50 }), center('office', { kind: 'support', hours: 0, area: 50 })];
  c.setup.annualCosts = [cost({ amount: 1200 }), cost({ id: 'office-cost', name: 'Verwaltung', costTypeId: 'administration', amount: 600, centerId: 'office' })];
  const result = calc(c); assert.equal(result.beforeTransfers.office, 900); assert.equal(result.transfers.office, -900); assert.equal(result.rates[0].total, 1050); assert.equal(result.rates[1].total, 750); assert.equal(result.totalCosts, 1800);
});

test('Freigabeprüfung verlangt vollständige Verteilung; Easy erlaubt leere Anlagen und Kostenstellen', () => {
  const c = config(); c.setup.staff = [staff({ allocations: [{ centerId: 'workshop', percent: 60 }] })]; c.setup.annualCosts = [cost()];
  assert.ok(setupChecks(c, calc(c)).some(item => item.includes('100 %')));
  c.mode = 'easy'; c.costCenters = []; c.setup.staff = []; c.easyRates = [{ id: 'easy', name: 'Werkstatt', rate: 50 }]; assert.deepEqual(setupChecks(c, calc(c)), []);
  c.setup.companyName = ''; assert.ok(setupChecks(c, calc(c)).includes('Betriebsname fehlt.'));
});

test('CSV importiert deutsche Werte, ersetzt wiederholte Positionen und verändert nicht den Ausgangsentwurf', () => {
  const c = config(); const source = 'bereich;position;wert;kostenart;kostenstelle;anschaffungsdatum;nutzungsdauer;restwert;zinssatz;istwert\ncnc;CNC;120.000,00;;workshop;2026-01-01;10;20.000,00;3;\nkosten;Miete;48.000,00;space;workshop;;;;;4.000,00\nbilanz;Bankguthaben;35.000,00;;;;;;;\ndarlehen;Investitionskredit;-140.000,00;;;;;;5;';
  let counter = 0; const first = importManagementCsv(source, c, () => `import-${counter++}`);
  assert.equal(first.config.setup.assets[0].purchaseCost, 120000); assert.equal(first.config.setup.annualCosts[0].actualAmount, 4000); assert.equal(first.config.openingCash, 35000); assert.equal(first.config.setup.loans[0].balance, 140000);
  const second = importManagementCsv(source, first.config, () => `import-${counter++}`); assert.equal(second.config.setup.assets.length, 1); assert.equal(second.config.setup.annualCosts.length, 1);
  assert.equal(c.setup.assets.length, 0); assert.equal(validateConfig(first.config).setup.assets.length, 1);
});

test('CSV lehnt ungültige Beträge, doppelte Zeilen und unbekannte Kostenstellen vollständig ab', () => {
  const c = config(); assert.throws(() => importNumber('2abc'), /Ungültiger Betrag/);
  assert.throws(() => importManagementCsv('bereich;position;wert\nbilanz;Bankguthaben;100\nbilanz;Bankguthaben;200', c, () => 'id'), /doppelt/);
  assert.throws(() => importManagementCsv('bereich;position;wert;kostenstelle\nkosten;Miete;100;missing', c, () => 'id'), /Kostenstelle/);
});

test('Client kann keine Freigabehistorie schreiben; doppelte Personalkostenübernahme wird verhindert', () => {
  const c = config(); c.setup.approvals = [{ version: 999, config: c }]; assert.deepEqual(validateConfig(c).setup.approvals, []);
  c.setup.approvals = []; c.setup.annualCosts = [cost({ id: 'one', costTypeId: 'personnel', source: 'staff' }), cost({ id: 'two', costTypeId: 'personnel', source: 'staff' })];
  assert.ok(setupChecks(c, calc(c)).some(item => item.includes('nur einmal')));
});

test('Personalkostenübernahme verwendet individuelle Jahreskosten und deren Tätigkeitsverteilungen', () => {
  const c = config(); c.costCenters = [center('a'), center('b')];
  c.setup.staff = [staff({ id: 'one', annualCost: 40000, allocations: [{ centerId: 'a', percent: 100 }] }), staff({ id: 'two', annualCost: 80000, allocations: [{ centerId: 'b', percent: 100 }] })];
  c.setup.annualCosts = [cost({ id: 'payroll', costTypeId: 'personnel', source: 'staff', keyId: 'hours' })];
  const result = calc(c); assert.equal(result.rates[0].total, 40000); assert.equal(result.rates[1].total, 80000);
});

test('Reine Maschinenkostenstelle verwendet Laufzeit und Kostenanteile stimmen mit dem BAB überein', () => {
  const c = config(); c.costCenters = [center('workshop', { kind: 'machine', hours: 0 })]; c.setup.assets = [asset()];
  const result = calc(c); assert.equal(result.rates[0].hours, 1000); assert.equal(result.rates[0].fullRate, 26);
  assert.deepEqual(setupChecks(c, result), []);
});
