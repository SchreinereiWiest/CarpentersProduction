# 07 · BAB und Vollkostenkalkulation

Der Betriebsabrechnungsbogen entsteht automatisch aus Jahreskosten, Anlagenaufwendungen, Personalverteilung und Umlageschlüsseln. Hier wird das Ergebnis nachvollzogen; es gibt keine zweite manuelle BAB-Kostenerfassung.

## Tabellen lesen

| Anzeige | Bedeutung |
| --- | --- |
| Kostenart | Zusammengefasste Positionen derselben Kostenart |
| Gesamt | Der einmalig erfasste Betrag vor Verteilung |
| Kostenstellenspalten | Beträge nach direkter Zuordnung und Hilfskostenstellenumlage |
| Nicht verteilt | Fehlende oder unwirksame Zuordnungen |
| Stellenkosten nach Umlage | Summe aller der Kostenstelle zugehörigen Beträge |
| Produktive Stunden | Gewählte Arbeits- bzw. Maschinenstundenbasis |
| Vollstundensatz | Im Satz enthaltene Kosten geteilt durch die Stundenbasis |

Für Hilfskostenstellen erscheint **Umgelegt** statt eines eigenen Leistungssatzes. Die ergänzende Umlagetabelle zeigt Kosten vor Umlage, die positive/negative Umlage und die Kosten danach. Ein unveränderter Gesamtbetrag macht sichtbar, dass die Umlage keine zusätzlichen Kosten erzeugt.

`Vollstundensatz = stundenrelevante Stellenkosten / produktive Stunden`.

Die Summe aller Stellenkosten und der nicht verteilten Kosten entspricht der Kostenbasis. Kostenarten, die vom Stundensatz ausgeschlossen sind, bleiben im BAB sichtbar und werden separat kalkuliert. Material ist standardmäßig eine solche Einzelkostenart.

## Easy-Sätze

Im Easy-Modus werden Leistungsbereich und Selbstkosten pro Stunde direkt eingegeben. Mindestens eine positive Rate ist für die Freigabe erforderlich. Es ist kein ausgefüllter BAB notwendig. Ein Gewinnaufschlag kann für beide Modi angegeben werden.

## Planexport

**BAB als CSV exportieren** liefert Kostenarten, Gesamtsummen, Zuordnungslücken, Stellenkosten und Selbstkostensätze in deutscher Zahlenschreibweise. Eine ungespeicherte Vorschau ist in Kopfzeile und Dateiname gekennzeichnet. Der Export veröffentlicht keine neue Version und verändert keine Daten.

Bezeichnungen werden CSV-sicher maskiert; mögliche Tabellenformeln in Texteingaben werden als Text exportiert.

## Beziehungen im Code

`setup/steps/bab.management.jsx` verwendet die gemeinsame `components/babTable.jsx`. Dieselbe Tabelle stellt die Ist-Rechnung im Jahresbetrieb dar. `utils/csvExport.js` bereitet die Planzeilen vor, `utils/fileDownload.js` führt den Browserdownload aus. Berechnet wird ausschließlich in `shared/management/calculation/accounting.mjs`.

Weiter: [Prüfung und Freigabe](review.md).
