# 01 · Betrieb und Geschäftsjahr

Dieser Schritt legt die gemeinsame Jahresbasis fest. Kosten und Stunden müssen denselben Abrechnungszeitraum verwenden, damit daraus vergleichbare Sätze entstehen.

## Felder und Bedienung

| Feld / Aktion | Bedeutung |
| --- | --- |
| Betriebsname | Bezeichnung in der Betriebsübersicht; für die Freigabe erforderlich |
| Beginn des Geschäftsjahrs | Startmonat eines zwölfmonatigen Zeitraums |
| Umfang | Automatische Vollkostenkalkulation oder direkte Easy-Sätze |
| Betriebsbereiche vorschlagen | Ergänzt die typischen Kostenstellen, ohne bestehende IDs nochmals anzulegen |
| Kostenstelle | Eigene Bezeichnung eines Betriebsbereichs |
| Bereichstyp | Fertigung/Leistung, Maschinenbereich oder Hilfskostenstelle |
| Fläche | Grundlage für die Verteilung der verbleibenden Raumkosten |

Das Geschäftsjahr `2026` mit Startmonat April reicht vom 1. April 2026 bis zum 31. März 2027. Der Server lehnt Überschneidungen mit bereits gespeicherten Geschäftsjahren ab. Das Jahr wird im Kopf der Ansicht ausgewählt; das Startjahr und der Startmonat dürfen nicht verwechselt werden.

## Vorbelegte Betriebsbereiche

Bankraum, Standardmaschinen mit Zuschnitt/Bekantung, CNC, Montage und Verwaltung sind Vorschläge. Die Standardbereiche haben stabile IDs; wiederholtes Ergänzen erzeugt keine Duplikate. Nur tatsächlich im Firmenkatalog vorhandene Tätigkeits-IDs werden übernommen. Weitere Tätigkeiten und gemeinsame Gruppen werden in Schritt 04 zugeordnet.

Eine **Hilfskostenstelle** wird im BAB auf die Hauptkostenstellen umgelegt. Eine **Maschinenkostenstelle** verwendet bei zugehörigen Maschinen deren verrechenbare Laufzeit als Nenner des Satzes. Personalkosten werden weiterhin nach Arbeitsstunden verteilt.

## Vorjahr übernehmen

Wenn Daten aus dem vorherigen Jahr vorhanden sind, kann dessen Struktur kopiert werden. Kostenstellen, Personalkapazität, Kostenpositionen und Anlagen werden übernommen. Ist-Summen werden geleert, manuell vorgegebene Nutzungsjahre um ein Jahr erhöht und liquide bzw. weitere Eröffnungsbestände zurückgesetzt. Restschulden und Materialbestände sind anschließend zu überprüfen; sie werden nicht aus nicht vorhandenen Buchungen fortgeschrieben.

## Kostenstelle entfernen

Im Entwurf werden Personalanteile, direkte Anlagen-/Darlehens-/Kostenverknüpfungen und Schlüsselgewichte bereinigt. Frei gewordene Kosten benötigen anschließend eine neue Zuordnung. Freigegebene Versionen behalten ihre ursprünglichen Kostenstellen.

## Beziehungen im Code

`setup/steps/business.management.jsx` verwendet die Formularfabriken in `defaults/forms.defaults.js`. Die gemeinsame Jahresstruktur steht in `shared/management/defaults/config.defaults.mjs`; Zeiträume berechnet `utils/dates.mjs`. Der Schritt verändert den vom Layout gehaltenen Entwurf. **Speichern & Weiter** übermittelt ihn mit Revision an die Konfigurations-API.

Weiter: [Vermögen und Finanzierung](assets.md).
