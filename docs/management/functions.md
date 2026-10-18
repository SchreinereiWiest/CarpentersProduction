# Funktionsreferenz

Die Referenz beschreibt die benannten Managementfunktionen und ihre Beziehungen. Kleine Formular-, Mapping- und Ereignis-Callbacks werden bei der übergeordneten Funktion erläutert. Die Funktionskommentare stehen unmittelbar im Quellcode.

## Frontend

| Funktion | Datei | Verantwortung |
| --- | --- | --- |
| `BabTable` | `Frontend/src/features/management/components/babTable.jsx` | Zeigt Kostenarten, Umlagen, verbleibende Zuordnungslücken und Stundenbasis für einen Plan- oder Ist-BAB. |
| `Button` | `Frontend/src/features/management/components/ui.jsx` | Rendert eine einheitliche Aktion mit deaktiviertem Zustand und optionalem Neben- oder Löschstil. |
| `Field` | `Frontend/src/features/management/components/ui.jsx` | Verbindet Feldbezeichnung, Eingabeelement und optionalen erklärenden Hinweis. |
| `Input` | `Frontend/src/features/management/components/ui.jsx` | Rendert ein beschriftetes Eingabefeld mit gemeinsamen Vorgaben und optionaler numerischer Schrittweite. |
| `Select` | `Frontend/src/features/management/components/ui.jsx` | Rendert eine beschriftete Auswahlliste mit der gemeinsamen Managementgestaltung. |
| `Card` | `Frontend/src/features/management/components/ui.jsx` | Gruppiert zusammengehörige Eingaben oder Ergebnisse mit optionaler Überschrift und Aktionen. |
| `Empty` | `Frontend/src/features/management/components/ui.jsx` | Zeigt einen verständlichen Hinweis, wenn eine Liste noch keine Einträge enthält. |
| `Notice` | `Frontend/src/features/management/components/ui.jsx` | Kennzeichnet Erläuterungen oder fachliche Warnungen in der Ansicht. |
| `Modal` | `Frontend/src/features/management/components/ui.jsx` | Zeigt einen Dialog mit Fokusübernahme, Fokusbegrenzung und Schließen per Escape. |
| `keyDown` | `Frontend/src/features/management/components/ui.jsx` | Behandelt Escape und Tab, damit der Fokus im geöffneten Dialog bleibt. |
| `ConfirmButton` | `Frontend/src/features/management/components/ui.jsx` | Fordert vor dem Entfernen eines Dokuments eine ausdrückliche Bestätigung an. |
| `Table` | `Frontend/src/features/management/components/ui.jsx` | Rendert eine horizontal scrollbar angelegte Tabelle mit konsistenten Kopf- und Datenzellen. |
| `newAsset` | `Frontend/src/features/management/defaults/forms.defaults.js` | Erstellt eine neue Anlage mit Browser-ID und Jahresbeginn als überprüfbarem Anschaffungsdatum. |
| `newCenter` | `Frontend/src/features/management/defaults/forms.defaults.js` | Erstellt einen neuen betrieblichen Bereich mit unabhängigen Tätigkeiten und Gewichten. |
| `newLoan` | `Frontend/src/features/management/defaults/forms.defaults.js` | Erstellt eine Restschuldposition, ohne daraus einen Geschäftsvorfall abzuleiten. |
| `newAnnualCost` | `Frontend/src/features/management/defaults/forms.defaults.js` | Erstellt eine Jahreskostenposition; Katalogwerte werden als ausdrückliche Überschreibungen übergeben. |
| `newEasyRate` | `Frontend/src/features/management/defaults/forms.defaults.js` | Erstellt einen noch auszufüllenden Easy-Stundensatz. |
| `newDistributionKey` | `Frontend/src/features/management/defaults/forms.defaults.js` | Erstellt einen eigenen Verteilungsschlüssel mit leeren Gewichten. |
| `newStaff` | `Frontend/src/features/management/defaults/forms.defaults.js` | Leitet Jahreswerktage und Netto-Tagesstunden aus Geschäftsjahr und Firmeneinstellungen ab. |
| `suggestedCenters` | `Frontend/src/features/management/defaults/forms.defaults.js` | Schlägt typische Bereiche vor und filtert Tätigkeits-IDs auf den vorhandenen Firmenkatalog. |
| `DocumentInbox` | `Frontend/src/features/management/documents/documentInbox.jsx` | Lädt Betriebsbelege hoch, öffnet geschützte Downloads und entfernt Dateien nach Bestätigung; daraus werden keine Kosten gebucht. |
| `upload` | `Frontend/src/features/management/documents/documentInbox.jsx` | Prüft Typ und Größe einer Belegdatei, lädt sie hoch und aktualisiert den geschützten Belegeingang. |
| `download` | `Frontend/src/features/management/documents/documentInbox.jsx` | Öffnet eine vom Backend freigegebene Download-URL in einem getrennten Browserfenster. |
| `remove` | `Frontend/src/features/management/documents/documentInbox.jsx` | Entfernt die gewählte Belegdatei über die geschützte Datei-API und aktualisiert die Referenzen. |
| `ManagementDocuments` | `Frontend/src/features/management/documents/documents.jsx` | Zeigt die Betriebsdokumentenablage ohne die entfernte Erfassung einzelner Geschäftsvorfälle. |
| `useManagement` | `Frontend/src/features/management/hooks/useManagement.js` | Liest den vom ManagementLayout bereitgestellten Outlet-Kontext für die aktuelle Unterseite. |
| `ManagementBar` | `Frontend/src/features/management/layout/managementBar.jsx` | Zeigt entweder acht Einrichtungsschritte oder die drei freigegebenen Jahresbereiche mit ihren SVG-Symbolen. |
| `ManagementLayout` | `Frontend/src/features/management/layout/managementLayout.jsx` | Lädt Jahresdaten und Tätigkeiten, hält den gemeinsamen Entwurf und stellt Speichern, Navigation und Freigabestatus für alle Managementseiten bereit. |
| `load` | `Frontend/src/features/management/layout/managementLayout.jsx` | Lädt Jahres-Snapshot und Referenzen gemeinsam und erzeugt eine unabhängige Entwurfskopie. |
| `start` | `Frontend/src/features/management/layout/managementLayout.jsx` | Lädt die gewählte Jahresbasis mit Abbruchsignal und hält Lade- sowie Fehlerzustand konsistent. |
| `act` | `Frontend/src/features/management/layout/managementLayout.jsx` | Führt eine Managementänderung aus und lädt danach neu; ein erfolgreicher Schreibzugriff mit fehlgeschlagenem Reload wird ausdrücklich unterschieden. |
| `refresh` | `Frontend/src/features/management/layout/managementLayout.jsx` | Lädt Jahresdaten und Firmeneinstellungen erneut, damit neue Tätigkeitsberichte und Änderungen sichtbar werden. |
| `saveConfig` | `Frontend/src/features/management/layout/managementLayout.jsx` | Übermittelt den gesamten Entwurf mit der zuletzt geladenen Revision an die validierende API. |
| `ManagementHours` | `Frontend/src/features/management/operating/hours.jsx` | Schlüsselt reale Kalenderberichte nach Personal, Tätigkeiten und Monaten auf und vergleicht sie mit der fixierten Jahresbasis. |
| `ManagementOperatingCosts` | `Frontend/src/features/management/operating/operatingCosts.jsx` | Erfasst kumulierte Ist-Summen und vergleicht aktuelle Stellenkosten mit dem vollständigen Vorjahr; fehlende Daten bleiben gekennzeichnet. |
| `saveActual` | `Frontend/src/features/management/operating/operatingCosts.jsx` | Übernimmt ausschließlich kumulierte Ist-Beträge in den Entwurf; veröffentlichte Jahresplanwerte werden nicht verändert. |
| `ManagementOverview` | `Frontend/src/features/management/operating/overview.jsx` | Zeigt veröffentlichte Plansätze, bisherige Ist-Kosten, Arbeitsstunden und Vermögensbasis ohne den freigegebenen Plan neu zu schreiben. |
| `SetupImport` | `Frontend/src/features/management/setup/import.panel.jsx` | Prüft CSV-Dateien lokal, zeigt Importumfang und Fehler und übernimmt ausgewählte Daten erst ausdrücklich in den Entwurf. |
| `ManagementSetup` | `Frontend/src/features/management/setup/setup.jsx` | Verbindet den gewählten Einrichtungsschritt mit dem gemeinsamen Entwurf und der revisionssicheren Speichern-und-Weiter-Navigation. |
| `change` | `Frontend/src/features/management/setup/setup.jsx` | Wendet eine lokale Änderung auf eine Kopie des Entwurfs an und lässt gespeicherte sowie freigegebene Eingaben unangetastet. |
| `SetupAnnualCosts` | `Frontend/src/features/management/setup/steps/annualCosts.jsx` | Erfasst verbleibende jährliche Betriebskosten; bereits direkt an Anlagen hinterlegte Aufwendungen werden nicht erneut vorbelegt. |
| `update` | `Frontend/src/features/management/setup/steps/annualCosts.jsx` | Ändert ein gezielt benanntes Eingabefeld der aktuellen Position im Einrichtungsentwurf. |
| `SetupAssets` | `Frontend/src/features/management/setup/steps/assets.jsx` | Erfasst Anlagen, Eröffnungsbestände und Restschulden und zeigt daraus die interne Vermögens- und Abschreibungsbasis. |
| `updateAsset` | `Frontend/src/features/management/setup/steps/assets.jsx` | Ändert ein Anlagefeld anhand der stabilen Positions-ID im lokalen Entwurf. |
| `updateLoan` | `Frontend/src/features/management/setup/steps/assets.jsx` | Ändert ein Feld der vorhandenen Restschuldposition im lokalen Entwurf. |
| `SetupBab` | `Frontend/src/features/management/setup/steps/bab.jsx` | Zeigt den automatisch verteilten BAB oder direkte Easy-Sätze und ermöglicht den Export der Planrechnung. |
| `SetupBusiness` | `Frontend/src/features/management/setup/steps/business.jsx` | Erfasst Zeitraum und Betriebsstruktur; Vorschläge und Vorjahresübernahme verändern ausschließlich den Einrichtungsentwurf. |
| `SetupDistribution` | `Frontend/src/features/management/setup/steps/distribution.jsx` | Erfasst direkte Zuordnungen, Verteilungsgrößen und eigene Schlüssel und steuert, welche Kostenarten in den Stundensatz eingehen. |
| `SetupHours` | `Frontend/src/features/management/setup/steps/hours.jsx` | Ordnet Tätigkeiten zu Kostenstellen und plant Personalstunden; vorhandene Kalenderberichte bleiben eine getrennte Ist-Basis. |
| `update` | `Frontend/src/features/management/setup/steps/hours.jsx` | Ändert ein gezielt benanntes Eingabefeld der aktuellen Position im Einrichtungsentwurf. |
| `SetupMachines` | `Frontend/src/features/management/setup/steps/machines.jsx` | Ergänzt laufende Maschinenaufwendungen und Laufzeiten und zeigt die reine Maschinenrate innerhalb der gesamten Stellenkosten. |
| `update` | `Frontend/src/features/management/setup/steps/machines.jsx` | Ändert ein gezielt benanntes Eingabefeld der aktuellen Position im Einrichtungsentwurf. |
| `SetupReview` | `Frontend/src/features/management/setup/steps/review.jsx` | Prüft und simuliert den Entwurf, veröffentlicht eine gespeicherte Version und macht frühere Freigabesätze nachvollziehbar. |
| `quote` | `Frontend/src/features/management/utils/csvExport.js` | Maskiert CSV-Zellen und verhindert, dass Bezeichnungen als Tabellenformeln interpretiert werden. |
| `numeric` | `Frontend/src/features/management/utils/csvExport.js` | Formatiert CSV-Zahlen mit Dezimalkomma; fehlende Stundensätze bleiben leer. |
| `exportBab` | `Frontend/src/features/management/utils/csvExport.js` | Exportiert die Plan-Kostenarten, Verteilungen und Vollstundensätze und kennzeichnet ungespeicherte Vorschauen im Dateinamen. |
| `downloadCsv` | `Frontend/src/features/management/utils/fileDownload.js` | Lädt UTF-8-CSV mit BOM herunter und gibt die temporäre Browser-URL anschließend wieder frei. |
| `money` | `Frontend/src/features/management/utils/format.js` | Formatiert einen internen Zahlenwert als Eurobetrag in deutscher Schreibweise. |
| `decimal` | `Frontend/src/features/management/utils/format.js` | Formatiert Stunden, Anteile und andere Zahlen mit höchstens zwei Nachkommastellen. |
| `dateLabel` | `Frontend/src/features/management/utils/format.js` | Formatiert einen gespeicherten Kalendertag ohne Verschiebung durch lokale Zeitzonen. |
| `createUuid` | `Frontend/src/features/management/utils/uuid.js` | Verwendet native UUIDs oder sichere Zufallsbytes; der Fallback funktioniert auch bei HTTP-Zugriff im LAN. |

## Gemeinsame Fachmodule

| Funktion | Datei | Verantwortung |
| --- | --- | --- |
| `calculateSetup` | `Engine/src/management/calculation/accounting.mjs` | Rechnet Plan oder Ist über dieselben Kostenpositionen, verteilt sie im BAB und leitet Stellen- sowie Maschinenstundensätze ab; Planwerte werden nie zusätzlich als Ist gezählt. |
| `weights` | `Engine/src/management/calculation/accounting.mjs` | Ermittelt die passenden Verteilungsgewichte aus Arbeitsstunden, Bezugsgrößen oder individuellen Schlüsselwerten. |
| `assetCalculation` | `Engine/src/management/calculation/assets.mjs` | Berechnet lineare Jahresabschreibung, bisherigen Vermögenswert und durchschnittlich gebundenes Kapital unter Beachtung von Restwert und Nutzungsdauer. |
| `distribute` | `Engine/src/management/calculation/distribution.mjs` | Verteilt Geldbeträge in ganzen Cent nach positiven Gewichten; größte Reste erhalten die verbliebenen Cent. |
| `productiveHours` | `Engine/src/management/calculation/hours.mjs` | Ermittelt produktive Jahresstunden aus Kapazität und Ausfällen; ein direkter Jahreswert hat Vorrang. |
| `activityKey` | `Engine/src/management/calculation/hours.mjs` | Bildet eine eindeutige Zuordnungskennung für katalogisierte oder frei benannte Tätigkeiten. |
| `aggregateWorkingHours` | `Engine/src/management/calculation/hours.mjs` | Aggregiert abgeschlossene Zeitberichte getrennt nach Mitarbeitern, Tätigkeiten, Kostenstellen und Monaten; fehlende Zuordnungen bleiben sichtbar. |
| `setupChecks` | `Engine/src/management/config/approval.mjs` | Prüft die fachlichen Freigabebedingungen; Easy benötigt einen positiven Satz, Vollkosten zusätzlich eine vollständige Kosten- und Stundenverteilung. |
| `approvedConfig` | `Engine/src/management/config/approval.mjs` | Liest die zuletzt freigegebenen Eingaben; ohne Freigabe wird null zurückgegeben. |
| `prepareSetupConfig` | `Engine/src/management/config/normalize.mjs` | Ergänzt bekannte Vorgaben, entfernt die alte Vorfallkonfiguration und bereitet einen unabhängigen Einrichtungsentwurf vor. |
| `defaultSetup` | `Engine/src/management/defaults/config.defaults.mjs` | Erstellt eine unabhängige, noch nicht eingerichtete Jahresplanung mit leeren Bestands- und Freigabelisten. |
| `defaultConfig` | `Engine/src/management/defaults/config.defaults.mjs` | Erstellt ein frisches Jahresmodell mit Kostenarten und Verteilungsschlüsseln; Listen werden nicht zwischen Jahren geteilt. |
| `createAssetDefaults` | `Engine/src/management/defaults/forms.defaults.mjs` | Erstellt eine unabhängige Anlage mit vorgegebener ID und Anschaffungsdatum. |
| `createStaffDefaults` | `Engine/src/management/defaults/forms.defaults.mjs` | Erstellt eine unabhängige Personalplanung; abgeleitete Arbeitszeiten überschreiben die Vorgaben. |
| `createCenterDefaults` | `Engine/src/management/defaults/forms.defaults.mjs` | Erstellt eine Kostenstelle; eigene Bereiche und Katalogvorschläge verwenden dieselbe Struktur. |
| `createLoanDefaults` | `Engine/src/management/defaults/forms.defaults.mjs` | Erstellt eine Restschuldposition ohne Zahlungs- oder Buchungsbewegung. |
| `createAnnualCostDefaults` | `Engine/src/management/defaults/forms.defaults.mjs` | Erstellt eine Jahreskostenposition; null als Ist-Wert bedeutet weiterhin fehlende Daten. |
| `createEasyRateDefaults` | `Engine/src/management/defaults/forms.defaults.mjs` | Erstellt eine zunächst unvollständige Easy-Rate, die der Benutzer vor Freigabe ergänzen muss. |
| `createDistributionKeyDefaults` | `Engine/src/management/defaults/forms.defaults.mjs` | Erstellt einen eigenen Schlüssel mit unabhängigen, zunächst leeren Verteilungsgewichten. |
| `parseCsv` | `Engine/src/management/imports/csv.mjs` | Liest CSV mit Semikolon oder Komma, zitierten Zellen und Zeilenumbrüchen; fehlerhafte Zitierung wird abgelehnt. |
| `normalized` | `Engine/src/management/imports/csv.mjs` | Normalisiert Importbezeichnungen für einen von Großschreibung unabhängigen Positionsabgleich. |
| `importNumber` | `Engine/src/management/imports/csv.mjs` | Liest deutsche oder einfache Dezimalbeträge; leere optionale Zellen verwenden den übergebenen Vorgabewert. |
| `importManagementCsv` | `Engine/src/management/imports/csv.mjs` | Prüft die gesamte Importdatei und erstellt eine Vorschaukopie; Kennung oder Name aktualisieren vorhandene Positionen ohne doppelte Übernahme. |
| `day` | `Engine/src/management/utils/dates.mjs` | Normalisiert ISO-Zeichenketten und Prisma-Datumsobjekte auf den Kalendertag JJJJ-MM-TT. |
| `today` | `Engine/src/management/utils/dates.mjs` | Liefert den aktuellen Kalendertag in der für die Betriebsrechnung verwendeten Berliner Zeitzone. |
| `fiscalRange` | `Engine/src/management/utils/dates.mjs` | Berechnet den vollständigen zwölfmonatigen Abrechnungszeitraum ab dem gewählten Startmonat. |
| `dateInBerlin` | `Engine/src/management/utils/dates.mjs` | Ordnet einen UTC-Zeitstempel dem Berliner Kalendertag des Arbeitsbeginns zu. |
| `round` | `Engine/src/management/utils/numbers.mjs` | Rundet interne Geld- und Stundenwerte auf zwei Nachkommastellen und gleicht kleine Gleitkommaabweichungen aus. |

## Backend

| Funktion | Datei | Verantwortung |
| --- | --- | --- |
| `saveManagementConfig` | `Backend/src/modules/management/controllers/configuration.controller.js` | Speichert den validierten Entwurf revisionssicher; Freigabehistorie stammt ausschließlich vom Server. |
| `saveDraft` | `Backend/src/modules/management/controllers/configuration.controller.js` | Prüft Periodenkonflikte und Revision, übernimmt die serverseitige Historie und speichert den Entwurf. |
| `approveManagementSetup` | `Backend/src/modules/management/controllers/configuration.controller.js` | Prüft einen gespeicherten Entwurf und fixiert Eingaben, BAB und Sätze als nächste Jahresversion. |
| `publishVersion` | `Backend/src/modules/management/controllers/configuration.controller.js` | Prüft den gespeicherten Entwurf erneut und veröffentlicht Eingaben sowie Rechnung als neue Version. |
| `getManagementOverview` | `Backend/src/modules/management/controllers/overview.controller.js` | Liefert die Jahresdaten und Berechnungen für Einrichtung, Jahresbetrieb und Vorjahresvergleich. |
| `getManagementReferences` | `Backend/src/modules/management/controllers/overview.controller.js` | Liefert aktive Personalkonten und Betriebsdokumente, die die aktuellen Managementansichten verwenden. |
| `requestYear` | `Backend/src/modules/management/services/http.js` | Liest und validiert das Geschäftsjahr; ohne Parameter gilt das Berliner Kalenderjahr. |
| `run` | `Backend/src/modules/management/services/http.js` | Übersetzt Validierungs-, Versions- und Datenbankfehler in einheitliche API-Antworten. |
| `managementHandler` | `Backend/src/modules/management/services/http.js` | Bearbeitet eine geschützte Anfrage und übersetzt Fehler in die gemeinsame Managementantwort. |
| `readLegacyInventory` | `Backend/src/modules/management/services/legacyInventory.js` | Übernimmt vorhandene Anlagen und Restschulden einmalig; bestätigte Einrichtungen lesen keine Alttabellen mehr. |
| `write` | `Backend/src/modules/management/services/persistence.js` | Speichert Änderung und Auditnachweis atomar; parallele Konflikte werden nicht überschrieben. |
| `persistAndAudit` | `Backend/src/modules/management/services/persistence.js` | Führt Änderung und Auditnachweis innerhalb derselben serialisierbaren Transaktion aus. |
| `loadTimeEntries` | `Backend/src/modules/management/services/snapshots.js` | Lädt abgeschlossene Zeitberichte für aktuelles und vorheriges Geschäftsjahr mit Zeitzonenpuffer. |
| `loadSnapshot` | `Backend/src/modules/management/services/snapshots.js` | Liest Jahreskonfigurationen und Zeitberichte als konsistenten Snapshot; Altdaten nur vor der ersten Einrichtung. |
| `readYearSnapshot` | `Backend/src/modules/management/services/snapshots.js` | Liest Jahreskonfiguration, Vorjahr, gegebenenfalls Inventar und Zeitberichte innerhalb desselben Read-Snapshots. |
| `presentSnapshot` | `Backend/src/modules/management/services/snapshots.js` | Baut Entwurf, eingefrorene Planbasis, laufende Ist-Rechnung und den Vorjahresvergleich auf. |
| `operationalConfig` | `Backend/src/modules/management/services/snapshots.js` | Übernimmt nur aktuelle Ist-Felder in die freigegebenen Eingaben; Planwerte bleiben unverändert. |
| `validateConfig` | `Backend/src/modules/management/services/validation/configuration.js` | Validiert das komplette Jahresmodell und übernimmt nur die aktiv unterstützten Konfigurationsfelder. |
| `validateSetup` | `Backend/src/modules/management/services/validation/setup.js` | Prüft Anlagen, Restschulden, Jahreskosten und Personalplanung; Freigaben dürfen nur vom Server ergänzt werden. |
| `invalid` | `Backend/src/modules/management/services/validation/values.js` | Bricht eine Validierung mit einer gezielten Meldung und einem HTTP-Status ab. |
| `number` | `Backend/src/modules/management/services/validation/values.js` | Prüft eine endliche Zahl innerhalb der Grenzen und rundet sie auf zwei Nachkommastellen. |
| `textValue` | `Backend/src/modules/management/services/validation/values.js` | Bereinigt ein Textfeld; leere optionale Werte werden null, Pflichtfelder müssen Inhalt haben. |
| `dateValue` | `Backend/src/modules/management/services/validation/values.js` | Prüft ein echtes ISO-Kalenderdatum, einschließlich Monatslänge und Schaltjahren. |
| `uuid` | `Backend/src/modules/management/services/validation/values.js` | Prüft optionale Datenbank-UUIDs, beispielsweise die Verknüpfung eines Mitarbeiters. |
| `yearValue` | `Backend/src/modules/management/services/validation/values.js` | Prüft ein ganzzahliges Geschäftsjahr innerhalb des unterstützten Bereichs. |
| `versionValue` | `Backend/src/modules/management/services/validation/values.js` | Prüft eine ganzzahlige Revision für den Schutz vor konkurrierenden Schreibzugriffen. |
| `reference` | `Backend/src/modules/management/services/validation/values.js` | Stellt sicher, dass eine optionale Zuordnung auf einen Eintrag derselben Konfiguration verweist. |
