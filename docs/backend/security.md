# Sicherheit und bekannte Risiken

Diese Seite beschreibt den Ist-Stand des geprüften Backend-Quellcodes. Sie ist eine Arbeitsliste und ersetzt keinen Penetrationstest.

## Umgesetzte Absicherungen

| Bereich | Umsetzung |
|---|---|
| Projektlöschung | nur Admin; PostgreSQL-Löschung transaktional; persistentes Audit-Log mit Akteur und Request-Metadaten |
| Kundensuche | Login erforderlich; vollständige Kontaktdaten nur für Admin und Manager; reduzierte Felder für Benutzer |
| Materialbestand | Login erforderlich; nur Admin und Manager dürfen Mengen ändern |
| Bootstrap-Konten | keine festen Passwörter; Zugangsdaten nur über Umgebungsvariablen; mindestens 12 Zeichen; Passwort-Hash wird nicht protokolliert |

## Hoch

| Befund | Auswirkung | Empfehlung |
|---|---|---|
| Login prüft weder `isActive` noch `deletedAt` | deaktivierte Benutzer können sich weiter anmelden | Status vor Passwortprüfung erzwingen und bestehende Sessions widerrufbar machen |
| Mehrere ID-basierte Routen prüfen keine Objektberechtigung | angemeldete Benutzer können fremde Projekte, Dateien oder Wochen-JSON adressieren | zentrale Authorization-Policy je Ressource |
| Datei-/Projektlöschung verteilt Änderungen über Garage und DB | Fehler erzeugen Teilzustände oder verwaiste Objekte | DB-Transaktion, idempotente Jobs und Reconciliation-Prozess |
| Cookie verwendet `secure: false` | Token kann bei unverschlüsseltem HTTP übertragen werden | in Produktion HTTPS und `secure: true` |
| Keine CSRF-Gegenmaßnahme bei Cookie-Auth | mutierende Requests können aus fremdem Kontext angestoßen werden | Origin-Prüfung und CSRF-Token; `SameSite` bewusst konfigurieren |

## Mittel

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
- Es gibt keinen Health-Endpunkt und keine expliziten Security-Header. Das Audit-Log deckt aktuell erfolgreiche Projektlöschungen ab, noch nicht alle mutierenden Aktionen.

## Empfohlene Reihenfolge

1. Früher versionierte Passwörter und Garage-Secrets rotieren und bei Bedarf aus der Git-Historie entfernen.
2. Kontostatus- und objektbezogene Autorisierung auf weitere Ressourcen ausweiten.
3. HTTPS/Cookie/CORS/CSRF gemeinsam härten.
4. Upload-Limits, Schema-Validierung, Rate Limits und einheitliche Fehlerantworten ergänzen.
5. Audit-Logging auf weitere mutierende Aktionen ausweiten.
6. Reconciliation und Tests für DB-/Garage-Teilfehler aufbauen.
