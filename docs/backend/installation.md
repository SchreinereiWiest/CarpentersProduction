# Installation & Konfiguration

## Voraussetzungen

- Node.js 22 (entspricht dem Backend-Dockerfile)
- pnpm
- PostgreSQL
- ein S3-kompatibler Garage-Endpunkt

## Backend lokal installieren

```bash
cd Backend
pnpm install
pnpm exec prisma generate
pnpm run dev
```

`pnpm run dev` startet `tsx watch src/server.js`; `pnpm start` startet `node src/server.js`. Beide Varianten lauschen auf Port `5000`.

## Umgebungsvariablen

Die Werte werden über `Backend/.env` geladen. Die Datei wird aus `Backend/.env.example` erzeugt, ist ignoriert und darf keine echten Zugangsdaten im Repository enthalten.

```bash
cp Backend/.env.example Backend/.env
```

| Variable | Verwendung |
|---|---|
| `DATABASE_URL` | PostgreSQL-Verbindung für Prisma |
| `JWT_ACCESS_SECRET` | Signieren und Prüfen des Login-Cookies |
| `JWT_REFRESH_SECRET` | Nur von `generateRefreshToken` verwendet; kein Refresh-Endpunkt registriert |
| `S3_ENDPOINT` | interner Garage-Endpunkt für Upload und Delete |
| `S3_PUBLIC_ENDPOINT` | für den Browser erreichbarer Endpunkt signierter Download-URLs |
| `S3_ACCESS_KEY` | S3 Access Key |
| `S3_SECRET_KEY` | S3 Secret Key |
| `S3_BUCKET` | Bucket für Dateien, Einstellungen, Wochen- und Projektdaten |
| `BOOTSTRAP_ADMIN_*` | optionale Zugangsdaten für das einmalige Admin-Skript |
| `BOOTSTRAP_USER_*` | optionale Zugangsdaten für das einmalige Benutzer-Skript |

Beispiel ohne echte Geheimnisse:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
JWT_ACCESS_SECRET=CHANGE_ME
JWT_REFRESH_SECRET=CHANGE_ME
S3_ENDPOINT=http://garage:3900
S3_PUBLIC_ENDPOINT=https://storage.example.test
S3_ACCESS_KEY=CHANGE_ME
S3_SECRET_KEY=CHANGE_ME
S3_BUCKET=carpenters-storage
```

## Prisma

Nach einer Änderung am Schema:

```bash
cd Backend
pnpm exec prisma generate
pnpm exec prisma migrate dev --name BESCHREIBUNG
```

Für eine bestehende Produktionsmigration ist statt `migrate dev` der kontrollierte Befehl `pnpm exec prisma migrate deploy` vorgesehen.

## CORS

Die erlaubten Origins sind momentan direkt in `src/server.js` hinterlegt. Ein Browser-Origin enthält üblicherweise Schema und Host, beispielsweise `https://example.test`. Änderungen sollten deshalb zusammen mit dem tatsächlichen Deployment geprüft werden.
