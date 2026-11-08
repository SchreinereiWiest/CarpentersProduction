# Paperless-ngx-Integration

CarpentersProduction bindet eine externe Paperless-ngx-Instanz als alleinige
Dateiablage an. In Carpenters werden nur Remote-ID, Anzeige-Metadaten und die
Zuordnung zu Projekt, Kunde oder manuellem Ordner gespeichert. Der Binärinhalt
wird weder beim Webhook noch beim Öffnen nach Garage kopiert.

## Einrichtung

1. Unter **Firmeneinstellungen → Advanced → Dokumente** die Basis-URL der
   Paperless-Instanz und einen API-Token hinterlegen.
2. Einstellungen speichern und die Verbindung testen.
3. In Paperless einen Workflow anlegen:
   - Trigger: `Document Added`
   - Aktion: `Webhook`
   - Methode/URL: die in Carpenters angezeigte POST-URL
   - Encoding: JSON
   - „Use parameters for webhook body“ aktivieren
   - Webhook-Parameter: links `document_id`, rechts `{{doc_id}}`
   - Webhook-Header: links `X-Carpenters-Paperless-Secret`, rechts das einmalig
     angezeigte Secret
   - „Include document“ ist nicht erforderlich
4. Optional manuelle Carpenters-Ordner anlegen. Diese verändern keine Tags,
   Dokumenttypen oder Storage Paths in Paperless.

Paperless unterstützt den `{{doc_id}}`-Platzhalter bei Workflows mit den
Triggern „added“ und „updated“. Die Integration verwendet ausschließlich
„added“, damit Metadatenänderungen keinen neuen Eingang erzeugen.

## Datenfluss

```text
Paperless Document Added
        │ Webhook (Remote-ID + Secret)
        ▼
Carpenters PaperlessDocument ──► QR-Prüfung im OCR-Worker
        │                              │
        │ kein Treffer                 └─ CPD1/CPM1 → Projekt/Kunde
        ▼
Dokumenteingang ── manuelle Zuordnung ─► Referenz am Ziel
        │
        └─ Öffnen/Thumbnail ──► Backend-Proxy ──► Paperless API
```

Zusätzlich zum Webhook prüft das Backend standardmäßig alle 60 Sekunden, ob
Paperless höhere Dokument-IDs bereitstellt. Dieser idempotente Pull-Abgleich
fängt verpasste Webhooks und Development-Umgebungen ohne zuverlässig
erreichbaren Inbound-Port ab. Die bestehende Bibliothek wird beim ersten
Aktivieren nicht vollständig in den Eingang kopiert. Das Intervall lässt sich
mit `PAPERLESS_SYNC_INTERVAL_MS` zwischen 15 Sekunden und einer Stunde setzen.

Der Proxy hält den Paperless-Token im Backend. Browser und OCR-Worker erhalten
den Token nie. Redirects zu einer anderen Origin werden abgelehnt, damit der
Token nicht an fremde Hosts weitergegeben wird.

Dokumente im Eingang können in Carpenters **ausgeblendet** werden. Dabei bleibt
die Datei unverändert in Paperless; der lokale Status verhindert, dass Webhook
oder Pull-Abgleich sie erneut in den Eingang stellen. Über die Bibliothek kann
eine ausgeblendete Referenz später weiterhin manuell zugeordnet werden.

Die Aktion **In Paperless löschen** sendet `DELETE /api/documents/:id/` an die
externe Instanz und entfernt danach die Carpenters-Referenz. Paperless verschiebt
das Dokument zunächst in seinen Papierkorb, sofern der API-Benutzer die nötige
Löschberechtigung besitzt. Bereits zugeordnete Dokumente müssen vorher gelöst
werden.

## QR-Zuordnung

Im Dokumenteingang kann ein QR-Code für ein Projekt oder einen Kunden erzeugt
werden. Das Format `CPD1` enthält die Zuordnungsdaten und eine tenant-spezifische
HMAC-Signatur. Manipulierte oder für einen anderen Mandanten ausgestellte Codes
werden ignoriert. Vorhandene `CPM1`-Codes auf Aufmaßblättern werden zusätzlich
gegen gespeicherte Druckseiten geprüft und dem zugehörigen Projekt zugeordnet.

Der Worker prüft standardmäßig nur die ersten fünf Seiten. Der Wert lässt sich
mit `PAPERLESS_QR_MAX_PAGES` zwischen 1 und 20 anpassen.

## API-Endpunkte

| Methode | Endpoint | Zweck |
| --- | --- | --- |
| `GET/PUT` | `/api/paperless/settings` | Konfiguration und manuelle Ordner |
| `POST` | `/api/paperless/settings/test` | Token und Erreichbarkeit prüfen |
| `POST` | `/api/integrations/paperless/webhook/:tenantId` | Paperless Document-Added-Hook |
| `GET` | `/api/paperless/documents` | Eingang und gespeicherte Referenzen |
| `POST` | `/api/paperless/sync` | Pull-Abgleich sofort ausführen |
| `PUT` | `/api/paperless/documents/:id/assignment` | Referenz zuordnen |
| `POST` | `/api/paperless/documents/:id/dismiss` | Nur aus Carpenters-Eingang ausblenden |
| `DELETE` | `/api/paperless/documents/:id` | Remote-Dokument in Paperless löschen |
| `GET` | `/api/paperless/library` | Paperless-Volltextsuche |
| `POST` | `/api/paperless/library/:remoteId/link` | Früheres Dokument verknüpfen |
| `GET` | `/api/paperless/documents/:id/content` | Datei aus Paperless streamen |
| `POST` | `/api/paperless/qr` | Signierten CPD1-Code erzeugen |

Alle Browser-Endpunkte sind sitzungs- und rollenbasiert geschützt. Der externe
Webhook verwendet ein separates, rotierbares Secret; interne Worker-Endpunkte
verwenden `MEASUREMENT_OCR_SECRET`.

## Development über das interne Netzwerk

Paperless darf für den Webhook nicht `localhost` verwenden, weil dieser Name
auf den Paperless-Host beziehungsweise dessen Container zeigt. Das lokale
Compose-Setup veröffentlicht deshalb ausschließlich den Webhook-Pfad zusätzlich
über die LAN-IP des Entwicklungsrechners.

```env
CARPENTERS_DEV_WEBHOOK_HOST=10.10.100.52
CARPENTERS_PUBLIC_URL=http://10.10.100.52
```

Die normale Oberfläche bleibt unter `http://av.localhost` erreichbar. Paperless
verwendet die in Advanced → Dokumente angezeigte URL mit der LAN-IP. Port 80 des
Entwicklungsrechners muss aus dem Paperless-Netz erreichbar sein. Für Production
wird `CARPENTERS_PUBLIC_URL` auf die feste HTTPS-Domain gesetzt; der zusätzliche
LAN-Router kann über eine andere Hostvariable angepasst oder aus dem
Production-Compose entfernt werden.
