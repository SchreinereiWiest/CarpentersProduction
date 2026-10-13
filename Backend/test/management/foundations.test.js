import test from 'node:test';
import assert from 'node:assert/strict';
import { day, fiscalRange } from '../../../shared/management/utils/dates.mjs';
import { distribute } from '../../../shared/management/calculation/distribution.mjs';
import { defaultConfig } from '../../../shared/management/defaults/config.defaults.mjs';
import { createAssetDefaults, createAnnualCostDefaults, createCenterDefaults } from '../../../shared/management/defaults/forms.defaults.mjs';
import { validateConfig } from '../../src/services/management/validation/configuration.js';
import { dateValue, yearValue, versionValue } from '../../src/services/management/validation/values.js';
import { readLegacyInventory } from '../../src/services/management/legacyInventory.js';

/** Prüft, dass unterschiedliche Geschäftsjahre keine Listen oder Gewichte gemeinsam verändern. */
function independentDefaults() {
  const first = defaultConfig(); const second = defaultConfig();
  first.costTypes[0].name = 'Geändert'; first.setup.assets.push(createAssetDefaults('asset', '2026-01-01')); first.distributionKeys[0].weights.workshop = 1;
  assert.equal(second.costTypes[0].name, 'Material'); assert.deepEqual(second.setup.assets, []); assert.deepEqual(second.distributionKeys[0].weights, {});
}

test('Geschäftsjahre unterstützen Startmonat und Prisma-Datumsobjekte', () => {
  assert.deepEqual(fiscalRange(2026, 4), { start: '2026-04-01', end: '2027-03-31' });
  assert.equal(day(new Date('2026-03-01')), '2026-03-01');
});
test('Centverteilung erhält positive und negative Beträge vollständig', () => {
  const weights = [{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }, { id: 'c', weight: 1 }];
  assert.deepEqual(distribute(10.01, weights), { a: 3.34, b: 3.34, c: 3.33 });
  assert.deepEqual(distribute(-10.01, weights), { a: -3.34, b: -3.34, c: -3.33 });
  assert.deepEqual(distribute(10, [{ id: 'a', weight: 0 }]), {});
});
test('Defaultfabriken liefern unabhängige Daten und unbekannte Ist-Werte', () => {
  independentDefaults();
  const first = createAssetDefaults('one', '2026-01-01'); const second = createAssetDefaults('two', '2026-01-01'); first.activityIds.push('cnc');
  assert.deepEqual(second.activityIds, []); assert.equal(second.actualMaintenance, null);
  assert.equal(createAnnualCostDefaults('cost').actualAmount, null);
  assert.deepEqual(validateConfig(defaultConfig()), defaultConfig());
});
test('Validierung lehnt doppelte IDs, ungültige Referenzen, Datums- und Versionswerte ab', () => {
  const duplicate = defaultConfig(); duplicate.costTypes.push(duplicate.costTypes[0]); assert.throws(() => validateConfig(duplicate), /doppelte ID/);
  const reference = defaultConfig(); reference.costTypes[0].key = 'missing'; assert.throws(() => validateConfig(reference), /nicht gefunden/);
  const negative = defaultConfig(); negative.costCenters = [createCenterDefaults('workshop', { hours: -1 })]; assert.throws(() => validateConfig(negative), /gültigen Wert/);
  assert.throws(() => dateValue('2026-02-30', 'Datum'), /gültiges Datum/); assert.throws(() => yearValue(2026.5), /ganzzahlig/); assert.throws(() => versionValue(-1), /gültigen Wert/);
});
test('Alte Anlagen und Restschulden werden einmalig übernommen, ohne neue Zahlungsbewegungen', async () => {
  let reads = 0;
  const db = {
    managementAsset: { findMany: async () => { reads++; return [{ id: 'asset', name: 'Altmaschine', acquiredAt: new Date('2020-01-01'), purchaseCost: '10000', residualValue: '1000', usefulLifeYears: '10', centerId: null }]; } },
    managementLoan: { findMany: async () => { reads++; return [{ id: 'loan', name: 'Restschuld', principal: '10000', interestRate: '5', repayments: [{ amount: '1000' }] }]; } },
  };
  const first = await readLegacyInventory(db, defaultConfig());
  assert.equal(first.setup.assets[0].acquiredAt, '2020-01-01'); assert.equal(first.setup.loans[0].balance, 9000);
  first.setup.initialized = true; first.setup.assets = []; first.setup.loans = [];
  const second = await readLegacyInventory(db, first); assert.equal(second.setup.assets.length, 0); assert.equal(reads, 2);
});
