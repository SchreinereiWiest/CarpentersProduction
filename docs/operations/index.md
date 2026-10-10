# Betrieb

## Start und Status

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f backendjs
```

Das Backend besitzt aktuell keinen Health-Endpunkt. Betriebsprüfungen können daher nur einen fachlichen API-Endpunkt oder die Erreichbarkeit von Port 5000 verwenden.

## Deployment

1. Geheimnisse und deployment-spezifische Hosts außerhalb des Repositories bereitstellen.
2. Datenbank- und Garage-Backup erstellen.
3. Prisma-Migrationen kontrolliert ausführen.
4. Images bauen und den Compose-Verbund aktualisieren.
5. Login, `/api/auth/me`, einen Datenbankzugriff und einen signierten Garage-Download prüfen.

## Backup

Ein vollständiges Backup besteht aus:

- PostgreSQL-Dump einschließlich Schema und Daten,
- Garage-Metadaten und Garage-Daten,
- Garage-Konfiguration und Bucket-/Key-Konfiguration,
- sicher verwahrten Laufzeit-Secrets.

Das `.cproject`-Format exportiert jeweils ein einzelnes Projekt samt verbundenen Fachdaten und Binärdateien. Es ersetzt kein vollständiges Systembackup.

## Wiederherstellung

PostgreSQL und Garage müssen auf einen zueinander passenden Stand zurückgesetzt werden. Danach sind Prisma-Client und Migrationstand zu prüfen. Stichproben sollten sowohl Datenbankabfragen als auch Downloads enthalten.

## Häufige Fehler

| Symptom | Prüfung |
|---|---|
| `401 Not authenticated` | Cookie `token` vorhanden und Browser sendet Credentials? |
| `401 Invalid token` | `JWT_ACCESS_SECRET` auf Login- und API-Instanz identisch? |
| Prisma-Verbindungsfehler | `DATABASE_URL`, PostgreSQL-Dienst und Migrationstand prüfen |
| Upload schlägt fehl | Bucket, S3-Credentials, `S3_ENDPOINT` und Body-Größe prüfen |
| Signierte URL nicht erreichbar | `S3_PUBLIC_ENDPOINT`, DNS/TLS und Ablaufzeit von 900 Sekunden prüfen |
| Browser blockiert Request | vollständige CORS-Origin inklusive Schema prüfen |
| Import liefert `400` | gzip/TAR-Struktur, erstes `manifest.json`, Formatversion und Vollständigkeit prüfen |
