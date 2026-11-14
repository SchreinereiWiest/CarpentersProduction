# Management-API

Alle Routen unter `/api/management` erfordern `business-management` sowie eine Admin- oder Managerrolle. Schreibvorgänge laufen mandantenbezogen in einer serialisierbaren Transaktion und erzeugen einen Audit-Eintrag.

## Arbeitsbereich

| Methode | Pfad | Zweck |
| --- | --- | --- |
| GET | `/workspace?year=2026` | Mitarbeitende, Projekte, Zuweisungen, Board- und Roadmapdaten, Zeit-/Urlaubssummen, Jahresziele und Stundensatzstand laden |
| POST | `/assignments` | Projekt mit `{projectId, assigneeId, info}` zuweisen oder Info aktualisieren |
| DELETE | `/assignments/:id` | Zuweisung entfernen |
| POST | `/assignments/:id/calendar` | Ganztägigen Produktionszeitraum mit `{startAt, endAt, allDay}` anlegen oder aktualisieren |
| PUT | `/projects/:projectId/stage` | Zusätzlichen Management-Status mit `{stageId, position}` speichern |
| PUT | `/projects/:projectId/schedule` | Gantt-Planzeilen und -balken mit `{rows}` speichern; Gesamtzeitraum wird abgeleitet |
| POST | `/projects/:projectId/schedule/calendar` | Gantt-Plan samt Gesamtzeitraum als verknüpften Kalendereintrag mit `{rows, calendarType, startAt, endAt}` anlegen oder aktualisieren |
| DELETE | `/projects/:projectId/schedule` | Vorläufigen Roadmap-Zeitraum entfernen |
| PUT | `/employees/:userId/profile` | Urlaubstage und Jahresgehalt mit `{vacationDays, annualSalary}` speichern |

## Jahresziele

| Methode | Pfad | Zweck |
| --- | --- | --- |
| POST | `/goals?year=2026` | Soll-Ziel anlegen |
| PUT | `/goals/:id?year=2026` | Ziel oder abschließenden Istwert aktualisieren |
| DELETE | `/goals/:id` | Ziel samt Zwischenständen löschen |
| POST | `/goals/:id/checkpoints` | Datierten Zwischenstand anlegen |
| DELETE | `/goals/:id/checkpoints/:checkpointId` | Zwischenstand löschen |

Zielwerte sind Dezimalzahlen. `typeLabel` und `unit` werden beim Erstellen mitgespeichert, damit spätere Änderungen der Firmeneinstellungen historische Vergleiche nicht umbenennen.

## Stundensätze

`PUT /rates?year=2026` akzeptiert `activities`, `overheadCosts` und `profitPercent`. Der Server normalisiert und berechnet alle Sätze erneut. Das Ergebnis wird als `rateCalculation` in der `ManagementPeriod` gespeichert. Der Projektendpunkt `/api/projects/calculation-context/:id` stellt diese Sätze als Management-Kostenstellen bereit.

Die Oberfläche kann produktive Jahresstunden und Personalkosten aus Zeitbuchungen und Mitarbeiterprofilen vorbelegen. Das Jahresgehalt eines Mitarbeiters wird proportional zu seinen produktiven Stunden auf die konfigurierten Kostenstellen verteilt. Der Anteil einer Kostenstelle an sämtlichen produktiven Stunden bildet zugleich den Schlüssel für die Gemeinkostenverteilung. Maschinenkosten, Maschinenstunden, sonstige direkte Kosten und Maschinenanteil bleiben manuelle Kalkulationswerte.

Die Projektplanung speichert bei `PUT /projects/:projectId/schedule` nun bevorzugt `{rows}`. Jede Zeile enthält `id`, `label` und beliebig viele Balken mit `id`, `start` und `end`. `plannedStart` und `plannedEnd` werden serverseitig aus dem frühesten beziehungsweise spätesten Balken abgeleitet. Das alte Datumsformat bleibt als Übergang kompatibel.

Die Kalenderübertragung akzeptiert die Typen `project`, `measurement`, `planning`, `manufacturing`, `installation` und `appointment`. Sie speichert die aktuellen Gantt-Zeilen mit und aktualisiert bei erneuter Übertragung denselben Kalendereintrag. Beim Löschen der Projektplanung wird auch dieser verknüpfte Eintrag entfernt.

`POST /api/calendar/company-days/sync` ersetzt die automatisch aus Arbeitszeit-Sonderregeln erzeugten Einträge eines Kalenderjahres. Manuell im Kalender angelegte Termine vom Typ `company-closed` bleiben erhalten.

Die früheren Snapshot-, Entwurfs- und Freigaberouten bleiben vorerst für vorhandene Installationen lesbar, werden von der neuen Managementoberfläche aber nicht mehr verwendet.
