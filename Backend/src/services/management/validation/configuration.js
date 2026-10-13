import { defaultConfig, defaultSetup } from '../../../../../shared/management/defaults/config.defaults.mjs';
import { CENTER_KINDS, COST_TREATMENTS, DISTRIBUTION_METRICS, IDENTIFIER_PATTERN, LIMITS, MODES } from '../../../../../shared/management/defaults/validation.defaults.mjs';
import { invalid, number, reference, textValue } from './values.js';
import { validateSetup } from './setup.js';

/** Validiert das komplette Jahresmodell und übernimmt nur die aktiv unterstützten Konfigurationsfelder. */
export function validateConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('Einstellungen fehlen.');
  const config = structuredClone(input);
  config.setup = { ...defaultSetup(), ...config.setup };
  for (const name of ['costTypes', 'costCenters', 'distributionKeys', 'easyRates']) {
    if (!Array.isArray(config[name]) || config[name].length > LIMITS.configListMax) invalid(`Ungültige Liste: ${name}.`);
    const ids = new Set();
    for (const item of config[name]) {
      if (!item || typeof item.id !== 'string' || !IDENTIFIER_PATTERN.test(item.id) || ids.has(item.id)) invalid(`Ungültige oder doppelte ID: ${name}.`);
      ids.add(item.id);
      item.name = textValue(item.name, 'Bezeichnung', true, LIMITS.configNameMax);
    }
  }
  if (!MODES.includes(config.mode)) invalid('Ungültiger Modus.');
  config.startMonth = number(config.startMonth, 'Geschäftsjahresbeginn', 1, 12);
  if (!Number.isInteger(config.startMonth)) invalid('Ungültiger Geschäftsmonat.');
  for (const field of ['openingCash', 'openingOtherAssets', 'openingOtherLiabilities']) config[field] = number(config[field], field, field === 'openingCash' ? -Math.floor(LIMITS.moneyMax) : 0);
  config.profitPercent = number(config.profitPercent, 'Gewinnaufschlag', 0, 1000);
  for (const center of config.costCenters) {
    if (!CENTER_KINDS.includes(center.kind)) invalid('Ungültiger Kostenstellentyp.');
    for (const field of ['hours', 'area', 'employees', 'directBase']) center[field] = number(center[field], field);
    center.redistributionKey = reference(center.redistributionKey, config.distributionKeys, 'Umlageschlüssel');
    if (center.activityIds !== undefined && (!Array.isArray(center.activityIds) || center.activityIds.length > LIMITS.activityListMax || center.activityIds.some(id => typeof id !== 'string' || !id || id.length > LIMITS.nameMax) || new Set(center.activityIds).size !== center.activityIds.length)) invalid('Ungültige Tätigkeitszuordnung.');
    if (center.consumption !== undefined) center.consumption = number(center.consumption, 'Energieverbrauch');
    if (center.usage !== undefined) center.usage = number(center.usage, 'Fahrzeugnutzung');
  }
  for (const key of config.distributionKeys) {
    if (!DISTRIBUTION_METRICS.includes(key.metric)) invalid('Ungültiger Verteilungsschlüssel.');
    if (!key.weights || typeof key.weights !== 'object' || Array.isArray(key.weights)) invalid('Verteilungsgewichte fehlen.');
    for (const [id, weight] of Object.entries(key.weights)) {
      reference(id, config.costCenters, 'Kostenstelle des Schlüssels');
      key.weights[id] = number(weight, 'Verteilungsgewicht');
    }
  }
  for (const type of config.costTypes) {
    if (!COST_TREATMENTS.includes(type.treatment) || typeof type.hourly !== 'boolean') invalid('Ungültige Kostenart.');
    type.key = reference(type.key, config.distributionKeys, 'Verteilungsschlüssel');
  }
  if (!config.costTypes.some(type => type.id === 'depreciation')) invalid('Die Kostenart Abschreibungen wird für Anlagegüter benötigt.');
  for (const rate of config.easyRates) rate.rate = number(rate.rate, 'Stundensatz');
  config.setup = validateSetup(config.setup, config);
  return Object.fromEntries(Object.keys(defaultConfig()).map(key => [key, config[key]]));
}
