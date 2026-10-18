# 02 · Vermögen und Finanzierung

Hier werden vorhandene Werte zum Geschäftsjahresbeginn erfasst. Bestandswerte erzeugen keine neue Auszahlung und keine laufende Betriebskostenposition.

## Eröffnungsbestände

| Eingabe | Verwendung |
| --- | --- |
| Bank/Kasse | Liquider Bestand, auch ein negativer Kontostand ist möglich |
| Materiallager | Interner Materialbestand |
| Weitere Vermögenswerte | Zusätzliche Bestände außerhalb der einzeln erfassten Anlagen |
| Weitere Verbindlichkeiten | Verbindlichkeiten außerhalb der einzeln erfassten Darlehen |

Die vereinfachte Vermögensübersicht summiert Anlagenwerte, Material, Bank/Kasse und weitere Vermögenswerte. Darlehen und weitere Verbindlichkeiten bilden die Schulden. Die Differenz ist das rechnerische Eigenkapital. Diese Übersicht zeigt die eingerichtete Jahresanfangsbasis; sie ist keine laufend aus Geschäftsvorfällen fortgeschriebene Bilanz.

## Anlagen einzeln erfassen

| Feld | Wirkung |
| --- | --- |
| Kategorie | Standardmaschine, CNC, Fahrzeug, Gebäude oder Betriebsausstattung |
| Anschaffungswert und Datum | Historische Wertbasis und Nutzungsbeginn |
| Nutzungsdauer und Restwert | Begrenzen die lineare Abschreibung |
| Vergangene Nutzungsjahre | Optionaler manueller Wert; sonst aus dem Datum abgeleitet |
| Kostenstelle | Direkte Zuordnung; ohne Zuordnung gilt ein Verteilungsschlüssel |
| Wartung/Instandhaltung | Jährliche, bereits dieser Anlage zugehörige Planaufwendungen |
| Wiederbeschaffungswert | Alternative interne Abschreibungsbasis |
| Finanzierendes Darlehen | Zuordnung für die Methode Finanzierungskosten |

Summenpositionen dürfen bereits einzeln erfasste Anlagen nicht zusätzlich enthalten. Die Anlagenwerte sind ohne Umsatzsteuer zu erfassen. Bei einer Wiederbeschaffungsbasis verwendet die Vermögensübersicht weiterhin den historischen Wert abzüglich bisheriger Abschreibung.

## Abschreibung und Kapital

`Jahresabschreibung = (Abschreibungsbasis − Restwert) / Nutzungsdauer`.

120.000 € Anschaffung, 20.000 € Restwert und zehn Jahre ergeben 10.000 € pro Jahr. Unterjährige Anschaffungen und eine kürzere verbleibende Nutzungsdauer werden anteilig berücksichtigt. Abschreibungen enden am Restwert. Das durchschnittlich gebundene Kapital für die kalkulatorische Zinsmethode ist `(Basis + Restwert) / 2`.

## Darlehen und Zinsmethode

Darlehen werden als Restschuld zu Jahresbeginn erfasst. Name, Restschuld, Zinssatz und geplante Jahrestilgung gehören zur Position. **Tilgung ist keine Kostenposition.** Der jährliche Finanzierungszins wird aus Restschuld und Zinssatz berechnet; unterjährige Tilgungsverläufe werden derzeit nicht modelliert.

Für die Kostenrechnung wird eine Methode gewählt:

- **Kalkulatorische Zinsen:** Anlagenkapital × Zinssatz; Darlehenszinsen sind zusätzlich nur informatorisch sichtbar.
- **Finanzierungskosten:** Darlehenszinsen; bei mehreren Anlagen am selben Darlehen wird der Zins nach Kapitalanteilen geteilt.
- **Kein Zinsansatz:** kein automatischer Zins in den Kosten.

Eine zusätzliche manuelle Zinsposition blockiert die Vollkostenfreigabe. Bei Maschinen kann statt des berechneten kalkulatorischen Zinses ein begründeter Jahresbetrag in Schritt 06 eingegeben werden.

## Beziehungen im Code

`setup/steps/assets.jsx` verwendet unabhängige Anlage- und Restschuldfabriken. `calculation/assets.mjs` berechnet Abschreibung und Kapital; `calculation/accounting.mjs` übernimmt die Kosten einmalig in den BAB. Die einmalige Übernahme früherer Datenbankbestände erfolgt ausschließlich im Backend über `legacyInventory.js`.

Weiter: [Jährliche Betriebskosten](annual-costs.md).
