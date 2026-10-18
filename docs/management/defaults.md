# Vorgaben und Defaultfabriken

Vorgaben beschreiben überprüfbare Ausgangswerte. Sie sind von tatsächlichen Betriebsdaten und von berechneten Ergebnissen getrennt. Eine Defaultfabrik liefert eine unabhängige Kopie, damit zwei Geschäftsjahre oder Positionen keine gemeinsam veränderten Listen besitzen.

## Gemeinsame Vorgaben

| Datei | Inhalt | Verwendet von |
| --- | --- | --- |
| `config.defaults.mjs` | Startmonat, Gewinnaufschlag, Kostenarten, Standardschlüssel, leere Einrichtung, Zeit- und Szenariovorgaben | Normalisierung, Rechnung, API-Validierung |
| `forms.defaults.mjs` | Anlagen, Kostenstellen, Restschulden, Personalkapazität, Jahreskosten, Easy-Raten, eigene Schlüssel | Browserfabriken, CSV-Import und Übernahme alter Bestände |
| `catalog.defaults.mjs` | Acht Schritte, typische Betriebskosten, Bereichsvorschläge und Eingabekataloge | Navigation, Einrichtungsseiten und Import |
| `validation.defaults.mjs` | Zulässige Kategorien/Modi, Feldnamen, ID-/Datumsformate und Grenzen | Backendvalidierung, Snapshot und Import |
| `import.defaults.mjs` | CSV-Kopfzeile, Bereichs-/Bilanzzuordnung und Größenlimits | Importvorschau und Vorlagen-Download |

Diese Dateien liegen unter `Engine/src/management/defaults/`. Fachlich identische Vorgaben werden im Browser und im Backend aus derselben Quelle gelesen.

## Wichtige Startwerte

| Vorgabe | Wert | Interpretation |
| --- | --- | --- |
| Jahresbeginn | Januar | Ein anderer Startmonat wird in Schritt 01 gewählt |
| Erststart ohne Daten | Vollkosten-Vorschlag | Easy bleibt ausdrücklich wählbar |
| Gewinnaufschlag | 10 % | Bearbeitbarer Aufschlag auf Selbstkosten |
| Anlagenkategorie | Standardmaschine | Vor dem Speichern prüfen |
| Nutzungsdauer | 10 Jahre | Überprüfbare Annahme, keine automatisch erkannte Nutzungsdauer |
| Kalkulatorischer Anlagenzins | 3 % | In der Maschinenmaske änderbar oder durch Jahresbetrag ersetzbar |
| Personalkapazität ohne Kalenderjahr | 260 Arbeitstage, 8 Tagesstunden | Fallback; vorhandenes Jahr und Firmenzeiten überschreiben diese Werte |
| Ausfälle | 10 Feiertage, 30 Urlaub, 10 Krankheit, 5 Schulung | Individuell überprüfen |
| Produktiver Anteil | 80 % | Individuell überprüfen |
| Vollzeitäquivalent | 1 | Teilzeit ändert die abgeleitete Kapazität |
| Ist-Aufwendungen | `null` | Noch unbekannt; ein geprüfter Nullbetrag ist `0` |
| Maschinenlaufzeit | 0 | Ableitung aus Tätigkeiten/Bereich statt manueller Laufzeit |

Die Browserfunktion `newStaff` berechnet Werktage aus dem konkreten Geschäftsjahr und Netto-Tagesstunden aus den Firmeneinstellungen. Sie verwendet anschließend dieselbe gemeinsame Positionsstruktur wie andere Zugriffswege.

## Frontendvorgaben

`Frontend/src/features/management/defaults/forms.defaults.js` verbindet die gemeinsamen Fabriken mit Browser-UUIDs, Jahresbeginn, Personalnamen und Firmeneinstellungen. Die Formularseiten enthalten keine zweite Kopie der Anlage- oder Personaldatenstruktur.

`navigation.defaults.js` hält SVG-Pfade, die Einrichtung-/Jahresbereiche und den angezeigten Jahresbereich der Auswahlliste. `ui.defaults.js` enthält Eingabefeldgestaltung, optionale UI-Eigenschaften, Zahlenformatierung und die Beleguploadgrenzen. Die bestehenden Firmenzeiten und Tätigkeiten stammen weiterhin aus dem unabhängigen Company-Settings-Modul.

## Backendvorgaben

`Backend/src/modules/management/services/defaults/persistence.defaults.js` enthält die Projektion der benötigten Zeitfelder und die Transaktionsoptionen. Read-Snapshots verwenden `RepeatableRead`, Änderungen mit Auditnachweis `Serializable`.

Die aktive API unterstützt Geschäftsjahre 2000–2200, maximal 200 Konfigurationseinträge je Struktur, maximal 500 Positionen je Einrichtungsliste und maximal 100 Freigaben pro Geschäftsjahr. Ein CSV-Import ist auf 2 MB und 1.500 Datenzeilen begrenzt; Belege auf 50 MB und PDF/JPG.

## Vorgaben ändern

Eine Änderung der Defaults ersetzt nicht automatisch bereits gespeicherte Betriebswerte. Fabriken sind für neue Positionen vorgesehen; die Normalisierung ergänzt bekannte fehlende Strukturen. Die Freigabehistorie bleibt unverändert. Änderungen an Struktur oder Berechnungsannahmen sollten mit den [Rechentests](testing.md) geprüft werden.
