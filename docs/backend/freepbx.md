# FreePBX-/Asterisk-Telefonintegration

Die Telefonintegration erweitert den CRM-Kontaktverlauf um eingehende Anrufe.
Sie speichert keine FreePBX-Admin-, SIP- oder AMI-Zugangsdaten. Stattdessen ruft
ein Adapter auf der Telefonanlage drei mandantenspezifische HTTPS-Webhooks von
Carpenters auf.

## Einrichtung in Carpenters

1. `Firmeneinstellungen → Advanced → Kontaktverlauf` öffnen.
2. Im Abschnitt **FreePBX / Asterisk-Anrufverlauf** die lokale
   Standard-Landesvorwahl, zum Beispiel `+49`, eintragen.
3. **FreePBX-Webhooks aktivieren** und **Telefonie speichern** wählen.
4. Das einmalig angezeigte Webhook-Secret sofort sicher in der Telefonanlage
   hinterlegen. Carpenters gibt es nach einem Neuladen nicht erneut aus.
5. Die angezeigten Ziele für `ringing`, `answered` und `ended` in den
   Asterisk-Adapter übernehmen.

FreePBX Core besitzt keine allgemeine Konfigurationsseite für
Telefonie-Webhooks. Ist das kommerzielle Sangoma-CRM-Modul installiert, liegt
der Einstieg im Admin-Dashboard unter
`Modules → CRM Settings → Settings → CRM API Settings`. Fehlt der Menüpunkt,
kann das Modul unter `Admin → Module Admin` geprüft beziehungsweise installiert
werden. Die CRM-Webhooks werden laut Sangoma über die REST-API des Moduls
verwaltet; für die drei zustandsbezogenen Carpenters-Aufrufe ist deshalb ein
AMI-/Webhook-Adapter erforderlich. `Modules → SMS` enthält nur SMS-/MMS-Hooks
und ist für Anrufereignisse nicht geeignet.

Ein passender, von Sangomas CRM-Modul unabhängiger Adapter liegt bereits unter
[`Plugins/freepbx`](../../Plugins/freepbx/README.md). Das fertige Tar-Gzip-Paket
wird über `Admin → Module Admin → Upload Modules` installiert. Es verbindet sich
nur mit dem lokalen AMI-Port, wird vom FreePBX-PM2-Modul überwacht und sendet die
drei HTTPS-Aufrufe an Carpenters. Eine eigene Einstellungsseite verwaltet die
geschützte Environment-Datei und bietet einen AMI-Verbindungstest.

- [Sangoma CRM REST API und Menüpfad](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/29491369/Sangoma+CRM+REST+API)
- [Sangoma Module Admin](https://sangomakb.atlassian.net/wiki/spaces/PG/pages/20023939)

Alle Aufrufe verwenden `POST`, `Content-Type: application/json` und den Header:

```text
X-Carpenters-FreePBX-Secret: <einmalig angezeigtes Secret>
```

Das Ziel muss von FreePBX aus per HTTPS erreichbar sein. Das Secret gehört
weder in die URL noch in Asterisk-Logs. Nach einer Rotation funktionieren alte
Hooks absichtlich nicht mehr.

## Ereignisvertrag

Für alle Ereignisse desselben Gesprächs muss die unveränderte Asterisk
`Linkedid` als `call_id` gesendet werden. Dadurch werden parallele Nebenstellen
und wiederholte Zustellungen nicht als mehrere Anrufe gespeichert.

Klingeln und angenommen:

```json
{
  "call_id": "asterisk-1794567890.42",
  "caller_number": "0711 123450",
  "called_number": "20"
}
```

Beendet:

```json
{
  "call_id": "asterisk-1794567890.42",
  "caller_number": "0711 123450",
  "duration_seconds": 125
}
```

Optional kann `timestamp` als ISO-8601-Zeit oder Unix-Zeit mitgegeben werden.
Fehlt das Feld, verwendet Carpenters die Empfangszeit. Zusätzlich versteht der
Parser die Asterisk-Feldnamen `Linkedid`, `Uniqueid`, `CallerIDNum`, `Exten` und
`BillableSeconds`.

Geeignete Asterisk-Ereignisse sind:

| Carpenters-Hook | Asterisk-Ereignis |
|---|---|
| `ringing` | `DialBegin` eines eingehenden Gesprächs |
| `answered` | `DialEnd` mit `DialStatus: ANSWER` oder Kanalstatus `Up` |
| `ended` | `Hangup` beziehungsweise ein Hangup-Handler |

Asterisk dokumentiert, dass `DialBegin` und `DialEnd` ein Paar bilden und die
`Linkedid` die älteste zusammengehörige Kanal-ID bezeichnet. Ein
Hangup-Handler folgt dem Kanal auch bei Änderungen im Dialplan. Der Adapter
soll HTTP-Aufrufe asynchron und mit kurzem Timeout ausführen, weil langsame
Arbeit im Hangup-Pfad die Telefonie verzögern kann.

- [Asterisk AMI DialBegin](https://docs.asterisk.org/Latest_API/API_Documentation/AMI_Events/DialBegin/)
- [Asterisk AMI v2 und DialBegin/DialEnd](https://docs.asterisk.org/Configuration/Interfaces/Asterisk-Manager-Interface-AMI/AMI-v2-Specification/)
- [Asterisk Hangup-Handler](https://docs.asterisk.org/Configuration/Dialplan/Subroutines/Hangup-Handlers/)

## Ablauf in Carpenters

Carpenters normalisiert die Anrufernummer mit der eingestellten Landesvorwahl
und vergleicht sie mandantenbezogen mit `phoneMobile` und `phoneLandline` der
nicht gelöschten Kunden. Bei genau einem Treffer erscheinen während des
Klingelns Name, E-Mail und Nummer in einem globalen Modal und einer
platzschaffenden Statusleiste. Bei doppelten Kundennummern wird aus Gründen der
Datenintegrität keine automatische Zuordnung vorgenommen.

Nach `ended` wird ein unveränderlicher `Communication`-Eintrag mit Quelle
`asterisk`, Zeitpunkt, Status und Dauer erzeugt. Die Gesprächsnotiz bleibt als
einziges editierbares Feld verfügbar und jede Änderung wird auditiert.

## API

| Methode | Pfad | Schutz | Zweck |
|---|---|---|---|
| `GET` | `/api/contact-history/freepbx/settings` | Admin + CRM | Konfiguration ohne Secret laden |
| `PUT` | `/api/contact-history/freepbx/settings` | Admin + CRM + CSRF | Konfiguration speichern und beim ersten Mal Secret erzeugen |
| `POST` | `/api/contact-history/freepbx/settings/rotate-secret` | Admin + CRM + CSRF | Secret ersetzen und einmalig ausgeben |
| `DELETE` | `/api/contact-history/freepbx/settings/secret` | Admin + CRM + CSRF | Integration deaktivieren und Secret löschen |
| `GET` | `/api/contact-history/calls/active` | Admin/Manager + CRM | aktive Anrufe nach einem Reconnect laden |
| `GET` | `/api/contact-history/calls/events` | Admin/Manager + CRM | mandantengefilterter SSE-Livestream |
| `POST` | `/api/integrations/freepbx/webhook/:tenantId/:event` | Webhook-Secret | Asterisk-Ereignis annehmen |

Die Webhook-Route liegt absichtlich vor den Browser-Origin- und CSRF-Prüfungen.
Sie authentifiziert stattdessen mit einem konstantzeitlich verglichenen,
mandantenbezogen AES-GCM-verschlüsselten Secret. Browser-APIs bleiben weiterhin
Cookie-, Rollen-, Lizenz- und CSRF-geschützt.
