# Carpenters CRM Adapter für FreePBX 17

Dieses Verzeichnis enthält ein hochladbares FreePBX-Modul für FreePBX 17. Es
verbindet sich ausschließlich lokal mit Asterisk AMI und überträgt eingehende
Anrufzustände per HTTPS an Carpenters:

| Asterisk-Ereignis | Carpenters-Zustand |
|---|---|
| `DialBegin` | `ringing` |
| `Newstate: Up`, `BridgeEnter` oder `DialEnd: ANSWER` | `answered` |
| `Hangup` des eingehenden Hauptkanals | `ended` |

Der Prozess läuft als Benutzer `asterisk` unter dem FreePBX-PM2-Modul. Es wird
kein neuer Netzwerkport geöffnet. AMI bleibt auf `127.0.0.1:5038` gebunden.

## Enthaltene Dateien

- `dist/carpenters-17.0.1.tar.gz`: fertiges Upload-Modul;
- `dist/carpenters-17.0.1.tar.gz.sha256`: SHA-256-Prüfsumme;
- `module/carpenters`: FreePBX-Modulquellen;
- `adapter.py`: AMI-/Webhook-Adapter;
- `build-module.sh`: reproduzierbarer Paketbau;
- `tests`: Adaptertests.

## Schritt 1: AMI-Benutzer in FreePBX anlegen

1. Als Administrator an FreePBX anmelden.
2. `Einstellungen → Asterisk-Manager` öffnen.
3. Einen neuen Benutzer anlegen:
   - Name: `carpenters`
   - Secret/Passwort: eigenes zufälliges Passwort mit mindestens 16 Zeichen
   - Verweigern: `0.0.0.0/0.0.0.0`
   - Zulassen: `127.0.0.1/255.255.255.255`
   - Leserechte: ausschließlich `call`
   - Schreibrechte: keine
4. Speichern und oben **Konfiguration anwenden** wählen.
5. Unter `Einstellungen → Asterisk-Manager` kontrollieren, dass die globale
   Bind-Adresse weiterhin `127.0.0.1` und der Port `5038` ist.

Vorhandene FreePBX-Systembenutzer dürfen nicht verändert werden. Insbesondere
darf Port 5038 weder im Router noch in der FreePBX-Firewall freigegeben werden.

## Schritt 2: Webhook-Daten in Carpenters erzeugen

1. In Carpenters
   `Firmeneinstellungen → Advanced → Kontaktverlauf → Telefonie` öffnen.
2. Die richtige Standard-Landesvorwahl, beispielsweise `+49`, eintragen.
3. **FreePBX-Webhooks aktivieren** und **Telefonie speichern** wählen.
4. Folgende vier Werte sicher bereithalten:
   - URL für `ringing`;
   - URL für `answered`;
   - URL für `ended`;
   - das einmalig angezeigte Webhook-Secret.

Das AMI-Passwort und das Carpenters-Webhook-Secret sind zwei unterschiedliche
Zugangsdaten. Das Webhook-Secret steht nicht in einer URL.

## Schritt 3: PM2-Modul prüfen

Der Adapter wird vom offiziellen FreePBX-PM2-Modul überwacht.

1. `Administrator → Module Admin` öffnen.
2. Nach `PM2 Process Manager` beziehungsweise `pm2` suchen.
3. Falls es nicht installiert und aktiviert ist, das Modul installieren,
   aktivieren und anschließend **Apply Config** ausführen.

Das Carpenters-Modul deklariert `pm2` als Abhängigkeit. Je nach
FreePBX-Konfiguration wird die fehlende Abhängigkeit bereits während der
Installation angezeigt.

## Schritt 4: Carpenters-Modul hochladen

Die fertige Datei befindet sich hier:

```text
Plugins/freepbx/dist/carpenters-17.0.1.tar.gz
```

In FreePBX:

1. `Administrator → Module Admin` öffnen.
2. **Upload Modules** beziehungsweise **Module hochladen** wählen.
3. Typ **Upload Local Module** auswählen.
4. `carpenters-17.0.1.tar.gz` auswählen und hochladen.
5. Danach **Local Module Administration** öffnen.
6. `Carpenters CRM Adapter` aufklappen und **Install** wählen.
7. Unten **Process**, danach **Confirm** wählen.
8. Abschließend oben **Apply Config** ausführen.

Das lokal entwickelte Modul kann als **Unsigned** angezeigt werden. Das ist
bei einem eigenen Modul erwartbar. Die globale FreePBX-Signaturprüfung deshalb
nicht deaktivieren. Vor dem Upload kann die Datei geprüft werden:

```bash
sha256sum -c carpenters-17.0.1.tar.gz.sha256
```

## Schritt 5: Passwort und Webhooks eintragen

1. In FreePBX `Einstellungen → Carpenters CRM Adapter` öffnen.
2. AMI-Benutzer `carpenters` eintragen.
3. Das in Schritt 1 erzeugte AMI-Passwort eintragen.
4. Die drei vollständigen HTTPS-URLs aus Carpenters einfügen.
5. Das einmalig angezeigte Carpenters-Webhook-Secret einfügen.
6. Die Standardwerte der eingehenden Kontexte zunächst unverändert lassen:

   ```text
   from-trunk,from-pstn,from-did,ext-did
   ```

7. **Adapter aktivieren** markieren.
8. **Save and apply** wählen.

Gespeicherte Passwörter werden in der Oberfläche nicht erneut angezeigt. Bei
späteren Änderungen bleiben leere Passwortfelder unverändert. Ein neuer Wert
ersetzt den zuvor gespeicherten Wert.

## Schritt 6: AMI-Verbindung prüfen

Auf derselben Modul-Seite **Test saved AMI connection** wählen. Eine
erfolgreiche Prüfung meldet:

```text
OK: Konfiguration gültig und AMI-Anmeldung erfolgreich.
```

Der Test meldet sich nur lokal an AMI an. Er sendet keinen Webhook und löst
keinen Anruf aus. Anschließend einen echten eingehenden Testanruf durchführen.

Der Prozessstatus kann zusätzlich per SSH geprüft werden:

```bash
fwconsole pm2 --list
tail -n 100 /var/log/asterisk/carpenters-freepbx-adapter_out.log
tail -n 100 /var/log/asterisk/carpenters-freepbx-adapter_err.log
```

Passwörter und Secrets werden nicht in die Adapterlogs geschrieben.

## Environment-Datei und Passwortverwaltung

Das Modul speichert die Laufzeitkonfiguration außerhalb des Webroots:

```text
/var/lib/asterisk/carpenters/freepbx-adapter.env
```

Eigenschaften:

- Besitzer ist der FreePBX-Webbenutzer beziehungsweise `asterisk`;
- Verzeichnisrechte `0700`, Dateirechte `0600`;
- nur der lokale Adapterprozess liest die Datei;
- Passwörter werden Base64-kodiert, damit Sonderzeichen verlustfrei bleiben;
- Base64 ist keine Verschlüsselung, der Schutz entsteht durch die Dateirechte;
- die Werte werden weder in `module.xml` noch im Webverzeichnis gespeichert.

Die Verwaltung über `Einstellungen → Carpenters CRM Adapter` ist empfohlen.
Für eine ausschließlich lokale Kontrolle per SSH:

```bash
ls -ld /var/lib/asterisk/carpenters
ls -l /var/lib/asterisk/carpenters/freepbx-adapter.env
sudo -u asterisk /usr/bin/python3 -I \
  /var/www/html/admin/modules/carpenters/bin/adapter.py \
  --env-file /var/lib/asterisk/carpenters/freepbx-adapter.env \
  --validate-config
```

Für ein manuelles Backup der Konfiguration:

```bash
install -o root -g root -m 0600 \
  /var/lib/asterisk/carpenters/freepbx-adapter.env \
  /root/carpenters-freepbx-adapter.env.backup
```

Das Backup enthält Zugangsdaten und darf nicht unverschlüsselt auf gemeinsam
genutzte Dateispeicher kopiert werden.

### Manuelles Ändern der ENV-Datei

Nur verwenden, wenn die FreePBX-Modulseite nicht verfügbar ist:

```bash
sudo -u asterisk nano /var/lib/asterisk/carpenters/freepbx-adapter.env
```

Die Felder `AMI_PASSWORD_B64` und `CARPENTERS_WEBHOOK_SECRET_B64` enthalten
Base64. Um einen Wert zu erzeugen, ohne ihn als Befehlsargument in die
Shell-Historie zu schreiben:

```bash
read -rsp 'Geheimwert: ' CARPENTERS_SECRET_VALUE
echo
printf '%s' "${CARPENTERS_SECRET_VALUE}" | base64 -w0
echo
unset CARPENTERS_SECRET_VALUE
```

Die Ausgabe zwischen die einfachen Anführungszeichen des entsprechenden
`*_B64`-Feldes kopieren. Danach über die Modulseite speichern oder den Prozess
neu starten:

```bash
fwconsole pm2 --restart carpenters-freepbx-adapter
```

## Andere eingehende Asterisk-Kontexte

Der Adapter folgt der `Linkedid` des ersten eingehenden Kanals über
Klingelgruppen und Nebenstellen. Falls im Log kein Klingelereignis erscheint,
den tatsächlichen Eingangskontext in Asterisk prüfen und dessen Präfix unter
**Incoming context prefixes** ergänzen. Interne Gespräche werden absichtlich
nicht an Carpenters übertragen.

## Aktualisieren

1. Ein neues `carpenters-<version>.tar.gz` über **Upload Modules** hochladen.
2. In **Local Module Administration** das Update installieren.
3. **Apply Config** ausführen.

Die Environment-Datei unter `/var/lib/asterisk/carpenters` bleibt bei Updates
und einer normalen Deinstallation erhalten.

## Deinstallieren und Zugangsdaten löschen

Über `Administrator → Module Admin → Carpenters CRM Adapter → Uninstall` wird
der PM2-Prozess beendet und das Modul entfernt. Die Environment-Datei bleibt
für eine spätere Neuinstallation erhalten. Zur endgültigen Löschung danach per
SSH:

```bash
find /var/lib/asterisk/carpenters -maxdepth 1 -type f -name 'freepbx-adapter.env' -delete
rmdir /var/lib/asterisk/carpenters
```

Anschließend den AMI-Benutzer `carpenters` unter
`Einstellungen → Asterisk-Manager` löschen und das Webhook-Secret in
Carpenters über **FreePBX trennen** widerrufen.

## Modul neu bauen

Vom Verzeichnis `CarpentersProduction` aus:

```bash
./Plugins/freepbx/build-module.sh
```

Der Build übernimmt die aktuelle `adapter.py`, erzeugt ein Archiv mit dem
Top-Level-Ordner `carpenters` und schreibt die SHA-256-Prüfsumme nach `dist`.
