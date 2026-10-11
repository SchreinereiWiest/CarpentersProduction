# Tests und Qualitätsregeln

## Frontend-Testumgebung

Die Frontendtests liegen vollständig außerhalb der Laufzeitmodule unter
`Frontend/test/`. Vitest verwendet `jsdom` für Browser-APIs, React Testing
Library für Routing- und Komponententests sowie `fake-indexeddb` für den
persistenten Projektcache.

```text
Frontend/test/
├── auth/             # Anmeldung, Rollen und geschützte Routen
├── fixtures/         # synthetische Korpus-, Material- und Lagerdaten
├── pipeline/         # Korpus → Stückliste → CNC → Nesting
├── projects/         # Projektanlage und erzeugte Projektdateien
├── storage/          # API-, Memory- und IndexedDB-Dateiabläufe
└── setup.js          # gemeinsame Browser-Testumgebung
```

Ausführen:

```bash
cd Frontend
pnpm test
```

Für die Entwicklung steht mit `pnpm run test:watch` der Watch-Modus bereit.
Alle Testdaten sind künstlich und enthalten keine Kunden-, Personal- oder
Zugangsdaten.

## Abgedeckte Frontend-Abläufe

| Bereich | Automatisch geprüfter Vertrag |
|---|---|
| Projektzugriff | Nicht angemeldete Besucher werden zum Login umgeleitet; die Rollen `user`, `manager` und `admin` erreichen `/Projects/Create`. |
| Rollenmodell | `manager` erreicht administrative Seiten und Funktionen; `user` wird abgewiesen. `/CompanySettings` bleibt einschließlich Navigation strikt `admin` vorbehalten. |
| Projektanlage | `POST /api/projects/new` erhält Kunde, Titel und Beschreibung einschließlich Session-Cookie. |
| Anhänge | Ein Anhang wird als `FormData` mit Projekt-, Kunden-, Datei- und MIME-Metadaten an `/api/files/upload` gesendet. Eine fehlende GLB-MIME-Angabe wird als `model/gltf-binary` ergänzt. |
| Generierte Dateien | `list.json` und `cabinet.json` werden nach der Projektanlage über die jeweilige Generated-Data-Route gespeichert. |
| Dateiabruf | Das Frontend fordert signierte Download-URLs an, lädt generierte JSON-Dateien und einen CAD-Anhang, parst CAD-Zahlen und behandelt eine nicht vorhandene Datei als `null`. |
| Cache-Roundtrip | Ein erfolgreicher Upload aktualisiert Memory-Cache und IndexedDB. Nach einem simulierten Modul-Neustart kommt dieselbe Datei aus IndexedDB, ohne einen zweiten Serverabruf. |
| Stückliste | Ein synthetischer Korpus erzeugt Korpuswurzel, Seiten, Böden und Rückwand mit Materialnummern und Mengen. |
| CNC | Die Nut-Rückwand erzeugt reale `RNT`-Operationen; CNC-fähige Teile werden durch den CNC-Editor gruppiert. |
| Nesting | Alle Stücklistenteile werden nach Material und Stärke gruppiert, auf Lagerplatten platziert und behalten den Bezug zum Originalteil. |

Die API-Antworten werden in der Frontendsuite isoliert simuliert. Damit prüft
die Suite den Frontendvertrag reproduzierbar, aber keine reale Datenbank oder
S3-/Garage-Instanz. Ein echter systemübergreifender Test benötigt eine eigene
Testdatenbank, einen Test-Bucket beziehungsweise Storage-Emulator und
synthetische Benutzerkonten.

## Rollenregel

Die Datenbank kennt `admin`, `manager` und `user`. `manager` besitzt dieselben
operativen Privilegien wie `admin`. Die vollständige Route
`/CompanySettings`, ihre Navigation sowie Benutzer- und
Einstellungsverwaltung sind die ausdrückliche Ausnahme und ausschließlich für
`admin` freigegeben. Der lesende Abruf der Arbeitszeit-Firmendaten bleibt für
angemeldete Benutzer verfügbar, weil Kalender und Zeiterfassung ihn benötigen.

## Backendtests

Das Backend besitzt Node-Testfälle für Rollen-, Authentifizierungs- und
CSRF-Middleware:

```bash
cd Backend
pnpm run test:security
```

## Weitere empfohlene Teststufen

1. Controller-Tests mit isolierter PostgreSQL-Testdatenbank und emuliertem
   S3-Endpunkt.
2. API-Integrationstests für Projektanlage und Datei-Roundtrip je Rolle.
3. Browser-End-to-End-Tests für Login, Projektanlage, Korpuskonfiguration,
   CNC-Prüfung und Nesting mit einem gestarteten Gesamtsystem.
4. Fehlerpfade für unterbrochene Uploads, abgelaufene signierte URLs und
   teilweise fehlgeschlagene Projektdateien.

## Qualitätsregeln

- Jede neue Route dokumentiert Authentifizierung, Eingabe, Antwort und
  Fehlerfälle.
- Jeder mutierende Endpunkt besitzt Validierung und einen Autorisierungstest.
- Datenbank- und Storage-Änderungen werden atomar ausgeführt oder besitzen
  einen getesteten Rollback.
- `pnpm test`, `pnpm run lint` und `pnpm run build` werden vor der Auslieferung
  im Frontend ausgeführt.
- `mkdocs build --strict` muss ohne Warnungen durchlaufen.
- Geheimnisse und generierte Verzeichnisse dürfen nicht versioniert werden.
