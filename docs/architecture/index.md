# Systemarchitektur und Datenflüsse

CarpentersProduction ist in drei klar getrennte Bereiche gegliedert: Das `Frontend` stellt die Anwendung dar, das `Backend` übernimmt HTTP, Rechte und Persistenz, und die `Engine` enthält gemeinsam nutzbare Fachlogik ohne React-, Express- oder Datenbankabhängigkeit.

```text
Browser / React
      |
      | HTTP, JSON, Multipart, Cookie "token"
      v
   Traefik
      |
      +---- /api/* ----> Backend / Express ----> Prisma ----> PostgreSQL
      |                       |
      |                       +---- S3 SDK ----> Garage
      |                       |
      |                       +---- Engine-Verträge und Fachlogik
      |
      +---- /* --------> Frontend / Vite
                              |
                              +---- Engine-Fachlogik
```

## Dateistruktur

```text
CarpentersProduction/
├── Frontend/
│   └── src/
│       ├── app/                 Start, Router, Provider und Route Guards
│       ├── features/            Fachmodule mit Seiten und lokaler UI-Logik
│       │   ├── customers/
│       │   ├── inventory/
│       │   ├── management/
│       │   └── projects/        Aufmaß, Korpus, CNC, Nesting usw.
│       └── shared/              API, Cache, Offline, Hooks und UI-Bausteine
├── Backend/
│   └── src/
│       ├── app.js               Express-Konfiguration
│       ├── server.js            Prozessstart und Hintergrundjobs
│       ├── modules/             Routen, Controller und Services je Fachbereich
│       ├── infrastructure/      Prisma, S3, Speicher und Logging
│       ├── middleware/          Fachübergreifende HTTP-Middleware
│       └── shared/              Kleine technische Hilfen, z. B. JWT
└── Engine/
    ├── src/
    │   ├── cabinet/             Korpus- und Teilelistenlogik
    │   ├── calculation/         Kalkulation und Schätzung
    │   ├── cnc/                 CNC-Aufbereitung
    │   ├── management/          Betriebswirtschaftliche Fachlogik
    │   ├── nesting/             Plattenoptimierung
    │   ├── procurement/         Beschaffungsregeln
    │   ├── contracts/           Gemeinsame Datenverträge
    │   └── shared/              Laufzeitneutrale Hilfen
    └── browser/                 Bewusst browserspezifische Adapter
```

Die Abhängigkeitsrichtung ist eindeutig: `Frontend → Engine` und `Backend → Engine`. Die Engine importiert nichts aus Frontend oder Backend. Frontend und Backend importieren sich ebenfalls nicht gegenseitig, sondern kommunizieren ausschließlich über die API.

## Backend-Aufteilung

`Backend/src/app.js` baut die Express-Anwendung auf und ist unabhängig vom Prozessstart testbar. `Backend/src/server.js` lädt die Umgebung, initialisiert den Entwicklungstenant, öffnet den Port und startet den Löschworker.

Innerhalb von `modules/` liegt ein Fachbereich zusammen. Beispielsweise enthält `modules/attachment-search/` Controller, Service und Tenant-Secrets; `modules/projects/` enthält Projektrouten, Projektcontroller, Archiv und Service. Technische Zugriffe auf Prisma und S3 liegen dagegen unter `infrastructure/`.

## Frontend-Aufteilung

`Frontend/src/main.jsx` rendert nur noch die Anwendung und installiert globale Clients. Provider und Routing liegen unter `app/`. Jede fachliche Oberfläche liegt in `features/`; wiederverwendbare Technik liegt in `shared/`.

Projektmodule sind nach ihrer Aufgabe benannt: `measurement`, `cabinet`, `part-list`, `nesting`, `cutting`, `cnc`, `calculation`, `purchasing`, `attachments`, `settings` und `time-tracking`. Reine Algorithmen wurden aus diesen UI-Modulen in die Engine verschoben.

## Gemeinsame Projektdaten

Die Definitionen in `Engine/src/contracts/project/` ordnen logische Dokumentnamen wie `cabinet`, `aufmas` und `nesting` ihren JSON-Dateien zu und prüfen eingehende Daten. Das Backend verwendet denselben Vertrag für die generische Projektdatei-API. Binärdateien liegen in Garage; PostgreSQL speichert Metadaten in `File` und den Speicherverweis in `S3Object`.

## Typischer authentifizierter Request

1. Der Browser sendet den HTTP-only-Cookie `token`; bei Mutationen zusätzlich `X-XSRF-TOKEN`.
2. Origin- und CSRF-Middleware prüfen den Request.
3. Die Auth-Middleware validiert JWT, Benutzerstatus und `authVersion` gegen PostgreSQL.
4. Rollen- und Ressourcenpolicy prüfen den konkreten Zugriff.
5. Das zuständige Fachmodul greift über Prisma oder den Storage-Service auf Daten zu.
6. Die Antwort wird als JSON, signierte Download-URL oder Stream zurückgegeben.

## Projektarchiv

Ein Export streamt ein gzip-komprimiertes TAR-Archiv mit der Endung `.cproject`. Der erste Eintrag ist `manifest.json`; weitere Einträge enthalten Dateien und `ProjectStorage`-Objekte. Der Import validiert Format und Version, legt relationale Daten an, streamt Binärdaten nach Garage und versucht bei einem Fehler alle bereits erzeugten Artefakte zurückzurollen.
