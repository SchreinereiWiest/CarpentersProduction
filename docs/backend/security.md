# Sicherheit und bekannte Risiken

Diese Seite beschreibt den Ist-Stand des geprüften Backend-Quellcodes. Sie ist eine Arbeitsliste und ersetzt keinen Penetrationstest.

## Kritisch

| Befund | Auswirkung | Empfehlung |
|---|---|---|
| `DELETE /api/projects/delete/:projectId` ist öffentlich | Projekte und Garage-Dateien können ohne Login gelöscht werden | mindestens `authenticateAdmin`; zusätzlich Berechtigungsmodell und Audit-Log |
| `GET /api/customers/search` ist öffentlich | Kundenstammdaten können abgefragt werden | Authentifizierung und rollenbasierte Feldfreigabe |
| `PATCH /api/materials/:id/quantity` ist öffentlich | Lagerbestand kann ohne Login verändert werden | mindestens `authenticate`, besser definierte Lagerrolle |

## Hoch

| Befund | Auswirkung | Empfehlung |
|---|---|---|
| Login prüft weder `isActive` noch `deletedAt` | deaktivierte Benutzer können sich weiter anmelden | Status vor Passwortprüfung erzwingen und bestehende Sessions widerrufbar machen |
| Mehrere ID-basierte Routen prüfen keine Objektberechtigung | angemeldete Benutzer können fremde Projekte, Dateien oder Wochen-JSON adressieren | zentrale Authorization-Policy je Ressource |
| Datei-/Projektlöschung verteilt Änderungen über Garage und DB | Fehler erzeugen Teilzustände oder verwaiste Objekte | DB-Transaktion, idempotente Jobs und Reconciliation-Prozess |
| Cookie verwendet `secure: false` | Token kann bei unverschlüsseltem HTTP übertragen werden | in Produktion HTTPS und `secure: true` |
| Keine CSRF-Gegenmaßnahme bei Cookie-Auth | mutierende Requests können aus fremdem Kontext angestoßen werden | Origin-Prüfung und CSRF-Token; `SameSite` bewusst konfigurieren |

## Mittel

- `authenticateAdmin` antwortet auf fehlende Rechte mit `401` statt `403`.
- CORS-Origins sind ohne URL-Schema eingetragen; Browser-Matching kann dadurch fehlschlagen.
- `GET /api/time/day/:date` liefert Zeiten aller Benutzer an jede angemeldete Rolle.
- `GET /api/auth/users` schließt deaktivierte und soft-gelöschte Konten nicht aus.
- Upload-Metadaten und Dateinamen werden kaum validiert; normale Uploads liegen vollständig im RAM und haben kein explizites Multer-Größenlimit.
- API-Fehler geben an mehreren Stellen `error.message` zurück und können interne Details offenlegen.
- Request-Logging schreibt jede Methode und URL ungefiltert auf `stdout`.
- Es fehlen Rate Limits für Login, Upload und Suchendpunkte.
- `GET /api/auth/me` sowie die JWT-Middleware validieren den aktuellen Kontostatus nicht.

## Infrastruktur

- Das Traefik-Dashboard ist als `api.insecure=true` konfiguriert und veröffentlicht Port 8080.
- Deployment-Hosts und Datenbankzugangsdaten stehen im lokalen, ignorierten Compose-Stand. Produktive Secrets sollten über eine Secret-Verwaltung injiziert und bei möglicher früherer Offenlegung rotiert werden.
- Es gibt keinen Health-Endpunkt, keine expliziten Security-Header und kein zentrales Audit-Log.

## Empfohlene Reihenfolge

1. Öffentliche Lösch-, Such- und Bestandsrouten schützen.
2. Früher versionierte Passwörter und Garage-Secrets rotieren und bei Bedarf aus der Git-Historie entfernen.
3. Kontostatus- und objektbezogene Autorisierung zentralisieren.
4. HTTPS/Cookie/CORS/CSRF gemeinsam härten.
5. Upload-Limits, Schema-Validierung, Rate Limits und einheitliche Fehlerantworten ergänzen.
6. Reconciliation und Tests für DB-/Garage-Teilfehler aufbauen.
