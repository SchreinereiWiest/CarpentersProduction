# Plugin-Builds

## FreePBX

`Plugins/freepbx` enthält ein über die FreePBX-Modulverwaltung hochladbares
Modul für FreePBX 17. Es liest eingehende Anrufzustände über einen ausschließlich
lokalen AMI-Benutzer und überträgt sie an die signierten Carpenters-Webhooks.
Installation, Passwort-/ENV-Verwaltung und Sicherheit sind in
`Plugins/freepbx/README.md` beschrieben.

## Palette CAD 10

Der selbstentpackende Einzeldatei-Installer wird aus dem Ordner `Plugins` mit
Windows PowerShell gebaut:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\build-installer.ps1
```

Das Build-Skript liest die Dateien aus `PaletteCAD10` und erzeugt daneben:

```text
PaletteCAD10_Plugin.cmd
```

Nur diese Datei muss auf den Zielrechner kopiert und dort per Doppelklick
ausgefuehrt werden.

## AV Product Fetch für Firefox

Die lieferantenübergreifende Browser-Erweiterung liegt unter
`Plugins/av-firefox-extension`. Zum lokalen Laden in Firefox wird unter
`about:debugging#/runtime/this-firefox` deren `manifest.json` ausgewählt.

Lieferanten, Shop-Startadressen und der Abrufweg werden in
CarpentersProduction unter **Einstellungen → Shop** konfiguriert.

## XilogConvert

Die Windows-Anwendung unter `Plugins/XilogConvert` konvertiert das vom
CNC-Editor erzeugte Xilog-XXL-ZIP über die originale xISO-Konsolenanwendung in
einzelne PGM-Dateien oder ein PGM-ZIP. Build und Bedienung sind in
`Plugins/XilogConvert/README.md` beschrieben.

