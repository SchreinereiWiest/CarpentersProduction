# 03 · Jährliche Betriebskosten

Hier werden die verbleibenden jährlich erwarteten Kosten erfasst. Aufwendungen, die bereits einer Anlage zugeordnet wurden, dürfen nicht zusätzlich als allgemeine Betriebskosten eingetragen werden.

## Kostenartenkatalog

**Schreinerei-Katalog übernehmen** ergänzt Personal inklusive Arbeitgeberanteile, Miete/Gebäude, Energie, Versicherungen, Fahrzeuge, Wartung, Büro/IT und sonstige Gemeinkosten. Bereits vertretene Kostenarten werden nicht nochmals ergänzt. Jahresbeträge starten bei null; es werden keine fiktiven Beispielbeträge übernommen.

| Eingabe | Verwendung |
| --- | --- |
| Kostenposition | Verständliche Bezeichnung für Planung und spätere Ist-Summen |
| Kostenart | Zuordnung zur Kostenartenrechnung |
| Jahresplan | Vollständiger erwarteter Jahresbetrag |
| Personalkostenquelle | Manueller Jahresbetrag oder Summe aus Mitarbeiterdaten |

Weitere Positionen können mit **+ Kostenposition** angelegt werden. Mehrere Positionen derselben Kostenart sind möglich, etwa verschiedene Versicherungen oder Mietverträge.

## Personal aus Mitarbeiterdaten

Wird die Quelle **Aus Mitarbeiterdaten** gewählt, kommt die Summe aus den jährlichen Mitarbeiterkosten in Schritt 04. Ohne ausdrückliche direkte Kostenstelle werden die individuellen Jahreskosten jedes Mitarbeiters nach dessen Tätigkeitsanteilen verteilt. Unterschiedliche Personalkosten werden deshalb nicht zu einem fiktiven einheitlichen Personalsatz zusammengefasst.

Diese Übernahme darf im Jahresmodell nur einmal vorkommen. Zusätzliche manuelle Personalpositionen sind nur dann sinnvoll, wenn sie nicht bereits in den Mitarbeiterbeträgen enthalten sind. Ein ausdrücklich direkt zugeordneter Gesamtbetrag folgt dieser direkten Zuordnung.

## Plan und Ist

Der Jahresplan bleibt eine eigenständige Basis. In der Jahresansicht werden später kumulierte Ist-Summen derselben Positionen eingetragen. Leere Ist-Werte bedeuten fehlende Daten, `0` einen bestätigten Nullbetrag. Ein Ist-Betrag ersetzt die vorherige Ist-Summe; weder der Planwert noch die alte Summe werden zusätzlich gerechnet.

Die Gesamtkostenanzeige enthält auch Anlagenabschreibung und den gewählten Zinsansatz. Eine noch fehlende Verteilung verändert den Gesamtbetrag nicht, erscheint aber als Zuordnungslücke im BAB.

## Beziehungen im Code

`setup/steps/annualCosts.management.jsx` verwendet `ANNUAL_COST_CATALOG` und `newAnnualCost`. Gemeinsame Startwerte liegen in `shared/management/defaults/forms.defaults.mjs`. Verteilung und Stundensätze folgen in `calculation/accounting.mjs`; Ist-Felder werden in der Jahresansicht erfasst.

Weiter: [Mitarbeiter und Arbeitsstunden](hours.md).
