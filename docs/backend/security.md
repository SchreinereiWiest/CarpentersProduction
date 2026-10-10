# Sicherheit und bekannte Risiken

Diese Seite beschreibt den Ist-Stand des geprüften Backend-Quellcodes. Sie ist eine Arbeitsliste und ersetzt keinen Penetrationstest.

## Umgesetzte Absicherungen

| Bereich | Umsetzung |
|---|---|
| Projektlöschung | nur Admin; PostgreSQL-Löschung transaktional; persistentes Audit-Log mit Akteur und Request-Metadaten |
| Kundensuche | Login erforderlich; vollständige Kontaktdaten nur für Admin und Manager; reduzierte Felder für Benutzer |
| Materialbestand | Login erforderlich; nur Admin und Manager dürfen Mengen ändern |
| Bootstrap-Konten | keine festen Passwörter; Zugangsdaten nur über Umgebungsvariablen; mindestens 12 Zeichen; Passwort-Hash wird nicht protokolliert |
| Kontostatus und Sessions | Login und jeder authentifizierte Request prüfen `isActive`, `deletedAt` und `authVersion`; Status-, Rollen- und Passwortänderungen sowie Logout widerrufen bestehende Sessions |
| Objektberechtigungen | zentrale Ressourcen-Policy für Projekte, Kunden, Dateien, Zeiteinträge und Wochen-JSON; Admin/Manager global, Benutzer nur für zugeordnete Ressourcen |
| Verteilte Löschungen | Fach- und Metadaten, Audit-Eintrag und idempotenter Löschjob werden atomar geschrieben; ein Worker wiederholt Garage-Löschungen |
| Cookie und Transport | `httpOnly`, `SameSite=Strict`, 72-Stunden-Laufzeit; in `NODE_ENV=production` zusätzlich `Secure` und HTTPS-Pflicht |
| CSRF und CORS | vollständige Origin-Allowlist sowie Double-Submit-Token über `XSRF-TOKEN` und `X-XSRF-TOKEN` |

## Hoch

Derzeit sind aus der geprüften Liste keine offenen Befunde dieser Priorität verblieben.

## Mittel

- `GET /api/auth/users` schließt deaktivierte und soft-gelöschte Konten nicht aus.
- Upload-Metadaten und Dateinamen werden kaum validiert; normale Uploads liegen vollständig im RAM und haben kein explizites Multer-Größenlimit.
- API-Fehler geben an mehreren Stellen `error.message` zurück und können interne Details offenlegen.
- Request-Logging schreibt jede Methode und URL ungefiltert auf `stdout`.
- Es fehlen Rate Limits für Login, Upload und Suchendpunkte.

## Infrastruktur

- Das Traefik-Dashboard ist als `api.insecure=true` konfiguriert und veröffentlicht Port 8080.
- Deployment-Hosts und Datenbankzugangsdaten stehen im lokalen, ignorierten Compose-Stand. Produktive Secrets sollten über eine Secret-Verwaltung injiziert und bei möglicher früherer Offenlegung rotiert werden.
- Es gibt keinen Health-Endpunkt und keine expliziten Security-Header. Das Audit-Log deckt aktuell erfolgreiche Projektlöschungen ab, noch nicht alle mutierenden Aktionen.

## Empfohlene Reihenfolge

1. Früher versionierte Passwörter und Garage-Secrets rotieren und bei Bedarf aus der Git-Historie entfernen.
2. Upload-Limits, Schema-Validierung, Rate Limits und einheitliche Fehlerantworten ergänzen.
3. Audit-Logging auf weitere mutierende Aktionen ausweiten.
4. Produktives TLS-Zertifikat und `NODE_ENV=production` im Zielsystem verifizieren.
5. Alarmierung für dauerhaft fehlgeschlagene `storage_deletion_jobs` ergänzen.
