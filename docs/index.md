# CarpentersProduction

Diese Dokumentation beschreibt den aktuellen Stand des Repositories. Der Schwerpunkt dieser Ausbaustufe liegt auf dem Express-Backend: alle registrierten Endpunkte, Controller- und Hilfsfunktionen, Authentifizierung, Datenhaltung und Garage/S3-Abläufe sind dokumentiert.

## Schnellnavigation

| Bereich | Inhalt | Stand |
|---|---|---|
| [Architektur](architecture/index.md) | Komponenten, Abhängigkeiten und Datenflüsse | Grundstruktur dokumentiert |
| [Frontend](frontend/index.md) | React, Komponenten, Hooks und State | Für spätere Ausbaustufe vorbereitet |
| [Backend](backend/index.md) | Express, 45 aktive API-Routen und Funktionsreferenz | Vollständig dokumentiert |
| [Datenbank](database/index.md) | PostgreSQL, Prisma-Modelle und Relationen | Schema dokumentiert |
| [Module](modules/index.md) | Nesting, CNC, Cabinet Editor und CRM | Backend-Anknüpfungspunkte dokumentiert |
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
