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
| Middleware | `Backend/src/middleware/` | JWT-Prüfung sowie Datei-Upload/-Download/-Löschung |
| Konfiguration | `Backend/src/config/` | Prisma- und S3-Clients |
| Utilities | `Backend/src/utils/` | Passwort-Hashing und JWT-Hilfen |
| Datenmodell | `Backend/prisma/schema.prisma` | PostgreSQL-Modelle, Beziehungen und Enums |

Die Dateien unter `Backend/src/services/` sind derzeit leer. Geschäftslogik liegt deshalb direkt in Controllern und Middleware.

## Typischer authentifizierter Request

1. Der Browser sendet den HTTP-only-Cookie `token`.
2. `cookie-parser` stellt ihn über `req.cookies.token` bereit.
3. `authenticate` oder `authenticateAdmin` validiert das JWT mit `JWT_ACCESS_SECRET`.
4. Die dekodierten Claims werden als `req.user` weitergegeben.
5. Der Controller liest Pfad-, Query- und Body-Daten und greift über Prisma oder das S3-SDK auf Daten zu.
6. Die Antwort wird als JSON, signierte Download-URL oder Stream zurückgegeben.

## Dateiablauf

Binärdateien liegen in Garage; PostgreSQL speichert Metadaten in `File` und den technischen Speicherverweis in `S3Object`. Downloads erfolgen über eine für 900 Sekunden signierte URL. Generierte JSON-Daten verwenden feste Objektpfade, während normale Uploads eine UUID im Objektnamen erhalten.

## Projektarchiv

Ein Export streamt ein gzip-komprimiertes TAR-Archiv mit der Endung `.cproject`. Der erste Eintrag ist `manifest.json`; weitere Einträge enthalten Dateien und `ProjectStorage`-Objekte. Der Import validiert Format und Version, legt relationale Daten an, streamt Binärdaten nach Garage und versucht bei einem Fehler alle bereits erzeugten Artefakte zurückzurollen.
