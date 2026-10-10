# Backend

Das Backend ist eine Express-5-Anwendung mit ECMAScript-Modulen. Es läuft fest auf Port `5000`, verwendet Prisma für PostgreSQL und zwei S3-Clients für interne Uploads sowie öffentliche signierte Downloads.

## Einstiegspunkte

| Thema | Dokument |
|---|---|
| Lokale Einrichtung und Variablen | [Installation & Konfiguration](installation.md) |
| Alle HTTP-Routen | [API-Referenz](api.md) |
| Login, Cookies und Rollen | [Authentifizierung](authentication.md) |
| Controller nach Fachbereich | [Kunden](customers.md), [Projekte](projects.md), [Zeiten](time-tracking.md), [Benutzer](users.md) |
| S3, Materialien und Einstellungen | [Dateien, Material & Einstellungen](files-storage-settings.md) |
| Jede benannte Backend-Funktion | [Funktionsreferenz](functions.md) |
| Erkannte Schwachstellen | [Sicherheit & bekannte Risiken](security.md) |

## Globale Express-Konfiguration

- CORS ist mit Credentials aktiviert und auf zwei konfigurierte Origins begrenzt.
- Jeder Request wird mit Methode und URL auf `stdout` protokolliert.
- JSON- und URL-encoded-Bodies sind auf 20 MB begrenzt.
- Cookies werden mit `cookie-parser` eingelesen.
- Es gibt derzeit weder eine zentrale 404- noch eine zentrale Fehler-Middleware.

## Route-Prefixe

| Prefix | Fachbereich |
|---|---|
| `/api/auth` | Login und aktuelle Identität |
| `/api/customers` | Kunden |
| `/api/projects` | Projekte, Projektdateien und Projektzeiten |
| `/api/files` | Binärdateien |
| `/api/materials` | Materiallager |
| `/api/time` | Tages- und Wochenzeiterfassung |
| `/api/user` | Benutzerverwaltung |
| `/api/settings` | JSON-Einstellungen |

## Nicht implementierte Schichten

`src/services/auth.service.js`, `project.service.js`, `storage.service.js` und `user.service.js` sowie `src/utils/logger.js` sind leer. Sie besitzen aktuell keine Laufzeitfunktion.
