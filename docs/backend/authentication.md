# Authentifizierung und Autorisierung

## Login

`POST /api/auth/login` erwartet:

```json
{
  "login": "max.mustermann",
  "password": "geheim"
}
```

`login` sucht den Benutzer über das eindeutige Feld `User.login`. Vor dem bcrypt-Vergleich werden `isActive === true` und `deletedAt === null` verlangt. Das JWT enthält `id`, `email`, `login`, `role` und `authVersion` und läuft nach 72 Stunden ab.

Bei Erfolg wird der Cookie `token` gesetzt:

- `httpOnly: true`
- `secure: true` in `NODE_ENV=production`, sonst `false` für lokale HTTP-Entwicklung
- `sameSite: "strict"`
- `maxAge: 72 Stunden`
- `path: "/"`

Zusätzlich wird der lesbare Cookie `XSRF-TOKEN` gesetzt und derselbe Wert einmalig als `csrfToken` ausgegeben. Axios sendet ihn bei gleichursprünglichen mutierenden Requests als `X-XSRF-TOKEN`. Die JSON-Antwort enthält kein JWT.

## Middleware

### `authenticate(req, res, next)`

Prüft Signatur und Ablaufzeit und lädt anschließend den Benutzer aus PostgreSQL. Nur ein aktiver, nicht gelöschter Benutzer mit identischer `authVersion` wird akzeptiert. Rolle und Identitätsfelder stammen aus dem aktuellen Datenbankdatensatz, nicht aus möglicherweise veralteten Claims.

### `authenticateAdmin(req, res, next)`

Führt dieselbe Prüfung aus und verlangt zusätzlich exakt `role === "admin"`. Andere Rollen erhalten Status `403`.

### `authorizeRoles(...allowedRoles)`

Diese Middleware wird hinter `authenticate` eingesetzt und erlaubt nur die ausdrücklich genannten Rollen. Eine fehlende Identität ergibt `401`, eine nicht erlaubte Rolle `403`. Die Materialbestandsänderung erlaubt damit ausschließlich `admin` und `manager`.

## Aktuelle Identität

`GET /api/auth/me` gibt nach der zentralen Sessionprüfung `id`, `email` und `role` zurück. Deaktivierte, gelöschte oder widerrufene Sessions erreichen den Handler nicht und erhalten `401`.

## Benutzerliste für Auswahlfelder

`GET /api/auth/users` ist nur für Admin und Manager erreichbar. Die Funktion lädt alle Benutzer und reduziert jeden Datensatz auf `id` und `email`. Soft-gelöschte oder deaktivierte Benutzer werden derzeit nicht herausgefiltert.

## JWT-Hilfsfunktionen

`generateAccessToken(user)` erzeugt ein separates 15-Minuten-Token mit `id` und `role`. `generateRefreshToken(user)` erzeugt ein 30-Tage-Token mit `id`. Beide Funktionen sind aktuell in keinem registrierten Request-Ablauf eingebunden; der Login signiert sein 72-Stunden-Token direkt.

## Abmelden und Session-Widerruf

`POST /api/auth/logout` erhöht `authVersion`, löscht beide Cookies und widerruft damit alle noch vorhandenen Tokens des Benutzers. Auch Passwortwechsel, Rollen-/Statusänderung und Soft-Delete erhöhen die Version. Eine Refresh-Route ist nicht registriert.

## CSRF, Origin und HTTPS

Alle `POST`-, `PUT`-, `PATCH`- und `DELETE`-Requests werden gegen `ALLOWED_ORIGINS` geprüft. Außer beim Login müssen `XSRF-TOKEN`-Cookie und `X-XSRF-TOKEN`- beziehungsweise `X-CSRF-TOKEN`-Header übereinstimmen. In Produktion werden HTTP-Requests mit `426 HTTPS required` abgewiesen.

!!! warning "Produktionskonfiguration"
    Traefik muss TLS terminieren und `X-Forwarded-Proto: https` setzen. Anschließend `NODE_ENV=production` setzen; andernfalls bleibt der Cookie für die lokale HTTP-Entwicklung absichtlich ohne `Secure`.
