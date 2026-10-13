# Jahresbetrieb · Kostenstellen und Vorjahresvergleich

Bis zur späteren Beleganbindung erfasst diese Ansicht kumulierte Ist-Beträge. Sie erzeugt daraus einen Ist-BAB mit derselben veröffentlichten Kostenstellenstruktur.

## Kumulierte Summen erfassen

Für jede freigegebene Kostenposition werden Jahresplan und bisherige Ist-Summe angezeigt. Das Ist-Feld erwartet den gesamten bisher bekannten Betrag, nicht nur die letzte Rechnung. Ein neuer Wert ersetzt den bisherigen Wert.

Beispiel: Jahresplan Miete 48.000 €, bisher erfasste Ist-Miete 8.000 €. Nach dem nächsten Zeitraum werden 12.000 € eingetragen. Die Ist-Rechnung verwendet 12.000 €, nicht 20.000 € und nicht 60.000 €.

Leere Felder bedeuten fehlende Daten. Bei ausdrücklich geprüften null Kosten ist `0` einzutragen. Die Ansicht kennzeichnet fehlende Positionen; ein unvollständiger Ist-BAB soll nicht als vollständige Jahresrechnung interpretiert werden.

## Anlagenaufwendungen

Wartung, Energie, zugeordnete Raumkosten und sonstige Maschinenkosten besitzen eigene Ist-Felder. Beträge, die hier einer Anlage zugeordnet werden, dürfen nicht zusätzlich in den allgemeinen Betriebskosten stehen. Jahresplanaufwendungen werden nicht automatisch in die Ist-Rechnung kopiert.

Interne Abschreibungen und der gewählte Zinsansatz werden rechnerisch zeitanteilig berücksichtigt. Der Zins auf Restschulden ist eine vereinfachte Abgrenzung der eingerichteten Basis; tatsächliche unterjährige Finanzierungsbewegungen werden nicht aus Buchungen importiert.

## Vorjahresvergleich

Die Tabelle vergleicht aktuellen Jahresplan, Vorjahresplan, aktuelles bisheriges Ist und das gesamte Vorjahres-Ist. Die unterschiedlichen Zeiträume werden ausdrücklich benannt. Fehlende Vorjahresdaten bleiben als **Keine Daten** sichtbar. Auch unvollständige Vorjahres-Ist-Summen werden gekennzeichnet.

Kostenstellen werden zunächst nach stabiler ID abgeglichen; übereinstimmende Bezeichnungen können als Fallback dienen. Umbenennungen und strukturelle Änderungen sollten vor einem fachlichen Vergleich geprüft werden. Die Ist-Differenz ist ein absoluter Unterschied und keine automatische Hochrechnung.

## Beziehungen im Code

`operating/operatingCosts.management.jsx` schreibt ausschließlich Ist-Felder mit der aktuellen Jahresrevision. `snapshots.js` liest Ist-Felder aus dem aktuellen Entwurf und verwendet für Berechnungsregeln die freigegebenen Eingaben. `components/babTable.jsx` zeigt den resultierenden Ist-BAB. Eine neue Plansatzfreigabe ist für eine bloße Ist-Summenänderung nicht erforderlich.
