# API und Speicherung

Alle Managementrouten verlangen eine authentifizierte Admin- oder Managerrolle. Der Basis-Pfad lautet `/api/management`. `year` ist das Startjahr des Geschäftsjahrs; ohne Angabe gilt das aktuelle Berliner Kalenderjahr.

## Aktive Endpunkte

| Methode | Pfad | Zweck |
| --- | --- | --- |
| GET | `/api/management?year=2026` | Konsistenter Jahres-Snapshot mit Entwurf, Rechnung und Vorjahr |
| GET | `/api/management/references` | Aktive Personalkonten und Betriebsdokumente |
| PUT | `/api/management/settings?year=2026` | Jahresentwurf mit `{config, revision}` speichern |
| POST | `/api/management/setup/approve?year=2026` | Gespeicherten Entwurf mit `{revision, note?}` freigeben |

Betriebsdateien verwenden die vorhandenen geschützten Datei-Endpunkte. Ein CSV-Import erfolgt zunächst im Browser und wird anschließend über dieselbe Konfigurations-API validiert und gespeichert.

## Snapshotstruktur

| Feld | Bedeutung |
| --- | --- |
| `year`, `revision` | Startjahr und zuletzt gespeicherte Änderungsrevision |
| `config` | Aktueller, vorbereiteter Jahresentwurf |
| `timeEntries` | Abgeschlossene Berichte aus dem für Jahr/Vorjahr benötigten Abfragefenster |
| `setupCalculation` | Planvorschau des aktuellen Entwurfs |
| `operationalConfig` | Freigegebene Eingaben mit aktuellen Ist-Feldern |
| `operatingPlan` | Fixierte Rechnung der letzten Freigabe, vorher die Entwurfsrechnung |
| `operatingActual` | Laufende Ist-Kosten und Stunden anhand veröffentlichter Regeln |
| `previous` | Vorjahreskonfiguration, Vorjahresplan und Vorjahres-Ist oder `null` |

Die Zeitabfrage besitzt einen Zeitzonenpuffer. Erst das gemeinsame Stundenmodul entscheidet anhand Berliner Kalendertage und Geschäftsjahr, welche Berichte fachlich zur aktuellen Rechnung gehören. Passwort-, E-Mail- oder sonstige unbenötigte Benutzerfelder werden nicht in diese Berichte projiziert.

## Konfiguration

`ManagementPeriod.config` enthält Umfang, Startmonat, Eröffnungsbestände, Gewinnaufschlag, Easy-Sätze, Kostenstellen, Kostenarten, Verteilungsschlüssel und `setup`.

`setup` enthält Betriebsname, Initialisierungsstatus, Stunden-/Zinsmethode, Materialbestand, Anlagen, Restschulden, Jahreskosten, Personalplanung und Freigabehistorie. Historische Buchungsregeln und manuelle BAB-Ergänzungen gehören nicht mehr zum aktiven Modell.

Die serverseitige Validierung prüft Datentypen, Grenzen, doppelte IDs, echte Datumswerte, Kostenstellen-/Schlüsselreferenzen und Personalkonten. Fachliche Vollständigkeit wird vor der Freigabe geprüft; ein Entwurf kann noch fehlende Freigabeangaben enthalten.

## Revision und Transaktionen

Ein Speichervorgang verlangt die zuletzt geladene Revision. Existiert das Jahr noch nicht, ist Revision `0` erforderlich. Jede erfolgreiche Änderung erhöht die Revision. Eine zwischenzeitliche Änderung führt zu `409` und wird nicht überschrieben.

Read-Snapshots verwenden `RepeatableRead`. Änderungen und Auditnachweis werden gemeinsam unter `Serializable` geschrieben. Auditaktionen sind `management.settings.save` und `management.setup.approve`. Ein gescheiterter Audit- oder Datenbankschreibvorgang veröffentlicht keine halbe Änderung.

## Freigabesnapshot

Eine Freigabe liest den gespeicherten Entwurf, validiert erneut und verwendet die dann aktuellen abgeschlossenen Berichte. Gespeichert werden Versionsnummer, Zeitpunkt, Benutzer-ID, Notiz, unabhängige Eingaben, BAB/Rechnung, Sätze, Maschinenübersicht und Plankosten. Der eingebettete Konfigurationssnapshot enthält keine rekursive Freigabehistorie.

Clientseitig gesendete Freigaben werden beim Speichern ignoriert. Die Historie stammt immer aus dem zuvor gespeicherten Jahresmodell. Neue Ist-Summen und Berichte können die laufende Rechnung ändern; veröffentlichte Planwerte bleiben fixiert.

## Übergang und entfernte APIs

Vor der ersten gespeicherten Einrichtung übernimmt `legacyInventory.js` vorhandene Anlagen und Restschulden aus früheren Tabellen. Nach `setup.initialized = true` werden diese Tabellen für das Jahresmodell nicht erneut geladen.

Endpunkte für `/transactions`, `/payments`, `/rules/apply`, separate `/assets`, `/loans` und `/repayments` wurden entfernt. Die alte Antwort `calculation`, Geschäftsvorfälle, Bruttobetragsrechnung und der Parameter `basis` gehören nicht mehr zum aktiven API-Vertrag. Anlagen und Restschulden werden innerhalb der Jahreskonfiguration gepflegt. Bestehende Tabellen und Datensätze werden nicht gelöscht.

## Fehler

`400` kennzeichnet ungültige oder unvollständige Eingaben, `401` fehlende Anmeldung, `403` fehlende Rolle, `409` veraltete Revision/Parallelkonflikt. Entfernte Routen sind nicht mehr vorhanden und führen zu `404`. Unerwartete Fehler liefern eine allgemeine Meldung; technische Fehlerdetails werden serverseitig protokolliert.
