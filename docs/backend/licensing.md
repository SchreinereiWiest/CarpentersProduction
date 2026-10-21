# Lizenzierung

CarpentersProduction kapselt jede Lizenzquelle hinter demselben Provider-Vertrag. Fachrouten, Login und Benutzerlimits kennen deshalb weder den Development- noch den späteren Lizenzserver direkt.

## Provider

`LICENSE_PROVIDER` wählt genau eine Quelle:

| Wert | Einsatz | Verhalten |
|---|---|---|
| `development` | lokale Entwicklung bis zur Serveranbindung | aktive, unbegrenzte Lizenz mit allen Modulen; kein Netzwerkzugriff |
| `database` | bestehender Übergangsweg | prüft ein lokal gespeichertes, mit RS256 signiertes Zertifikat |
| `remote` | Zielbetrieb mit MoebelDesignLicencing | validiert und aktiviert über dessen Backend-API |

Ohne explizite Angabe wird außerhalb von Produktion `development` und in Produktion `database` verwendet. Für die erste echte Serveranbindung wird `LICENSE_PROVIDER=remote` gesetzt. Der Development-Provider, sein Bootstrap-Lizenzdatensatz und die zugehörigen Variablen können entfernt werden, sobald dieser Betriebsweg erfolgreich abgenommen wurde.

## Remote-Konfiguration

```dotenv
LICENSE_PROVIDER=remote
LICENSE_CACHE_TTL_MS=300000
LICENSE_SERVER_URL=http://licensing-api:5100/
LICENSE_SERVER_API_KEY=<separates Client-Secret>
LICENSE_SERVER_PRODUCT_ID=carpenters-production
LICENSE_SERVER_TIMEOUT_MS=5000
```

Der API-Schlüssel liegt ausschließlich im Backend. Er darf weder über `/api/license/current` ausgeliefert noch als Vite-Variable angelegt werden. `licensing-api` ist der Alias des Lizenzserver-Backends im privaten externen Docker-Netz `MoebelDesign` und gilt für den aktuellen Development-Compose. Sobald CarpentersProduction mit `NODE_ENV=production` läuft, erzwingt der Provider auch auf dieser Verbindung eine HTTPS-URL. Fehler, Timeouts und ungültige Serverantworten werden standardisiert als `LicenseError` behandelt; die Anwendung fällt nicht still auf eine Development-Lizenz zurück.

Die erfolgreiche Antwort wird je Mandant für `LICENSE_CACHE_TTL_MS` im Prozessspeicher gehalten. `GET /api/license/current?refresh=true` umgeht diesen Cache. Nach einer Aktivierung wird der Eintrag verworfen. Mehrere Backend-Instanzen besitzen jeweils einen eigenen Cache.

## Vertrag für MoebelDesignLicencing

CarpentersProduction ruft zwei serverseitige Endpunkte auf:

| Methode | Pfad | Zweck |
|---|---|---|
| `POST` | `/api/v1/licenses/validate` | aktuelle Lizenz einer Installation prüfen |
| `POST` | `/api/v1/licenses/activate` | Lizenzschlüssel zuordnen und das Ergebnis zurückgeben |

Beide Requests tragen `Authorization: Bearer <LICENSE_SERVER_API_KEY>`, `Content-Type: application/json` und `X-License-Api-Version: 1`. Der Validierungsbody lautet:

```json
{
  "apiVersion": "1",
  "productId": "carpenters-production",
  "installation": {
    "tenantId": "00000000-0000-4000-8000-000000000123",
    "companyName": "Möbelschreinerei Beispiel",
    "tenantSlug": "beispiel"
  }
}
```

Die Aktivierung ergänzt auf oberster Ebene `"licenseKey": "..."`. Schlüssel gehören ausschließlich in den JSON-Body und dürfen weder in URLs noch in Logs erscheinen.

Eine erfolgreiche Antwort hat exakt eine `license`-Hülle:

```json
{
  "license": {
    "licenseId": "lic_123",
    "tenantId": "00000000-0000-4000-8000-000000000123",
    "companyName": "Möbelschreinerei Beispiel",
    "status": "active",
    "plan": "professional",
    "features": ["crm", "cabinet", "nesting", "management", "storage", "time", "purchasing"],
    "maxUsers": 12,
    "validUntil": "2027-12-31T23:59:59.000Z"
  }
}
```

Zulässige Statuswerte sind `active`, `inactive`, `expired`, `suspended` und `revoked`. `maxUsers` ist eine positive Ganzzahl oder `null`, `validUntil` ist ein ISO-8601-Zeitpunkt oder `null`. `tenantId` und `companyName` müssen zur Anfrage passen. Ein überschrittenes `validUntil` wird clientseitig immer als `expired` behandelt. Unbekannte oder fehlerhafte Antworten schalten keine Funktionen frei.

Erwartete Fehlerstatus des Lizenzservers:

| Status | Bedeutung in CarpentersProduction |
|---|---|
| `401`, `403` | Client-Authentisierung des Backends fehlgeschlagen; lokal `503` |
| `404` | keine Lizenz vorhanden; lokal `403 LICENSE_MISSING` |
| `409`, `422` | Aktivierung fachlich abgelehnt |
| `429`, `5xx`, Timeout/Netzwerkfehler | temporär nicht verfügbar; lokal `503` |

## Interne API und Durchsetzung

`GET /api/license/current` und `PUT /api/license/current` sind nur für Administratoren des angemeldeten Mandanten erreichbar. Die Antwort enthält bereinigte Lizenzdaten, niemals Client-Secret oder vollständigen Lizenzschlüssel.

`authenticate` prüft die Lizenz serverseitig für jeden geschützten Request, wobei der Provider-Cache den externen Traffic begrenzt. `requireFeature("...")` erzwingt einzelne Modulfreigaben zusätzlich an den Fachrouten. Das React-Frontend blendet Funktionen nur ergänzend aus; es ist keine Sicherheitsgrenze.

## Umschaltung

1. Die beiden Endpunkte und den obigen Vertrag in MoebelDesignLicencing implementieren.
2. Für CarpentersProduction einen eigenen API-Schlüssel erzeugen und serverseitig hinterlegen.
3. Die Verbindung zunächst mit einer kurzen Cache-Dauer und `GET /api/license/current?refresh=true` prüfen.
4. `LICENSE_PROVIDER=remote` setzen und Backend neu starten.
5. Login, Benutzerlimit, Modulfreigaben, Ablauf/Sperrung und Aktivierung testen.
6. Nach Abnahme `DevelopmentLicenseProvider`, den Development-Tenant-Bootstrap-Lizenzteil und die Development-Auswahl entfernen. Es gibt bewusst keinen automatischen Fallback von `remote` auf `development`.
