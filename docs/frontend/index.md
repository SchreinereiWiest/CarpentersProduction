# Frontend

Das Frontend ist eine React-19-Single-Page-Application, die mit Vite gebaut wird. React Router steuert die Navigation, Axios kommuniziert über relative `/api`-Pfade mit dem Express-Backend, und React Three Fiber/Three.js visualisieren CAD-, Nesting-, Zuschnitt-, Korpus- und CNC-Daten.

## Technischer Überblick

| Bereich | Umsetzung |
|---|---|
| Einstieg | `src/main.jsx` mit `AppProvider`, `AuthProvider`, `BrowserRouter` und Routentabelle |
| Authentifizierung | HTTP-only-JWT-Cookie; Identität über `/api/auth/me`; CSRF-Header automatisch aus `XSRF-TOKEN` |
| UI-State | lokaler React-State, Context für Anmeldung und globale Layoutwerte, fachliche Custom Hooks |
| Server-State | Axios/fetch; Projekt- und Einstellungs-JSON über Memory- und IndexedDB-Cache |
| 2D/3D | `three`, `@react-three/fiber`, `@react-three/drei` |
| Dokumente | `jspdf` und `jspdf-autotable` für Stücklisten-PDFs |
| Styling | Tailwind CSS, Flowbite und globale Regeln in `src/index.css` |

## Quellstruktur

```text
Frontend/src/
├── components/          globale Navigation, Bilder und wiederverwendbare UI
├── hooks/               anwendungsweite React-Hooks
├── routes/              Auth-Context und Route Guards
├── services/            API-Helfer, Settings sowie Memory-/IndexedDB-Cache
└── pages/
    ├── contacts/        Kundenverwaltung
    ├── personal/        Mitarbeiterkalender und Zeiterfassung
    ├── projects/        Projektansichten und Fertigungsmodule
    ├── settings/        Unternehmens-, Benutzer-, CNC- und Cache-Einstellungen
    └── storage/         Material- und Lagerverwaltung
```

## Weiterführende Seiten

- [Installation & Entwicklung](installation.md)
- [Routing & Authentifizierung](routing-auth.md)
- [State, API & Cache](state-data.md)
- [Seiten & Komponenten](pages-components.md)
- [Projektmodule](project-modules.md)
- [Funktionsreferenz](functions.md)
- [Risiken & Qualitätsregeln](quality.md)

Die verbindlichen Request-/Response-Formate stehen in der [Backend-API-Referenz](../backend/api.md).
