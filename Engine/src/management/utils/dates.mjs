import { DATE_DEFAULTS, defaultConfig } from '../defaults/config.defaults.mjs';
/** Normalisiert ISO-Zeichenketten und Prisma-Datumsobjekte auf den Kalendertag JJJJ-MM-TT. */
export const day = (value) =>
  value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value
      ? String(value).slice(0, 10)
      : "";

/** Liefert den aktuellen Kalendertag in der für die Betriebsrechnung verwendeten Berliner Zeitzone. */
export const today = () =>
  new Intl.DateTimeFormat(DATE_DEFAULTS.locale, DATE_DEFAULTS.options).format(new Date());

/** Berechnet den vollständigen zwölfmonatigen Abrechnungszeitraum ab dem gewählten Startmonat. */
export function fiscalRange(year, startMonth = defaultConfig().startMonth) {
  const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(Number(year) + 1, Number(startMonth) - 1, 0))
    .toISOString()
    .slice(0, 10);
  return { start, end };
}

/** Ordnet einen UTC-Zeitstempel dem Berliner Kalendertag des Arbeitsbeginns zu. */
export const dateInBerlin = (value) =>
  new Intl.DateTimeFormat(DATE_DEFAULTS.locale, DATE_DEFAULTS.options).format(new Date(value));
