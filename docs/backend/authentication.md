# Authentifizierung und Autorisierung

## Login

`POST /api/auth/login` erwartet:

```json
{
  "login": "max.mustermann",
  "password": "geheim"
}
```

`login` sucht den Benutzer über das eindeutige Feld `User.login`, vergleicht das Passwort mit bcrypt und signiert ein JWT mit `JWT_ACCESS_SECRET`. Das Token enthält `id`, `email`, `login` und `role` und läuft nach 72 Stunden ab.

Bei Erfolg wird der Cookie `token` gesetzt:

- `httpOnly: true`
- `secure: false`
- `sameSite: "lax"`
- kein explizites `maxAge`

Die JSON-Antwort enthält dieselben öffentlichen Benutzerdaten, aber nicht das Token.

## Middleware

### `authenticate(req, res, next)`

Liest `req.cookies.token`, prüft es mit `jwt.verify` und schreibt die Claims nach `req.user`. Ohne Cookie folgt `401 {"message":"Not authenticated"}`, bei ungültigem oder abgelaufenem Token `401 {"message":"Invalid token"}`.

### `authenticateAdmin(req, res, next)`

Führt dieselbe Prüfung aus und verlangt zusätzlich exakt `role === "admin"`. Andere Rollen erhalten Status `403`.

### `authorizeRoles(...allowedRoles)`

Diese Middleware wird hinter `authenticate` eingesetzt und erlaubt nur die ausdrücklich genannten Rollen. Eine fehlende Identität ergibt `401`, eine nicht erlaubte Rolle `403`. Die Materialbestandsänderung erlaubt damit ausschließlich `admin` und `manager`.

## Aktuelle Identität

`GET /api/auth/me` lädt den Benutzer anhand von `req.user.id` erneut aus PostgreSQL und gibt `id`, `email` und `role` zurück. Ein inzwischen gelöschter Datensatz erzeugt `404`. `isActive` und `deletedAt` werden weder in der Middleware noch in dieser Route geprüft.

## Benutzerliste für Auswahlfelder

`GET /api/auth/users` ist für jeden angemeldeten Benutzer erreichbar. Die Funktion lädt alle Benutzer und reduziert jeden Datensatz auf `id` und `email`. Soft-gelöschte oder deaktivierte Benutzer werden nicht herausgefiltert.

## JWT-Hilfsfunktionen

`generateAccessToken(user)` erzeugt ein separates 15-Minuten-Token mit `id` und `role`. `generateRefreshToken(user)` erzeugt ein 30-Tage-Token mit `id`. Beide Funktionen sind aktuell in keinem registrierten Request-Ablauf eingebunden; der Login signiert sein 72-Stunden-Token direkt.

## Abmelden und Refresh

Es gibt derzeit weder eine Logout-Route zum Löschen des Cookies noch eine Refresh-Route. Das im Utility vorgesehene Refresh-Token wird nicht gesetzt oder geprüft.

!!! warning "Produktionskonfiguration"
    Für HTTPS muss der Cookie mit `secure: true` gesetzt werden. Außerdem sollten aktive/gelöschte Benutzer zentral geprüft, Rollenfehler als `403` beantwortet und CORS-/Cookie-Einstellungen gemeinsam getestet werden.
