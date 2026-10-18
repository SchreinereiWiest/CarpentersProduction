# Plugin-Builds

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

