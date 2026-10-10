# Systemarchitektur und Datenflüsse

CarpentersProduction ist als klassische Webanwendung mit getrenntem Frontend, JSON-API, relationaler Datenbank und Objektspeicher aufgebaut.

```text
Browser / React
      |
      | HTTP, JSON, Multipart, Cookie "token"
      v
   Traefik
      |
      +---- /api/* ----> Express :5000 ----> Prisma ----> PostgreSQL
      |                       |
      |                       +---- AWS SDK / S3 ----> Garage
      |
      +---- /* --------> React / Vite
```

## Backend-Schichten

| Schicht | Verzeichnis | Aufgabe |
|---|---|---|
| Einstieg | `Backend/src/server.js` | Express-App, Middleware, Routen-Mounts und Port 5000 |
| Routing | `Backend/src/routes/` | HTTP-Methode, Pfad, Auth-Middleware und Handler |
| Controller | `Backend/src/controllers/` | Validierung, Geschäftsabläufe, Prisma- und S3-Zugriffe |
| Middleware | `Backend/src/middleware/` | Session-, CSRF-, Rollen- und Ressourcenprüfung sowie Dateiabläufe |
| Konfiguration | `Backend/src/config/` | Prisma- und S3-Clients |
| Utilities | `Backend/src/utils/` | Passwort-Hashing und JWT-Hilfen |
| Datenmodell | `Backend/prisma/schema.prisma` | PostgreSQL-Modelle, Beziehungen und Enums |

`Backend/src/services/storageDeletion.service.js` verarbeitet dauerhafte Garage-Löschjobs. Weitere Geschäftslogik liegt derzeit überwiegend in Controllern und Middleware.

## Frontend-Schichten

| Schicht | Verzeichnis | Aufgabe |
|---|---|---|
| Einstieg und Router | `Frontend/src/main.jsx` | Context-Provider und Seitenrouten |
| Route Guards | `Frontend/src/routes/` | Sessionzustand und sichtbare Rollenführung |
| Seiten/Komponenten | `Frontend/src/pages/`, `components/` | UI, Formulare und fachliche Editoren |
| Services | `Frontend/src/services/` | API-Helfer, Settings, Memory- und IndexedDB-Cache |
| Engines | `Frontend/src/pages/projects/**/engine`, `algorythm/` | Geometrie, Nesting, Teilelisten und CNC-Compiler |

## Typischer authentifizierter Request

1. Der Browser sendet den HTTP-only-Cookie `token`; bei Mutationen zusätzlich `X-XSRF-TOKEN`.
2. Origin- und CSRF-Middleware prüfen den Request.
3. Die Auth-Middleware validiert JWT, Benutzerstatus und `authVersion` gegen PostgreSQL.
4. Rollen- und Ressourcenpolicy prüfen den konkreten Zugriff.
5. Der Controller greift über Prisma oder das S3-SDK auf Daten zu.
6. Die Antwort wird als JSON, signierte Download-URL oder Stream zurückgegeben.

## Dateiablauf

Binärdateien liegen in Garage; PostgreSQL speichert Metadaten in `File` und den technischen Speicherverweis in `S3Object`. Downloads erfolgen über eine für 900 Sekunden signierte URL. Generierte JSON-Daten verwenden feste Objektpfade, während normale Uploads eine UUID im Objektnamen erhalten.

## Projektarchiv

Ein Export streamt ein gzip-komprimiertes TAR-Archiv mit der Endung `.cproject`. Der erste Eintrag ist `manifest.json`; weitere Einträge enthalten Dateien und `ProjectStorage`-Objekte. Der Import validiert Format und Version, legt relationale Daten an, streamt Binärdaten nach Garage und versucht bei einem Fehler alle bereits erzeugten Artefakte zurückzurollen.
