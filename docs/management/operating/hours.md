# Jahresbetrieb · Stunden und Produktivität

Diese Ansicht zeigt die tatsächlich gespeicherte Arbeitszeit. Sie ergänzt die Jahreskalkulation um den Verlauf des Geschäftsjahrs, ohne die veröffentlichte Planbasis zu überschreiben.

## Aufschlüsselungen

| Tabelle | Inhalt |
| --- | --- |
| Mitarbeiter | Stunden je Kostenstelle, nicht zugeordnete Stunden, Summe und persönliche Anteile |
| Tätigkeiten | Originaltätigkeit, zugehörige Kostenstelle, Stunden und Anteil am Gesamtwert |
| Monatsverlauf | Stunden je Bereich und Monat |
| Plan/Produktivität | Jahresplan, zeitanteilige Planstunden und bisherige Erfüllung |

Mehrere Tätigkeiten derselben Kostenstelle bleiben einzeln erkennbar. Ein Mitarbeiter kann beispielsweise seine Zeit zu 60 % im Bankraum, zu 25 % im Maschinenbereich und zu 15 % auf Montage verbringen. Die Prozentangaben der Mitarbeitertabelle beziehen sich auf dessen erfasste Gesamtzeit, nicht auf einen künstlich erzeugten Planbericht.

## Datenqualität

Nur abgeschlossene `TimeEntry`-Datensätze mit positiver Minutenanzahl werden berücksichtigt. Der Kalender speichert dieselben Arbeitseinträge; Wochen-JSON-Dateien sind keine zusätzliche Zeitquelle. Die Periodenzuordnung folgt dem Berliner Datum des Arbeitsbeginns. Laufende, zukünftige und außerhalb der Periode liegende Einträge werden ausgeschlossen.

Nicht zugeordnete Tätigkeiten erscheinen ausdrücklich. Für deren Aufnahme in Stellenstunden muss die Tätigkeit in der Einrichtung einer Kostenstelle zugeordnet und die geänderte Konfiguration für den Jahresbetrieb freigegeben werden. Bis dahin verwendet der Jahresbetrieb die bisherige veröffentlichte Zuordnung.

## Zeitanteiliger Vergleich

Der Jahresplan wird gleichmäßig über die Kalendertage des Abrechnungszeitraums verteilt. Der Vergleich berücksichtigt noch keinen persönlichen Urlaubs- oder Saisonkalender. Ein unterjähriges Ergebnis ist deshalb ein Indikator und kein automatisch erkannter Auslastungsplan.

Neue Berichte werden beim erneuten Laden des Managementbereichs oder mit **Aktualisieren** gelesen. Die Ansicht führt keine kontinuierliche Live-Abfrage aus.

## Beziehungen im Code

`operating/hours.management.jsx` stellt die Tabellen dar. `calculation/hours.mjs` erzeugt die Summen. `snapshots.js` kombiniert freigegebene Tätigkeitszuordnung und neue Berichte für die laufende Analyse.
