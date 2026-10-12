# Management und Betriebskalkulation

Der Managementbereich führt durch eine interne Jahreskalkulation. Er bildet Kosten, Vermögensbestände, Finanzierung, produktive Arbeitsstunden und Maschinenkosten ab. Die Eingaben dienen der Preisfindung und der betrieblichen Kosten- und Leistungsrechnung.

## Zwei Ansichten

Ohne freigegebene Jahreskalkulation öffnet `/Management` automatisch **Betrieb einrichten**. Die ManagementBar zeigt acht nummerierte Schritte mit SVG-Symbolen:

| Schritt | Bereich | Eingaben / Ergebnis |
| --- | --- | --- |
| 01 | Betrieb & Geschäftsjahr | Betriebsname, Startmonat, Easy oder Vollkosten, Kostenstellen |
| 02 | Vermögen & Finanzierung | Anlagen, Bestände, Restschulden, Abschreibung und Zinsmethode |
| 03 | Jährliche Betriebskosten | Kostenartenkatalog für Schreinereien, jährliche Planwerte |
| 04 | Mitarbeiter & Arbeitsstunden | Personal, Kapazität, Tätigkeitsgruppen und Plan-/Ist-Stunden |
| 05 | Kostenstellenverteilung | direkte Zuordnungen, Flächen, Verbrauch, Nutzung und eigene Schlüssel |
| 06 | Maschinenkostenrechnung | Standardmaschinen, CNC, Aufwendungen und verrechenbare Laufzeit |
| 07 | BAB & Vollkostenkalkulation | automatische Umlagen, Stellenstundensätze, CSV-Export oder Easy-Sätze |
| 08 | Prüfung & Freigabe | Plausibilitätsprüfung, Preissimulation und Kalkulationsversionen |

**Speichern & Weiter** sichert den Entwurf und öffnet den nächsten Schritt. Direkte Schrittwechsel behalten ungespeicherte Eingaben. **Entwurf speichern** speichert ohne Freigabe; **Änderungen verwerfen** setzt ungespeicherte Eingaben zurück. Geschäftsjahrwechsel und Aktualisierung sind bei ungespeicherten Eingaben gesperrt.

Nach **Freigeben & Jahresansicht öffnen** zeigt die Navigation:

- **Betriebsübersicht:** veröffentlichte Stundensätze, Plankosten, bisherige Ist-Kosten, Arbeitsstunden und Vermögensbasis.
- **Stunden & Produktivität:** Arbeitsstunden nach Mitarbeiter, Tätigkeit, Kostenstelle und Monat; Erfüllung des zeitanteiligen Plans.
- **Kostenstellen & Vergleich:** manuelle kumulierte Ist-Summen, Ist-BAB und Vorjahresdaten.

**Betrieb konfigurieren** öffnet die Einrichtung erneut. **Zur Jahresansicht** schaltet zurück. Eine gespeicherte Änderung im Entwurf verändert die veröffentlichte Planbasis erst nach einer neuen Freigabe.

Einzelne Geschäftsvorfälle und Zahlungen sind aus der Oberfläche entfernt. Der Dokumentenbereich sammelt weiterhin PDF/JPG-Dateien. Eine automatische Belegübernahme über DATEV ist noch nicht eingerichtet.

## Einfach starten

Im **Easy-Modus** genügen Betriebsname und mindestens ein positiver Selbstkostensatz in Schritt 07. Die übrigen Eingaben sind optional. Schritt 08 speichert auch diese einfache Kalkulation als Version. Ein Wechsel zur Vollkalkulation ist später über Schritt 01 möglich.

Für die Vollkalkulation schlägt Schritt 01 Bankraum, Standardmaschinen mit Zuschnitt/Bekantung, CNC, Montage und Verwaltung vor. Eigene Bereiche können ergänzt werden. Schritt 03 bietet einen Kostenartenkatalog mit Personal, Räumen, Energie, Versicherungen, Fahrzeugen, Wartung, Verwaltung und sonstigen Kosten.

## Vermögen, Abschreibung und Finanzierung

Anlagen werden einzeln erfasst. Eine Summenposition „Maschinen und Anlagen“ darf bereits enthaltene CNC-Anlagen nicht nochmals mitzählen. Bank/Kasse, Materialbestand und weitere Bestände werden separat angegeben.

Erfasst werden Anschaffungsdatum und -wert, Nutzungsdauer, Restwert, Kostenstelle und jährliche Wartung. Bereits vergangene Nutzungsjahre können aus dem Datum berechnet oder manuell angegeben werden. Der Wiederbeschaffungswert kann als interne Abschreibungsbasis gewählt werden; die Vermögensübersicht verwendet weiterhin den historischen Anschaffungswert abzüglich bisheriger Abschreibung.

Die lineare Jahresabschreibung lautet `(Basis − Restwert) / Nutzungsdauer`. Sie wird bei unterjähriger Anschaffung bzw. verbleibender Nutzungsdauer anteilig begrenzt. Beispiel: 120.000 € Basis, 20.000 € Restwert und zehn Jahre ergeben 10.000 € Jahresabschreibung.

Bestehende Darlehen sind **Restschulden zum Jahresbeginn**, keine neuen Auszahlungen. Geplante Tilgung ist keine Kostenposition. Die Finanzierungsübersicht zeigt den jährlichen Zins auf die erfasste Restschuld; unterjährige Veränderungen werden derzeit nicht als Darlehensplan modelliert.

Es wird genau eine Methode für die Kostenrechnung gewählt:

- **Kalkulatorische Zinsen:** durchschnittliches Anlagenkapital `(Basis + Restwert) / 2 × Zinssatz`. Ein begründeter jährlicher Zinsbetrag kann bei Maschinen alternativ manuell vorgegeben werden. Darlehenszinsen werden zusätzlich nur informatorisch angezeigt.
- **Finanzierungskosten:** Darlehenszinsen. Bei Zuordnung desselben Darlehens zu mehreren Anlagen wird der Zins nach deren Kapitalanteilen geteilt. Kalkulatorische Zinsen entfallen.
- **Kein Zinsansatz:** keine automatisch angesetzten Zinskosten.

Zusätzliche manuelle Zinspositionen blockieren die Vollkostenfreigabe, damit derselbe Zins nicht doppelt angesetzt wird.

## Personal, Tätigkeiten und Stunden

Die Tätigkeiten kommen aus den Firmeneinstellungen. Mehrere Tätigkeiten können einer Kostenstelle zugeordnet werden; dieselbe Tätigkeit darf nicht mehreren Kostenstellen gehören. Eigene Tätigkeiten aus bestehenden Zeitberichten erscheinen ebenfalls zur Zuordnung.

Vorhandene aktive Personalkonten lassen sich übernehmen. Neue manuelle Mitarbeiter sind möglich. Die Software berechnet die Werktage im gewählten Geschäftsjahr und übernimmt die tägliche Arbeitszeit abzüglich Pausen aus den Firmeneinstellungen. Feiertage, Urlaub, Krankheit, Schulung, Teilzeit und produktiver Anteil bleiben überprüfbare Eingaben.

Produktive Jahresstunden werden entweder direkt eingetragen oder berechnet:

`(Werktage − Feiertage − Urlaub − Krankheit − Schulung) × Tagesstunden × Vollzeitäquivalent × produktiver Anteil`.

Die Verteilung eines Mitarbeiters auf Kostenstellen muss 100 % ergeben, beispielsweise 60 % Bankraum, 25 % Maschinenbereich und 15 % Montage. Bei Übernahme der Personalkosten aus Mitarbeiterdaten werden die individuellen Jahreskosten nach diesen Anteilen verteilt. Diese Übernahme darf nur einmal vorkommen.

**Ist-Stunden** stammen aus abgeschlossenen `TimeEntry`-Datensätzen mit positivem Minutenwert. Die Wochenansicht des Kalenders speichert dieselben Berichte; deren zusätzliche JSON-Wochendateien werden nicht nochmals gezählt. Die Periodenzuordnung verwendet den Berliner Kalendertag des Arbeitsbeginns. Noch laufende, zukünftige und außerhalb des Geschäftsjahrs liegende Einträge werden ausgelassen.

Eine fehlende Tätigkeitszuordnung erscheint als „Ohne Zuordnung“. Planstunden erzeugen keine Ist-Berichte. Mit **Aktualisieren** werden neue Berichte aus der Datenbank geladen.

Die alternative Kalkulationsbasis **Vorhandene Zeitberichte** verwendet erfasste Stunden ohne Hochrechnung. Für eine Jahreskalkulation muss deren Zeitraum ein vollständiges Jahr abdecken. Ohne Berichte bleibt die manuelle Basis aktiv. Die Freigabe fixiert auch diese Stundenbasis.

## BAB und Maschinenkosten

Jede Kostenposition hat eine direkte Kostenstelle oder einen Verteilungsschlüssel. Verfügbar sind Stunden, Fläche, Vollzeitäquivalente, Gleichverteilung, Verbrauch, Nutzung und eigene Gewichte. Fehlende positive Gewichte führen zu nicht verteilten Kosten und blockieren die Vollkostenfreigabe. Centbeträge werden mit dem Verfahren des größten Rests verteilt.

Hilfskostenstellen werden einstufig auf Hauptkostenstellen umgelegt. Kostenarten können als Einzel- oder Gemeinkosten und als im Stundensatz enthalten bzw. zusätzlich kalkuliert eingestellt werden. Material ist standardmäßig nicht im Stundensatz enthalten.

Anlagenaufwendungen werden genau einmal in den BAB übernommen. Betriebskosten enthalten deshalb nur die verbleibenden jährlichen Kosten. Maschinenlaufzeit kann separat vorgegeben oder aus Tätigkeiten bzw. der Kostenstelle abgeleitet werden. Personalstunden sind nur dann Maschinenlaufzeit, wenn die Tätigkeit tatsächlich Maschinenbetrieb erfasst. Bei reinen Maschinenkostenstellen ist die Laufzeit der Nenner des Verrechnungssatzes; die Personalkostenverteilung verwendet weiterhin Arbeitsstunden.

Beispiel CNC:

| Bestandteil | Jahreskosten |
| --- | ---: |
| Abschreibung | 10.000 € |
| Kalkulatorischer Zins | 2.000 € |
| Wartung / Reparatur | 5.000 € |
| Strom / Betriebsmittel | 6.000 € |
| Raumkosten | 3.000 € |
| Gesamt | 26.000 € |

Bei 1.000 verrechenbaren Stunden ergibt das **26,00 €/h** reine Maschinenkosten. Diese Maschinenkosten sind Bestandteil der zugeordneten Kostenstelle und dürfen nicht zusätzlich zu deren vollem Stellenstundensatz gerechnet werden.

## Ist-Werte und Vorjahresvergleich

Jahresplan und kumulierte Ist-Kosten sind eigenständige Datenbasen. Leere Ist-Felder bedeuten fehlende Daten; null bedeutet einen geprüften Nullbetrag. Eine neue Ist-Summe ersetzt den zuvor gespeicherten Ist-Betrag derselben Position. Sie wird weder zum Jahresplan noch nochmals zum bisherigen Ist-Wert addiert.

Auch Wartung, Energie, Raum- und sonstige Maschinenkosten benötigen eigene Ist-Summen. Jahresplanaufwendungen werden nicht automatisch zu Ist-Aufwendungen. Interne Abschreibungen und der gewählte Zinsansatz werden rechnerisch zeitanteilig angesetzt. Fehlende Ist-Kosten werden kenntlich gemacht.

Der Vorjahresvergleich zeigt den gespeicherten Jahresplan und das gesamte Vorjahres-Ist. Das laufende Ist kann einen kürzeren Zeitraum abdecken; die Ansicht weist ausdrücklich darauf hin. Fehlende und unvollständige Vorjahresdaten werden gekennzeichnet. Beim Übernehmen der Vorjahresstruktur werden Ist-Felder geleert und manuell vorgegebene Nutzungsjahre erhöht; Eröffnungsbestände müssen neu geprüft und erfasst werden.

## CSV-Import

Schritt 01 bietet eine herunterladbare Vorlage. Der Import unterstützt UTF-8-CSV, Semikolon oder Komma, zitierte Zellen und deutsche Zahlen wie `120.000,00`. Maximal 2 MB bzw. 1.500 Datenzeilen. Fehler werden mit Zeilennummer angezeigt. Erst die geprüfte Vorschau wird mit **In Entwurf übernehmen** übernommen; danach wie üblich speichern und freigeben.

Erforderliche Spalten: `bereich`, `position`, `wert`.

| Bereich | Bedeutung von `wert` | Weitere Angaben |
| --- | --- | --- |
| `maschine`, `cnc`, `fahrzeug`, `gebäude`, `ausstattung` | Anschaffungswert | Anschaffungsdatum `JJJJ-MM-TT`, Nutzungsdauer, Restwert, Wartung, optional Wiederbeschaffungswert |
| `darlehen` | Restschuld, auch negativer Importbetrag möglich | Zinssatz, optional Kostenstelle |
| `kosten` | Jahresplanbetrag | Kostenart-ID oder Bezeichnung, Kostenstelle, optional kumulierter `istwert` |
| `bilanz` | Bestandswert | Position: Bankguthaben, Materiallager, Weitere Vermögenswerte oder Weitere Verbindlichkeiten |

Optionale Spalten: `kostenart`, `kostenstelle`, `anschaffungsdatum`, `nutzungsdauer`, `restwert`, `zinssatz`, `istwert`, `wartung`, `wiederbeschaffungswert`, `vergangene_jahre`, `kennung`.

Eine bekannte Kennung aktualisiert die Position; ohne Kennung wird der Positionsname abgeglichen. Wiederholter Import derselben Daten erzeugt dadurch keine zusätzlichen Positionen. Kostenstellen vorab in Schritt 01 anlegen. Kostenart-IDs sind beispielsweise `personnel`, `space`, `energy`, `insurance`, `vehicles`, `maintenance`, `administration` und `other`. Der Import benötigt passende CSV-Daten; beliebige DATEV-Dateien werden nicht automatisch erkannt.

```csv
bereich;position;wert;kostenart;kostenstelle;anschaffungsdatum;nutzungsdauer;restwert
cnc;CNC-Bearbeitungszentrum;120.000,00;;CNC;2026-01-01;10;20.000,00
kosten;Miete und Gebäude;48.000,00;space;;;;
bilanz;Bankguthaben;35.000,00;;;;;
bilanz;Materiallager;45.000,00;;;;;
darlehen;Investitionsdarlehen;-140.000,00;;;;;
```

## Speicherung und Entwicklung

Die Einrichtung und Freigabesnapshots liegen je Jahr in `ManagementPeriod.config.setup`. Der Server schützt die Freigabehistorie gegen clientseitige Änderungen. Jede Freigabe speichert Zeitpunkt, Benutzer, Versionsnotiz, Eingaben, BAB und berechnete Sätze. Revisionen verhindern das Überschreiben zwischenzeitlicher Änderungen. Es ist für diesen Umbau keine zusätzliche Datenbankmigration nötig, sofern die vorhandene Managementmigration bereits angewendet wurde.

Bestehende Anlagen und Darlehen werden bei der ersten Einrichtung übernommen. Die bisherigen Geschäftsvorfalltabellen und deren API bleiben zur Datenkompatibilität vorhanden; die neue Kalkulation verwendet diese Vorfälle nicht. Alte Frontend-Links werden auf die neuen Bereiche weitergeleitet.

Frontend und Backend verwenden das gemeinsame Rechenmodell in `shared/managementSetup.mjs`. Die bestehenden Docker-Kontexte und Mounts für `shared` bleiben erforderlich.

Prüfungen:

```bash
cd Frontend
pnpm test
pnpm build
pnpm exec eslint src/pages/management src/components/managementBar.jsx
```

```bash
cd Backend
node test/management.model.test.js
node test/management.setup.test.js
MANAGEMENT_TEST_DATABASE_URL=postgresql://user:password@127.0.0.1:55439/management_test node test/management.api.test.js
```

Die API-Tests erlauben ausschließlich eine ausdrücklich angegebene lokale Datenbank `management_test` und setzen deren Testdaten zurück.
