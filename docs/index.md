# CarpentersProduction

Diese Dokumentation beschreibt den aktuellen Stand des vollständigen Repositories: React-Frontend, Express-Backend, Datenhaltung, Garage/S3-Abläufe und Compose-Infrastruktur.

## Schnellnavigation

| Bereich | Inhalt | Stand |
|---|---|---|
| [Architektur](architecture/index.md) | Komponenten, Abhängigkeiten und Datenflüsse | Grundstruktur dokumentiert |
| [Frontend](frontend/index.md) | React, Routing, Komponenten, Hooks, Cache und Fertigungsmodule | Vollständig dokumentiert |
| [Backend](backend/index.md) | Express, 46 aktive API-Routen und Funktionsreferenz | Vollständig dokumentiert |
| [Datenbank](database/index.md) | PostgreSQL, Prisma-Modelle und Relationen | Schema dokumentiert |
| [Module](modules/index.md) | Nesting, CNC, Cabinet Editor und CRM | Frontend-Logik und Backend-Anknüpfungspunkte dokumentiert |
| [Infrastruktur](infrastructure/index.md) | Docker, Traefik, Garage und Kubernetes | Ist-Stand dokumentiert |
| [Betrieb](operations/index.md) | Start, Deployment, Backup und Fehlersuche | Grundabläufe dokumentiert |
| [Tests](testing/index.md) | Teststrategie, Testdaten und Qualitätsregeln | Soll-Konzept dokumentiert |

## Technologiestapel

- Frontend: React mit Vite
- Backend: Node.js, Express 5 und ECMAScript-Module
- Persistenz: PostgreSQL über Prisma
- Objektspeicher: Garage über die S3-kompatible AWS-SDK-Schnittstelle
- Routing: Traefik im Docker-Compose-Verbund
- Dokumentation: MkDocs mit Material-Theme

!!! info "Dokumentationsprinzip"
    Die API-Seiten beschreiben den tatsächlich implementierten Ist-Stand. Auffälligkeiten und ungeschützte Routen sind nicht stillschweigend korrigiert, sondern unter [Sicherheit & bekannte Risiken](backend/security.md) sichtbar gemacht.
