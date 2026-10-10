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

Für Produktion müssen Traefik oder ein vorgeschalteter Proxy HTTPS terminieren und `X-Forwarded-Proto: https` setzen. In der root `.env` ist anschließend `NODE_ENV=production` zu konfigurieren. Das Backend weist dann Klartext-HTTP mit `426` ab und setzt Session- und CSRF-Cookie mit `Secure`.

## Garage-Löschjobs

Der Backend-Prozess startet einen Reconciliation-Worker. Er verarbeitet beim Start und danach minütlich fällige Zeilen aus `storage_deletion_jobs`. Fehlgeschlagene Jobs wechseln auf `failed` und werden mit exponentiellem Backoff erneut versucht; unterbrochene `processing`-Jobs werden nach fünf Minuten wieder freigegeben.

Für die Betriebsüberwachung sollten dauerhaft fehlgeschlagene Jobs sichtbar gemacht werden:

```sql
SELECT id, bucket_name, object_key, attempts, last_error, next_attempt_at
FROM storage_deletion_jobs
WHERE status = 'failed'
ORDER BY updated_at;
```

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
| `401 Session revoked` | Konto aktiv/nicht gelöscht und Token-`authVersion` aktuell? Neu anmelden. |
| `403 Invalid CSRF token` | `XSRF-TOKEN`-Cookie vorhanden und als `X-XSRF-TOKEN` gesendet? |
| `403 Origin not allowed` | vollständige Origin einschließlich Schema in `ALLOWED_ORIGINS` eingetragen? |
| `426 HTTPS required` | Produktion über den TLS-EntryPoint aufrufen und `X-Forwarded-Proto` prüfen |
| Prisma-Verbindungsfehler | `DATABASE_URL`, PostgreSQL-Dienst und Migrationstand prüfen |
| Upload schlägt fehl | Bucket, S3-Credentials, `S3_ENDPOINT` und Body-Größe prüfen |
| Signierte URL nicht erreichbar | `S3_PUBLIC_ENDPOINT`, DNS/TLS und Ablaufzeit von 900 Sekunden prüfen |
| Browser blockiert Request | vollständige CORS-Origin inklusive Schema prüfen |
| Import liefert `400` | gzip/TAR-Struktur, erstes `manifest.json`, Formatversion und Vollständigkeit prüfen |
