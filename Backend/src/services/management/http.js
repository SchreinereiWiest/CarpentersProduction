import { today } from '../../../../Engine/management/utils/dates.mjs';
import { yearValue } from './validation/values.js';

/** Liest und validiert das Geschäftsjahr; ohne Parameter gilt das Berliner Kalenderjahr. */
export function requestYear(req) {
  return yearValue(req.query.year || today().slice(0, 4));
}

/** Übersetzt Validierungs-, Versions- und Datenbankfehler in einheitliche API-Antworten. */
export function run(handler) {
  /** Bearbeitet eine geschützte Anfrage und übersetzt Fehler in die gemeinsame Managementantwort. */
  async function managementHandler(req, res) {
    try {
      await handler(req, res);
    } catch (error) {
      const conflict = ['P2002', 'P2034'].includes(error.code);
      const missing = error.code === 'P2025';
      if (!error.status && !conflict && !missing) console.error('Management:', error);
      const message = error.status ? error.message
        : conflict ? 'Die Daten wurden zwischenzeitlich geändert. Bitte neu laden.'
          : missing ? 'Eintrag nicht gefunden.' : 'Betriebsdaten konnten nicht verarbeitet werden.';
      res.status(error.status || (conflict ? 409 : missing ? 404 : 500)).json({ message });
    }
  }
  return managementHandler;
}
