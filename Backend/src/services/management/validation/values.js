import { round } from '../../../../../Engine/management/utils/numbers.mjs';
import { DATE_PATTERN, LIMITS, UUID_PATTERN } from '../../../../../Engine/management/defaults/validation.defaults.mjs';

/** Bricht eine Validierung mit einer gezielten Meldung und einem HTTP-Status ab. */
export function invalid(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
/** Prüft eine endliche Zahl innerhalb der Grenzen und rundet sie auf zwei Nachkommastellen. */
export function number(value, label, min = 0, max = LIMITS.moneyMax) {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) invalid(`${label}: gültigen Wert zwischen ${min} und ${max} eingeben.`);
  return round(value);
}
/** Bereinigt ein Textfeld; leere optionale Werte werden null, Pflichtfelder müssen Inhalt haben. */
export function textValue(value, label, required = false, max = LIMITS.nameMax) {
  if (value === null || value === undefined || value === '') {
    if (required) invalid(`${label} fehlt.`);
    return null;
  }
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) invalid(`${label} ist ungültig.`);
  return value.trim() || null;
}
/** Prüft ein echtes ISO-Kalenderdatum, einschließlich Monatslänge und Schaltjahren. */
export function dateValue(value, label) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) invalid(`${label}: gültiges Datum eingeben.`);
  return new Date(`${value}T00:00:00Z`);
}
/** Prüft optionale Datenbank-UUIDs, beispielsweise die Verknüpfung eines Mitarbeiters. */
export function uuid(value) {
  if (!value) return null;
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) invalid('Ungültige Verknüpfung.');
  return value;
}
/** Prüft ein ganzzahliges Geschäftsjahr innerhalb des unterstützten Bereichs. */
export function yearValue(value) {
  const year = number(value, 'Geschäftsjahr', LIMITS.yearMin, LIMITS.yearMax);
  if (!Number.isInteger(year)) invalid('Geschäftsjahr muss ganzzahlig sein.');
  return year;
}
/** Prüft eine ganzzahlige Revision für den Schutz vor konkurrierenden Schreibzugriffen. */
export function versionValue(value) {
  const version = number(value, 'Version', 0, LIMITS.versionMax);
  if (!Number.isInteger(version)) invalid('Ungültige Version.');
  return version;
}
/** Stellt sicher, dass eine optionale Zuordnung auf einen Eintrag derselben Konfiguration verweist. */
export function reference(value, entries, label) {
  if (!value) return null;
  if (!entries.some(entry => entry.id === value)) invalid(`${label} wurde nicht gefunden.`);
  return value;
}
