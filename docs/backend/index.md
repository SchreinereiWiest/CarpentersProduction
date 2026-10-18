# Backend

Das Backend ist eine Express-5-Anwendung mit ECMAScript-Modulen. Es verwendet Prisma für PostgreSQL und S3-kompatible Clients für Uploads sowie signierte Downloads.

## Quellstruktur

```text
Backend/src/
├── app.js                    Express-App, globale Middleware und Routen-Mounts
├── server.js                 Umgebungsstart, Tenant-Bootstrap und Worker
├── modules/                  Fachmodule mit Route, Controller und Service
│   ├── auth/
│   ├── attachment-search/
│   ├── customers/
│   ├── files/
│   ├── management/
│   ├── projects/
│   └── ...
├── infrastructure/
│   ├── database/             Prisma und Tenant-Kontext
│   ├── storage/              S3, Storage-Service und Löschworker
│   └── logging/
├── middleware/               CSRF, Auth, Upload und Ressourcenrechte
├── shared/security/          JWT- und Passwortfunktionen
└── scripts/                  administrative Kommandozeilen-Skripte
```

Routen, Controller und Services eines Fachbereichs liegen bewusst nebeneinander. Technische Infrastruktur bleibt davon getrennt und kann von mehreren Modulen genutzt werden.

## Einstiegspunkte

| Thema | Dokument |
|---|---|
| Lokale Einrichtung und Variablen | [Installation & Konfiguration](installation.md) |
| Alle HTTP-Routen | [API-Referenz](api.md) |
| Login, Cookies und Rollen | [Authentifizierung](authentication.md) |
| Fachbereiche | [Kunden](customers.md), [Projekte](projects.md), [Zeiten](time-tracking.md), [Benutzer](users.md) |
| S3, Materialien und Einstellungen | [Dateien, Material & Einstellungen](files-storage-settings.md) |
| Benannte Backend-Funktionen | [Funktionsreferenz](functions.md) |
| Sicherheitsregeln | [Sicherheit & bekannte Risiken](security.md) |

## Globale Express-Konfiguration

- CORS verwendet Credentials und die konfigurierten erlaubten Origins.
- JSON- und URL-encoded-Bodies sind auf 20 MB begrenzt.
- Cookies werden mit `cookie-parser` eingelesen.
- Origin- und CSRF-Prüfung laufen vor den Fachrouten.
- Eine zentrale Fehler-Middleware übersetzt Fehler in ein einheitliches JSON-Format.
- `app.js` öffnet keinen Port und kann dadurch unabhängig vom Serverprozess getestet werden.

## Route-Prefixe

| Prefix | Fachbereich |
|---|---|
| `/api/auth` | Login und aktuelle Identität |
| `/api/customers` | Kunden |
| `/api/projects` | Projekte, Projektdokumente und Projektzeiten |
| `/api/files` | Binärdateien und Suche |
| `/api/materials` | Materiallager |
| `/api/time` | Tages- und Wochenzeiterfassung |
| `/api/user` | Benutzerverwaltung |
| `/api/settings` | JSON-Einstellungen |
| `/api/shop` | Einkauf und Lieferantenartikel |
| `/api/management` | Betriebsrechnung und Managementdaten |
| `/api/license` | Lizenzstatus |
