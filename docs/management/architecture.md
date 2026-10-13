# Architektur und Beziehungen

Der Managementbereich trennt Darstellung, gemeinsame Fachrechnung und Datenbankzugriff. Einrichtungs- und Jahresansichten verwenden denselben Datenkontext; Frontendvorschau und Backendfreigabe rechnen mit denselben gemeinsamen Funktionen.

## Frontend

Alle Featuredateien liegen unter `Frontend/src/pages/management/`:

```text
management/
├── layout/
│   ├── managementLayout.jsx     Jahresdaten, Entwurf, API und Status
│   └── managementBar.jsx        Einrichtung / Jahresnavigation
├── hooks/
│   └── useManagement.js         Gemeinsamer Outlet-Kontext
├── defaults/
│   ├── forms.defaults.js        Browser-IDs und abgeleitete Formularvorgaben
│   ├── navigation.defaults.js   SVG-Pfade und Navigationskatalog
│   └── ui.defaults.js           Feldgestaltung, Format- und Uploadvorgaben
├── components/
│   ├── ui.jsx                   Buttons, Felder, Karten, Dialoge und Tabellen
│   └── babTable.jsx             Gemeinsame Plan-/Ist-BAB-Darstellung
├── setup/
│   ├── setup.management.jsx     Schrittwahl, Entwurf und Speichern & Weiter
│   ├── import.panel.jsx         CSV-Vorschau und ausdrückliche Übernahme
│   └── steps/
│       ├── business.management.jsx
│       ├── assets.management.jsx
│       ├── annualCosts.management.jsx
│       ├── hours.management.jsx
│       ├── distribution.management.jsx
│       ├── machines.management.jsx
│       ├── bab.management.jsx
│       └── review.management.jsx
├── operating/
│   ├── overview.management.jsx
│   ├── hours.management.jsx
│   └── operatingCosts.management.jsx
├── documents/
│   ├── documents.management.jsx
│   └── documentInbox.jsx
└── utils/
    ├── uuid.js                  Native UUID / HTTP-kompatibler Fallback
    ├── format.js                Euro, Zahlen und Kalendertage
    ├── csvExport.js             Plan-BAB und CSV-Maskierung
    └── fileDownload.js          Gemeinsamer Browserdownload
```

Die Schrittdateien bearbeiten einen unabhängigen Entwurf über `change`. Sie führen keine eigenen Datenbankabfragen aus. Das Layout stellt Jahresdaten, Referenzen, Tätigkeiten und API-Aktionen bereit. Es unterscheidet eine fehlgeschlagene Speicherung von einer gespeicherten Änderung mit fehlgeschlagenem Neuladen.

`babTable.jsx` wird sowohl in der Einrichtung als auch im Jahresbetrieb verwendet. Der Jahresbetrieb importiert keine Einrichtungsmasken. Der Dokumenteneingang verwendet die vorhandene Datei-API und benötigt keine Buchungsberechnung.

Die alten Routen `/Management/CostAccounting`, `/Calculation`, `/Assets` und `/Settings` leiten auf die entsprechenden neuen Bereiche weiter. `/Transactions` führt zurück ins Management. Die vier früheren, ungerouteten Masken sind entfernt; es gibt keine zweite parallele Kostenrechnung im Frontend.

## Gemeinsame Fachmodule

```text
Engine/management/
├── defaults/
│   ├── config.defaults.mjs      Jahresmodell und Einrichtung
│   ├── forms.defaults.mjs       Positionsstrukturen und unabhängige Fabriken
│   ├── catalog.defaults.mjs     Schritte, Kostenartenkatalog und Tätigkeitsgruppen
│   ├── validation.defaults.mjs  Grenzen, Felder, zulässige Werte und Muster
│   └── import.defaults.mjs      CSV-Vorlage, Spaltenzuordnung und Importgrenzen
├── config/
│   ├── normalize.mjs            Ergänzung aktiver Vorgaben
│   └── approval.mjs             Fachliche Freigabeprüfung und letzte Freigabe
├── calculation/
│   ├── hours.mjs                Produktive Kapazität und reale Zeitberichte
│   ├── assets.mjs               Abschreibung und Kapital
│   ├── distribution.mjs         Centgenaue Verteilung
│   └── accounting.mjs           Kostenpositionen, BAB, Umlagen und Raten
├── imports/
│   └── csv.mjs                  Atomare Importvorschau und Positionsabgleich
└── utils/
    ├── dates.mjs                Berliner Kalendertage und Geschäftsjahr
    └── numbers.mjs              Gemeinsame Rundung
```

`accounting.mjs` kombiniert die Einzelmodule; es besitzt keine Express-, Prisma- oder React-Abhängigkeit. Es verändert die übergebene Konfiguration nicht. `normalize.mjs` ergänzt Vorgaben und entfernt die nicht mehr unterstützte Vorfallkonfiguration. `approval.mjs` prüft fachliche Vollständigkeit, während das Backend die syntaktische und referenzielle Validierung übernimmt.

Die Defaultmodule sind explizit importiert. Es gibt keine alte Sammeldatei mit Weiterexporten, die verdeckt sowohl Buchungen als auch die neue Einrichtung berechnet.

## Backend

```text
Backend/src/
├── routes/management/
│   └── management.routes.js           Authentifizierung und vier API-Routen
├── controllers/management/
│   ├── overview.controller.js         Jahresdaten und verwendete Referenzen
│   └── configuration.controller.js    Entwurf speichern und Version freigeben
└── services/management/
    ├── http.js                        Jahresparameter und Fehlerantworten
    ├── persistence.js                 Atomare Änderung mit Auditnachweis
    ├── snapshots.js                   Read-Snapshot, Plan-/Ist-Trennung, Vorjahr
    ├── legacyInventory.js             Einmalige Anlagen-/Restschuldübernahme
    ├── defaults/
    │   └── persistence.defaults.js     Transaktionsoptionen und Zeitfeldprojektion
    └── validation/
        ├── values.js                  Texte, Zahlen, Datum, UUID und Revision
        ├── configuration.js           Jahresstruktur und interne Referenzen
        └── setup.js                   Anlagen, Kosten und Personalplanung
```

Routen delegieren an benannte Controller. Die Controller verwenden Services für Transaktionen und gemeinsame Fachmodule für die Rechnung. Die Datenbank liefert Minutenberichte; das gemeinsame Stundenmodul übernimmt deren fachliche Periodenzuordnung.

## Datenfluss

1. `GET /api/management` liest Jahreskonfiguration, Vorjahr und abgeschlossene Zeitberichte konsistent.
2. Vor der ersten bestätigten Einrichtung wird vorhandenes Inventar aus früheren Tabellen übernommen.
3. Das Layout hält die erhaltene Konfiguration und eine lokale Entwurfskopie.
4. Schrittmasken verändern die Kopie; `calculateSetup` erzeugt die interaktive Planvorschau.
5. Speichern validiert den Jahresentwurf und prüft seine Revision sowie Periodenüberschneidungen.
6. Freigabe validiert erneut und berechnet mit den dann aktuellen Zeitberichten einen unveränderlichen Snapshot.
7. Im Jahresbetrieb stammen Plan und Tätigkeitsstruktur aus der Freigabe; neue Berichte und aktuelle Ist-Felder bilden die laufende Rechnung.

## Bestehende Daten

Die alten Geschäftsvorfall-/Zahlungs-APIs, ihre Validierung, der Bruttobetragshelfer und die alte Gesamtberechnung sind entfernt. Vorhandene Tabellen werden nicht gelöscht und keine Produktionsdaten migriert oder bereinigt.

`legacyInventory.js` wird nur benötigt, solange ein Jahresmodell noch nicht als eingerichtet gespeichert ist. Es übernimmt Anlagen und Restschulden ohne Geldbewegungen. Nach `setup.initialized = true` erscheinen bewusst entfernte Altpositionen nicht erneut. Die frühere Referenzprüfung gegen unbenutzte Vorfalltabellen blockiert die neue Kostenstellenpflege nicht mehr.

## Entwicklung

Frontend und Backend benötigen den gemeinsamen `shared`-Dockerkontext bzw. dessen Entwicklungs-Mount. Neue Dateien in diesen Unterordnern werden vom bestehenden Kontext mitkopiert. Die Refaktorierung benötigt keine zusätzliche Prisma-Migration. [Tests](testing.md) prüfen Verhalten und entfernte APIs.
