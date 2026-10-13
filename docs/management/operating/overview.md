# Jahresbetrieb · Betriebsübersicht

Die Hauptseite verwendet die zuletzt freigegebene Jahresversion. Der gespeicherte Plan wird beim Öffnen nicht aus zwischenzeitlich veränderten Berichten oder Entwurfswerten neu kalkuliert.

## Kennzahlen

| Kennzahl | Grundlage |
| --- | --- |
| Jährliche Plankosten | Fixierter Freigabesnapshot |
| Erfasste Ist-Kosten | Kumulierte manuelle Ist-Summen sowie rechnerische Abschreibung/Zinsen |
| Arbeitsstunden | Abgeschlossene Kalenderberichte im Abrechnungszeitraum |
| Stunden zum zeitanteiligen Plan | Ist-Stunden relativ zum gleichmäßig zeitanteiligen Plan |

Fehlende Ist-Summen sind gekennzeichnet und werden nicht durch Jahresplanwerte ersetzt. Es handelt sich dann um eine unvollständige bisherige Kostenbasis. Ohne abgeschlossene Berichte bleiben die Ist-Stunden leer bzw. null; die eingerichteten Plansätze bleiben nutzbar.

## Sätze und Jahresplanung

Die Satztabelle zeigt Selbstkosten und den Satz mit Gewinnaufschlag. Easy verwendet die direkt freigegebenen Raten; Vollkosten die freigegebenen Stellenraten. Eine zusätzliche Tabelle vergleicht produktive Jahresplanstunden und bisherige Ist-Stunden je Hauptkostenstelle.

Vermögen, Verbindlichkeiten und rechnerisches Eigenkapital stammen aus der freigegebenen Jahresanfangsbasis. Eine laufende Bilanzfortschreibung oder Liquiditätsrechnung aus Belegen findet derzeit nicht statt.

## Aktualisierung und Konfiguration

**Aktualisieren** lädt neue Berichte und gespeicherte Änderungen. **Betrieb konfigurieren** öffnet die acht Schritte. Unveröffentlichte Entwurfsänderungen wirken nicht auf die Satztabelle. **Zur Jahresansicht** zeigt erneut den Jahresbetrieb.

## Beziehungen im Code

`operating/overview.management.jsx` liest `operatingPlan`, `operatingActual` und `operationalConfig` aus dem Layout-Kontext. Das Backend baut diese getrennten Daten in `snapshots.js` auf. Freigegebene Planwerte und aktuelle Ist-Felder werden deshalb nicht miteinander vermischt.
