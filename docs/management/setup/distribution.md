# 05 · Kostenstellenverteilung

Hier wird festgelegt, welcher Bereich eine Kostenposition trägt. Die Zuordnung muss fachlich begründbar und vollständig sein, damit der BAB belastbare Stellenkosten ergibt.

## Direkte Zuordnung und Schlüssel

Eine Kostenposition hat entweder eine direkte Kostenstelle oder einen Verteilungsschlüssel. Bei direkter Zuordnung ist die Schlüsselauswahl deaktiviert. Personalkosten aus Mitarbeiterdaten nutzen im Plan deren individuelle Tätigkeitsverteilung; der Schlüssel wird dort nicht frei überschrieben.

| Schlüssel | Bezugsgröße | Typische Verwendung |
| --- | --- | --- |
| Stunden | Geplante bzw. erfasste Arbeitsstunden | Verbleibende Personal-/Gemeinkosten |
| Fläche | Genutzte Fläche je Bereich | Miete, allgemeine Gebäudeaufwendungen |
| Vollzeitäquivalente | Personalanteile je Bereich | Mitarbeiterbezogene Gemeinkosten |
| Energieverbrauch | Messwert oder vergleichbares Gewicht | Allgemeine Energiekosten |
| Fahrzeugnutzung | Nutzungswert oder vergleichbares Gewicht | Fahrzeug-/Transportgemeinkosten |
| Gleichmäßig | Gleicher Anteil je beteiligtem Bereich | Begründete pauschale Verteilung |
| Eigener Schlüssel | Freie positive Gewichte | Besondere betriebliche Umlagen |

Absolute Messwerte und relative Gewichte sind möglich, solange innerhalb eines Schlüssels dieselbe Bezugsgröße verwendet wird. Ein Wert null nimmt einen Bereich aus dieser Verteilung heraus.

## Hilfskostenstellen

Verwaltung und andere Hilfsbereiche können zunächst Kosten erhalten. Ihr Umlageschlüssel verteilt diese Kosten anschließend einstufig auf die Hauptkostenstellen. Die Ansicht in Schritt 07 zeigt Kosten vor Umlage, Umlagebetrag und verbleibende Kosten danach.

Kosten werden nicht nochmals als neue Position hinzugefügt. Der größte-Rest-Algorithmus verteilt ganze Cent und erhält den Gesamtbetrag. Fehlen positive Gewichte, verbleiben die Kosten als nicht verteilt; eine Vollkostenfreigabe ist dann gesperrt.

## Kostenarten im Stundensatz

Kostenarten können als Einzel- oder Gemeinkosten behandelt werden. Mit **Im Stundensatz enthalten** wird bestimmt, welche Kosten über Stunden verrechnet werden. Material ist standardmäßig ausgeschlossen und wird in der Preissimulation zusätzlich erfasst. Eine Änderung gilt für alle Positionen dieser Kostenart im gewählten Jahresmodell.

## Maschinen und direkte Anlagenkosten

Abschreibung, Wartung und andere ausdrücklich bei einer Anlage erfasste Aufwendungen gehören direkt zur gewählten Kostenstelle. Deren Beträge dürfen nicht zusätzlich in den allgemeinen Betriebskosten enthalten sein. Arbeitsstunden bleiben der Schlüssel für Personal; reine Maschinenbereiche können eine abweichende Laufzeitbasis für ihren Verrechnungssatz haben.

## Beziehungen im Code

`setup/steps/distribution.management.jsx` bearbeitet Bezugsgrößen und Zuordnungen. `calculation/distribution.mjs` verteilt Centbeträge; `calculation/accounting.mjs` erzeugt Zeilen, Umlagen und Raten. `config/approval.mjs` verhindert eine Freigabe bei offenen Verteilungslücken.

Weiter: [Maschinenkostenrechnung](machines.md).
