# 06 · Maschinenkostenrechnung

Standardmaschinen und CNC-Anlagen erhalten eine eigene Maschinenrechnung. Sie wird aus den in Schritt 02 erfassten Anlagen aufgebaut und ergänzt deren zugehörige Aufwendungen.

## Eingaben und automatische Werte

| Bestandteil | Quelle |
| --- | --- |
| Abschreibung | Anschaffungs-/Wiederbeschaffungsbasis, Nutzungsdauer und Restwert |
| Wartung und Reparatur | Jährliche Anlagenaufwendungen aus Schritt 02 |
| Kalkulatorische Zinsen | Durchschnittliches Kapital × Zinssatz oder manueller Jahreszins |
| Darlehenszins | Gewählte Finanzierungsmethode und Darlehenszuordnung |
| Strom/Betriebsmittel | Maschinenbezogener Jahresplanbetrag |
| Raumkosten | Bereits direkt zugeordneter Jahresplanbetrag |
| Sonstige Maschinenkosten | Weitere direkte Maschinenaufwendungen |
| Laufzeit | Manuelle verrechenbare Jahresstunden oder abgeleitete Tätigkeitsstunden |

Ein manueller kalkulatorischer Zinsbetrag ersetzt den aus Kapital und Zinssatz berechneten Betrag. Bei anderer Zinsmethode sind diese Eingaben deaktiviert. Die gewählte Methode verhindert einen zusätzlichen kalkulatorischen Zins neben Finanzierungskosten.

## Laufzeitbasis

Ein positiver manueller Laufzeitwert hat Vorrang. Bei `0` werden die gewählten Tätigkeiten bzw. die zugehörige Kostenstelle verwendet. Personalstunden sind nur dann eine sinnvolle Maschinenlaufzeit, wenn die Tätigkeit den tatsächlichen Maschinenbetrieb erfasst. Bei mehreren Maschinen im selben Bereich muss geprüft werden, ob eine gemeinsame Tätigkeitszeit für jede Maschine zutrifft; separate Laufzeiten oder Kostenstellen sind meist nachvollziehbarer.

Ohne positive Laufzeit und bei positiven Maschinenkosten bleibt der Satz leer; die Vollkostenfreigabe weist auf die fehlende Grundlage hin.

## Beispiel CNC

10.000 € Abschreibung + 2.000 € Zinsen + 5.000 € Wartung + 6.000 € Energie + 3.000 € Raumkosten ergeben 26.000 € jährlich. Bei 1.000 verrechenbaren Stunden beträgt der reine Satz **26,00 €/h**.

Dieser Satz enthält ausschließlich die dargestellten Maschinenkosten. Die Kosten stehen zugleich im BAB der zugeordneten Kostenstelle. Wird deren voller Stellenstundensatz verwendet, darf die reine Maschinenrate nicht zusätzlich für dieselben Kosten berechnet werden.

## Beziehungen im Code

`setup/steps/machines.jsx` zeigt die einzelne Maschine und bearbeitet ihre Eingaben. `calculation/assets.mjs` liefert Abschreibung/Kapital; `calculation/accounting.mjs` wählt Zinsen, Laufzeit und Maschinenrate und übernimmt Kosten einmalig in den BAB. Fahrzeug- und Gebäudeanlagen bleiben Bestandteil der Gesamtvermögens- und Kostenrechnung, erhalten hier jedoch keine Maschinenlaufzeitmaske.

Weiter: [BAB und Vollkostenkalkulation](bab.md).
