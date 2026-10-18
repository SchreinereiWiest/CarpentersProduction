# Dokumente und CSV-Import

Dokumentablage und Kalkulationsimport haben unterschiedliche Aufgaben: Belege werden geschützt gesammelt; ein Import übernimmt ausdrücklich aufbereitete Bestände und Jahreskosten in den Einrichtungsentwurf.

## Belegeingang

Die Dokumentenseite bietet Upload, Öffnen und bestätigtes Entfernen. Zulässig sind PDF und JPG bis 50 MB. Der Upload verwendet `/api/files/management-document`; Dateien erhalten die Kategorie `management-document`. Referenzen und Dateizugriffe sind auf Admin- und Managerrollen beschränkt.

Eine Datei erzeugt keine Kostenposition und keinen Geschäftsvorfall. Ein Download öffnet eine kurzzeitig freigegebene URL in einem getrennten Browserfenster. Nach Upload oder Entfernung werden die Referenzen aktualisiert. Die bisherige Verknüpfung zu einer Vorfallmaske ist entfernt.

## Import starten

Schritt 01 bietet eine leere CSV-Vorlage. Eine ausgewählte Datei wird vollständig geprüft und als Vorschaukopie aufbereitet. **In Entwurf übernehmen** wählt diese Kopie aus. Erst **Entwurf speichern** sichert die Daten; eine Freigabe erfolgt separat in Schritt 08.

Unterstützt sind UTF-8-Dateien bis 2 MB, maximal 1.500 Datenzeilen, Semikolon oder Komma, zitierte Zellen und deutsche Beträge wie `120.000,00`. Eine inkonsistente Spaltenzahl, ungeschlossene Anführungszeichen, falsche Beträge oder unbekannte Zuordnungen stoppen den Import mit Zeilennummer. Es erfolgt keine teilweise Übernahme.

## Spalten

Pflichtspalten sind `bereich`, `position`, `wert`. Weitere unterstützte Spalten:

| Spalte | Verwendung |
| --- | --- |
| `kostenart` | Kostenart-ID oder vorhandene Bezeichnung bei Jahreskosten |
| `kostenstelle` | Vorhandene Kostenstellen-ID oder Bezeichnung |
| `anschaffungsdatum` | ISO-Datum `JJJJ-MM-TT` für Anlagen |
| `nutzungsdauer`, `restwert` | Abschreibungsgrundlage |
| `zinssatz` | Anlagen- oder Darlehenszins |
| `istwert` | Kumulierte Ist-Kosten derselben Jahreskostenposition |
| `wartung` | Jährliche direkt zur Anlage gehörige Planwartung |
| `wiederbeschaffungswert` | Alternative interne Abschreibungsbasis |
| `vergangene_jahre` | Optionaler manueller Nutzungsstand |
| `kennung` | Stabile Positions-ID für wiederholte Übernahme |

Kostenstellen müssen vor dem Import in Schritt 01 angelegt sein. Ohne Kennung wird der vorhandene Positionsname abgeglichen. Bei bekannter Kennung oder bekanntem Namen wird aktualisiert statt zusätzlich angelegt. Doppelte Positionen innerhalb derselben Datei werden abgelehnt.

## Bereiche und Werte

| Bereich | Bedeutung von `wert` |
| --- | --- |
| `maschine`, `cnc`, `fahrzeug`, `gebäude`, `ausstattung` | Historischer Anschaffungswert |
| `darlehen` / `finanzierung` | Restschuld; ein negativer Importwert wird als positive Schuld übernommen |
| `kosten` / `betriebskosten` | Jahresplanbetrag; optionaler `istwert` bleibt separat |
| `bilanz` / `bestand` | Bankguthaben, Materiallager, weitere Vermögenswerte oder weitere Verbindlichkeiten |

Kostenart-IDs sind beispielsweise `personnel`, `space`, `energy`, `insurance`, `vehicles`, `maintenance`, `administration` und `other`. Anlagen und laufende Kosten werden mit positiven Werten erfasst. Ein negativer Bankbestand ist zulässig.

## Beispiel

Die Kostenstelle `CNC` muss bereits existieren. Summenpositionen, die die CNC enthalten, dürfen nicht zusätzlich übernommen werden.

```csv
bereich;position;wert;kostenart;kostenstelle;anschaffungsdatum;nutzungsdauer;restwert
cnc;CNC-Bearbeitungszentrum;120.000,00;;CNC;2026-01-01;10;20.000,00
kosten;Miete und Gebäude;48.000,00;space;;;;
bilanz;Bankguthaben;35.000,00;;;;;
bilanz;Materiallager;45.000,00;;;;;
darlehen;Investitionsdarlehen;-140.000,00;;;;;
```

## DATEV und Grenzen

Es besteht noch keine direkte DATEV-Verbindung. Eine beliebige DATEV-Datei wird nicht automatisch erkannt oder einem Kontenrahmen zugeordnet. Bereits exportierte Daten müssen in das dokumentierte Format gebracht werden. Der Import übernimmt Positionen und Summen, keine steuerlichen Buchungen, Zahlungen oder offenen Posten.

## Beziehungen im Code

`documents/documentInbox.jsx` nutzt die geschützte Datei-API. `setup/import.panel.jsx` ruft `Engine/src/management/imports/csv.mjs` auf und übernimmt die geprüfte Kopie. Spalten-/Bereichsvorgaben liegen in `defaults/import.defaults.mjs`; Positionsstrukturen kommen aus denselben Defaultfabriken wie manuelle Eingaben.
