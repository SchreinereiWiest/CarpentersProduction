# Frontend

Das Frontend ist eine React-19-Single-Page-Application, die mit Vite gebaut wird. React Router steuert die Navigation, Axios kommuniziert über relative `/api`-Pfade mit dem Express-Backend, und React Three Fiber/Three.js visualisieren CAD-, Nesting-, Zuschnitt-, Korpus- und CNC-Daten.

## Technischer Überblick

| Bereich | Umsetzung |
|---|---|
| Einstieg | `src/main.jsx` rendert `src/app/App.jsx` und installiert globale Clients |
| Anwendung | `src/app/` enthält Router, Provider, Service-Worker-Registrierung und Route Guards |
| Fachmodule | `src/features/` bündelt Seiten, Komponenten und Logik nach Anwendungsbereich |
| Gemeinsame Technik | `src/shared/` enthält API, Cache, Offline-Support, Hooks und UI-Bausteine |
| Fachlogik | `../Engine/src/` enthält React-unabhängige Algorithmen und Datenverträge |
| Authentifizierung | HTTP-only-JWT-Cookie; Identität über `/api/auth/me`; CSRF-Header aus `XSRF-TOKEN` |
| Styling | Tailwind CSS, Flowbite und globale Regeln in `src/index.css` |

## Quellstruktur

```text
Frontend/src/
├── app/
│   ├── App.jsx              Provider und BrowserRouter
│   ├── router.jsx           zentrale Routentabelle
│   ├── providers/           Auth- und globaler Anwendungszustand
│   └── routing/             geschützte, öffentliche und rollenbasierte Routen
├── features/
│   ├── auth/                Anmeldung
│   ├── customers/           Kundenverwaltung
│   ├── employees/           Mitarbeiterkalender und Zeiterfassung
│   ├── inventory/           Material- und Lagerverwaltung
│   ├── management/          Betriebsrechnung und Dokumente
│   ├── projects/            Projekt- und Fertigungsmodule
│   ├── purchasing/          projektübergreifender Einkauf
│   └── company-settings/    Unternehmenskonfiguration
└── shared/
    ├── api/                 HTTP-Client und API-Helfer
    ├── cache/               Memory-, IndexedDB- und Projektcache
    ├── components/          wiederverwendbare UI
    ├── hooks/               anwendungsweite React-Hooks
    ├── offline/             Offline-Repository und Konfliktauflösung
    ├── settings/            gemeinsame Settings-Helfer
    └── utils/               kleine technische Hilfen
```

## Importregeln

- Features dürfen `shared` und die Engine verwenden.
- `shared` enthält keine Importe aus konkreten Features.
- Reine Berechnungen und Datenumformungen gehören in die Engine.
- Browserabhängige Engine-Adapter werden über `@EngineBrowser` importiert; laufzeitneutrale Module über `@Engine`.

## Weiterführende Seiten

- [Installation & Entwicklung](installation.md)
- [Routing & Authentifizierung](routing-auth.md)
- [State, API & Cache](state-data.md)
- [Seiten & Komponenten](pages-components.md)
- [Projektmodule](project-modules.md)
- [Funktionsreferenz](functions.md)
- [Risiken & Qualitätsregeln](quality.md)

Die verbindlichen Request-/Response-Formate stehen in der [Backend-API-Referenz](../backend/api.md).
