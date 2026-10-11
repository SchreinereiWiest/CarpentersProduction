# Management und Betriebskalkulation

Der Managementbereich unter `/Management` ist für Admins und Manager verfügbar. Er bildet die interne Kosten- und Leistungsrechnung des Unternehmens ab. Der Einstieg ist eine Betriebsübersicht. Eine beschriftete `ManagementBar` mit SVG-Icons führt durch sechs Bereiche.

| Bereich | Route | Inhalt |
|---|---|---|
| Übersicht | `/Management` | Erträge, Kosten, Ergebnis, Liquidität, offene Posten, Jahresverlauf und interne Vermögensübersicht |
| Belege & Geschäftsvorfälle | `/Management/Transactions` | Einnahmen, Ausgaben, neutrale Geldbewegungen, Zuordnung, Beleg- und Projektbezug sowie Zahlungen |
| Kostenrechnung | `/Management/CostAccounting` | Kostenarten, Kostenstellen, Bezugsgrößen, Hilfskostenstellen-Umlage, BAB mit Ergänzungen und CSV-Export |
| Kalkulationsgrundlagen | `/Management/Calculation` | Easy-Stundensätze, berechnete Leistungs- und Maschinenstundensätze, Zuschläge und interaktive Preisvorschau |
| Vermögen & Finanzierung | `/Management/Assets` | Anlagegüter, interne Abschreibung, Darlehen und Tilgungen |
| Einstellungen | `/Management/Settings` | Easy/Voll-Modus, Geschäftsjahr, Anfangsbestände, Gewinnaufschlag, Verteilungsschlüssel und Regeln |

`/Documents` öffnet denselben Belegeingang über den Dokumente-Eintrag der Sidebar.

## Einstieg im Easy-Modus

1. Unter **Einstellungen** das Geschäftsjahr und den Anfangsbestand von Bank und Kasse eintragen.
2. Unter **Kalkulationsgrundlagen** einen oder mehrere Leistungsbereiche und Netto-Stundensätze vor Gewinnaufschlag anlegen.
3. Stundensätze speichern. Die Preisvorschau kombiniert Stunden, zusätzliches Material und weitere Einzelkosten mit dem konfigurierten Gewinnaufschlag.
4. Optional Geschäftsvorfälle und Zahlungen erfassen, um die Betriebsübersicht aufzubauen.

Kostenstellen und BAB sind im Easy-Modus keine Voraussetzung. Der Wechsel zur Vollkalkulation erhält die vorhandenen Daten.

## Vollkalkulation einrichten

1. In den Einstellungen **Umfangreich · Vollkalkulation** wählen und speichern.
2. In der Kostenrechnung passende Bereiche auswählen, beispielsweise Werkstatt, Montage, Maschinen/CNC und Verwaltung. Eigene Kostenstellen können ergänzt werden.
3. Bezugsgrößen eintragen: produktive Jahresstunden, Fläche, Vollzeitäquivalente und gegebenenfalls eine monetäre Zuschlagsbasis. Der Stundenassistent berechnet eine Vorschau aus Kapazität, Arbeitstagen, Ausfalltagen und Produktivanteil. Seine Vorgaben sind veränderbare Planannahmen.
4. Kostenarten als Einzelkosten oder Gemeinkosten definieren. Festlegen, ob eine Kostenart im Vollstundensatz enthalten ist. Material ist standardmäßig ausgeschlossen und wird bei der Auftragskalkulation separat ergänzt.
5. Gemeinkosten direkt einer Stelle zuordnen oder einen Verteilungsschlüssel wählen. Hilfskostenstellen werden einstufig auf Haupt- und Maschinenkostenstellen umgelegt. Individuelle Gewichte können zum Beispiel Energieverbrauch oder Umsatzanteile abbilden.
6. Geschäftsvorfälle zuordnen. Der BAB entsteht aus den erfassten Kosten und Abschreibungen. Unter **BAB ergänzen** können zusätzliche positive oder negative interne Kostenwerte eingegeben werden. Diese Werte werden addiert und nach Ist/Plan getrennt gespeichert.
7. Das Modell speichern und unter **Kalkulationsgrundlagen** die abgeleiteten Sätze prüfen.

Änderungen an Kostenarten, Kostenstellen und BAB-Zellen werden sofort als **ungespeicherte Vorschau** gerechnet. Erst das Speichern übernimmt sie in das Betriebsmodell. Nicht zugeordnete Kosten und fehlende Bezugsgrößen werden angezeigt; bei fehlenden Stunden entsteht kein berechenbarer Satz.

## Rechenregeln

Das gemeinsame Modell in `shared/management.mjs` wird von Backend und Frontend verwendet. Die API liefert den maßgeblichen gespeicherten Snapshot einschließlich Berechnung; das Frontend nutzt dasselbe Modell für Vorschauen.

- Leistungsdatum bestimmt die wirtschaftliche Periode. Ist-Kosten und Erträge berücksichtigen den Stichtag; Planwerte umfassen das ausgewählte Geschäftsjahr. Beide Szenarien werden getrennt gerechnet.
- Kosten und Erträge sind netto. Umsatzsteueranteile dienen ausschließlich zur Ermittlung von Bruttozahlbetrag und offenen Posten.
- Liquidität ist Anfangsbestand plus tatsächliche Zahlungseingänge minus tatsächliche Zahlungsausgänge innerhalb des Geschäftsjahres bis zum Stichtag.
- Offene Posten sind Bruttorechnungsbetrag minus Zahlungen bis zum Stichtag. Unbezahlte Vorjahresrechnungen bleiben enthalten. Planwerte erzeugen keine Zahlungen oder offenen Posten.
- Geschäftsvorfälle mit Herkunft **Kalkulatorischer Wert** zählen als interne Kosten ohne Umsatzsteueranteil, offene Posten und Zahlungen.
- Bankzahlungen zu einer Rechnung werden am vorhandenen Geschäftsvorfall erfasst. Eine zweite Ausgabe für dieselbe Zahlung würde die Kosten verdoppeln.
- Anschaffung eines Anlageguts: Kauf und Zahlung als neutralen Geldabgang erfassen; das Anlagegut separat anlegen. Die lineare interne Abschreibung ab dem Anschaffungsmonat fließt automatisch in die Kostenrechnung ein und endet beim Restwert. Anschaffungskosten werden dadurch nicht zusätzlich als laufender Aufwand angesetzt.
- Darlehensauszahlung und Tilgungen werden atomar als neutrale, bezahlte Geldbewegungen erfasst. Zinsen als eigene Ausgabe mit Finanzierungskosten zuordnen; der gespeicherte Zinssatz ist informativ.
- Gemeinkosten werden proportional verteilt. Die Verteilung erfolgt in ganzen Cent; Rundungsreste gehen an die größten anteiligen Reste.
- Vollstundensatz = im Stundensatz enthaltene Stellenkosten nach Umlage / produktive Jahresstunden.
- Gemeinkostenzuschlag = Gemeinkosten / eingetragene Zuschlagsbasis × 100.
- Verkaufspreis = Selbstkosten × (1 + Gewinnaufschlag / 100). Stunden- und Zuschlagsmethode sind alternative Kalkulationswege; identische Kosten dürfen nur einmal angesetzt werden.
- Ist-Sätze enthalten keine automatische Hochrechnung auf Jahreskosten. Für zukünftige Preise vollständige Jahresplanwerte erfassen.

Die interne Vermögensübersicht enthält Anlagenbuchwerte, Bank/Kasse, Forderungen und ergänzte Vermögenswerte sowie Rechnungsverbindlichkeiten, Darlehen und ergänzte Verpflichtungen. Eigenkapital wird als Differenz berechnet. Lagerwerte und weitere Bestandsänderungen werden als zusätzliche Vermögenswerte gepflegt; sie werden nicht aus der Lagerverwaltung übernommen.

Als fachliche Orientierung dienen die [Stundensatzkalkulation der IHK Darmstadt](https://www.ihk.de/darmstadt/produktmarken/beraten-und-informieren/festigung-wachstum/kaufmaennisches/kalkulation-3795552) und die [Kostenrechnung im Handwerk der HWK Leipzig](https://www.hwk-leipzig.de/artikel/kostenrechnung-und-kalkulation-3%2C0%2C361.html).

## Belege und spätere Dokumenten-Anbindung

PDF/JPG bis 50 MB können als Betriebsbelege hochgeladen werden. Dateien werden in Garage unter `management/documents` gespeichert und erhalten die Kategorie `management-document`. Ihr Zugriff ist auf Admins/Manager beschränkt. Dateiverknüpfungen und Projektverknüpfungen sind echte Prisma-Beziehungen. Wird eine referenzierte Datei oder ein Projekt gelöscht, bleibt der Geschäftsvorfall erhalten und nur die Verknüpfung entfällt.

Der aktuelle Belegeingang liest keine Beträge aus Dokumenten. Ein Benutzer erfasst Leistungsdatum, Nettobetrag, Umsatzsteueranteil und Zuordnung. Nach dem Speichern werden Übersicht, BAB und Kalkulationssätze aus den Daten neu gerechnet. Die erste passende Zuordnungsregel ergänzt leere Felder; explizite Angaben bleiben erhalten. Gespeicherte Regeln können auch auf offene Zuordnungen vorhandener Ausgaben des Geschäftsjahres angewendet werden.

Ein späterer Import/OCR-Adapter kann denselben `POST /api/management/transactions`-Endpunkt mit `fileId`, `projectId` und einer stabilen, eindeutigen `sourceKey` verwenden. Die eindeutige Quellkennung verhindert eine doppelte Übernahme; Konflikte liefern `409`. `loan:` und `repayment:` sind interne, reservierte Quellpräfixe. Dokumentwerte müssen vom Adapter oder Benutzer validiert werden.

## Speicherung, Installation und Prüfung

`ManagementPeriod` speichert die Konfiguration mit einer Revision pro Geschäftsjahr. Geschäftsvorfälle, Zahlungen, Anlagen und Darlehen werden relational in PostgreSQL gespeichert. Geldwerte verwenden `Decimal`. Schreibvorgänge erfolgen in serialisierbaren Datenbanktransaktionen und schreiben Auditdaten. Die Revision schützt Einstellungen vor dem Überschreiben paralleler Änderungen. Geschäftsvorfälle und Anlagen verwenden ebenfalls Versionen. Gleichzeitige Zahlungen können den Gesamtrechnungsbetrag nicht überschreiten.

Die Migration `20261011160000_management_accounting` muss vor dem Backendstart in der gewünschten Anwendungsdatenbank angewendet werden:

```bash
cd Backend
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

Das gemeinsame Rechenmodell wird über den benannten Build-Kontext `shared` in beide Container kopiert. `docker compose build frontend backendjs` verwendet die konfigurierte Verknüpfung automatisch. Direkte Builds aus einem Unterverzeichnis benötigen `--build-context shared=../shared`. Der Frontend-Entwicklungscontainer bindet das Modell zusätzlich unter `/shared` ein.

```bash
cd Frontend
pnpm test
pnpm build
pnpm exec eslint src/pages/management src/components/managementBar.jsx

cd ../Backend
pnpm test:management
pnpm test:security
```

Die API-Integrationstests benötigen eine ausdrücklich konfigurierte lokale Wegwerf-Datenbank namens `management_test`; andere Datenbanken werden vom Test abgelehnt. Beispiel nach dem Anwenden der Migrationen auf dieser Datenbank:

```bash
MANAGEMENT_TEST_DATABASE_URL='postgresql://testuser@127.0.0.1:55439/management_test' pnpm test:management:api
```

Die Integrationsprüfung legt Testdaten an. Sie prüft Zugriffsrechte, Revisionen, Zuordnungsregeln, doppelte Quellkennungen, Teilzahlungen, Überzahlungsschutz einschließlich paralleler Requests, Planwerte, Anlagen und Darlehen. Die Rechenmodelltests decken unter anderem abweichende Geschäftsjahre, Cent-Verteilung, Umlagen, Abschreibungen und Vorjahresposten ab. Oberflächentests prüfen Einrichtung, Speichern und Vorschauen.
