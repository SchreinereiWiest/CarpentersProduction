/** Zulässige Jahres-, Geld- und Versionswerte für alle Management-Eingaben. */
export const LIMITS = {
  yearMin: 2000, yearMax: 2200, moneyMax: 999999999999.99,
  versionMax: 2147483646, configListMax: 200, setupListMax: 500,
  activityListMax: 200, nameMax: 200, configNameMax: 160, idMax: 100,
};
export const MAX_APPROVALS = 100;
export const ACTUAL_ASSET_FIELDS = ['actualMaintenance', 'actualEnergy', 'actualSpace', 'actualOperating'];
export const OPTIONAL_ASSET_FIELDS = [...ACTUAL_ASSET_FIELDS, 'interestAmount'];
export const MODES = ['easy', 'full'];
export const CENTER_KINDS = ['production', 'machine', 'support'];
export const ASSET_CATEGORIES = ['machine', 'cnc', 'vehicle', 'building', 'equipment'];
export const HOURS_MODES = ['manual', 'recorded'];
export const INTEREST_MODES = ['imputed', 'financing', 'none'];
export const DISTRIBUTION_METRICS = ['hours', 'area', 'employees', 'equal', 'custom'];
export const COST_TREATMENTS = ['direct', 'overhead'];
export const COST_SOURCES = ['manual', 'staff'];
export const IDENTIFIER_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
