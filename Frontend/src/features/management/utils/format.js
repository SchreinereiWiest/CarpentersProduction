import { FORMAT_DEFAULTS } from '../defaults/ui.defaults.js';
/** Formatiert einen internen Zahlenwert als Eurobetrag in deutscher Schreibweise. */
export const money = value => new Intl.NumberFormat(FORMAT_DEFAULTS.locale, { style: 'currency', currency: FORMAT_DEFAULTS.currency }).format(Number(value || 0));
/** Formatiert Stunden, Anteile und andere Zahlen mit höchstens zwei Nachkommastellen. */
export const decimal = value => new Intl.NumberFormat(FORMAT_DEFAULTS.locale, { maximumFractionDigits: FORMAT_DEFAULTS.decimalPlaces }).format(Number(value || 0));
/** Formatiert einen gespeicherten Kalendertag ohne Verschiebung durch lokale Zeitzonen. */
export const dateLabel = value => value ? new Intl.DateTimeFormat(FORMAT_DEFAULTS.locale).format(new Date(String(value).slice(0, 10) + 'T12:00:00')) : '–';
