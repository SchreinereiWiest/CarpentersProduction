import { SETUP_STEPS } from '@Engine/management/defaults/catalog.defaults.mjs';

/** SVG-Pfade der acht fachlichen Schritte; Reihenfolge entspricht dem gemeinsamen Schrittkatalog. */
const ICONS = [
  'M3 21V7l9-4 9 4v14 M8 21v-7h8v7 M7 9h1 M16 9h1',
  'M3 10h18 M4 20h16 M6 10v10 M12 10v10 M18 10v10 M3 7l9-4 9 4v3H3z',
  'M7 3h10v18H7z M10 7h4 M10 11h4 M10 15h4',
  'M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M4 21v-3a8 8 0 0 1 16 0v3',
  'M12 3v6 M4 21v-7h16v7 M4 14v-5h16v5 M12 14v7',
  'M4 8h16v12H4z M8 8V4h8v4 M8 12h8 M8 16h3 M17 16h1',
  'M3 4h18v16H3z M3 9h18 M9 4v16 M15 9v11 M3 15h18',
  'M4 12l5 5L20 6',
];
export const SETUP_NAVIGATION = SETUP_STEPS.map(([path, label], index) => [`Setup/${path}`, label, ICONS[index]]);
export const OPERATING_NAVIGATION = [
  ['', 'Betriebsübersicht', ICONS[0]], ['Hours', 'Stunden & Produktivität', ICONS[3]],
  ['Costs', 'Kostenstellen & Vergleich', ICONS[6]],
];
export const YEAR_SELECT_DEFAULTS = { count: 12, pastYears: 6 };
