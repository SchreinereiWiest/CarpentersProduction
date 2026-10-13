import { CALCULATION_DEFAULTS, defaultConfig, defaultSetup } from '../defaults/config.defaults.mjs';
import { EXTRA_DISTRIBUTION_KEYS } from '../defaults/catalog.defaults.mjs';
import { OPTIONAL_ASSET_FIELDS } from '../defaults/validation.defaults.mjs';
import { CENTER_DEFAULTS } from '../defaults/forms.defaults.mjs';

/** Ergänzt bekannte Vorgaben, entfernt die alte Vorfallkonfiguration und bereitet einen unabhängigen Einrichtungsentwurf vor. */
export function prepareSetupConfig(state) {
  const defaults = defaultConfig();
  const config = structuredClone({
    ...defaults,
    ...state.config,
    setup: { ...defaultSetup(), ...state.config?.setup }
  });
  if (
    state.revision === 0 &&
    !config.easyRates.length &&
    !config.costCenters.length
  )
    config.mode = CALCULATION_DEFAULTS.initialMode;
  for (const type of defaults.costTypes)
    if (!config.costTypes.some((item) => item.id === type.id))
      config.costTypes.push(type);
  for (const key of EXTRA_DISTRIBUTION_KEYS) {
    if (!config.distributionKeys.some(item => item.id === key.id)) config.distributionKeys.push(structuredClone(key));
  }
  config.costCenters.forEach(center => {
    center.activityIds ||= structuredClone(CENTER_DEFAULTS.activityIds);
    center.consumption ??= CENTER_DEFAULTS.consumption;
    center.usage ??= CENTER_DEFAULTS.usage;
  });
  config.setup.assets.forEach(asset => {
    for (const field of OPTIONAL_ASSET_FIELDS) asset[field] ??= null;
  });
  // Alte Zuordnungsregeln und manuelle BAB-Zellen gehören nicht mehr zum Jahresmodell.
  delete config.rules;
  delete config.babAdjustments;
  config.setup.initialized = true;
  return config;
}
