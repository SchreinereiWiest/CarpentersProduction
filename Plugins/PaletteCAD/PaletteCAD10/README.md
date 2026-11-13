# CProduction-Plugin fuer Palette CAD 10

## Installation

1. Palette CAD beenden.
2. `Installieren.cmd` doppelklicken.
3. Nach erfolgreicher Installation Palette CAD wieder starten.

### Einzeldatei-Installer bauen

`..\build-installer.ps1` fasst das komplette Installationspaket in einer
selbstentpackenden Windows-Datei zusammen:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ..\build-installer.ps1
```

Das Ergebnis ist `..\PaletteCAD10_Plugin.cmd`. Nur diese eine Datei muss auf
den Zielrechner kopiert und dort per Doppelklick ausgefuehrt werden. Sie
entpackt ihren Inhalt temporaer, startet den Installer und entfernt die
temporaeren Dateien anschliessend wieder. Weitere Build-Hinweise stehen in
`..\README.md`.

Der Installer legt fehlende Zielordner an und kopiert diese Dateien:

| Datei | Ziel |
| --- | --- |
| `createCpImport.ps1`, `createCpImport.cmd` | `C:\PaletteCAD\Projects\CProduction` |
| `Forms\CProduction.xml` | `C:\PaletteCAD\Dat\Forms\Projects` |
| `Macros\Export CProduction.eval` | `C:\PaletteCAD\Dat\Macros\Wood` |
| `Schemas\CarpentersProduction.xml` | `C:\PaletteCAD\Dat\Bom\Schemas\Holz` |

Bereits vorhandene Dateien werden vor dem Ueberschreiben unter
`C:\PaletteCAD\CProduction-Installer-Backups` gesichert. Falls der Installer
keine Schreibrechte besitzt, `Installieren.cmd` per Rechtsklick als
Administrator starten.

Zum Erstellen des `.cpimport`-Pakets wird die in Windows enthaltene
PowerShell verwendet. Eine separate Python-Installation ist nicht notwendig.
Der Aufruf erfolgt ueber `createCpImport.cmd`, damit keine systemweite
Aenderung der PowerShell-Ausfuehrungsrichtlinie erforderlich ist. Fuer einen
manuellen Test im Exportordner daher nicht `./createCpImport.ps1`, sondern
`./createCpImport.cmd` ausfuehren. Ohne Parameter wird das Paket als
`CProduction.cpimport` im Downloadordner des angemeldeten Benutzers erstellt:

```bat
createCpImport.cmd
```

Ein anderes Ausgabeziel kann weiterhin als erster Parameter angegeben werden:

```bat
createCpImport.cmd "C:\Users\Benutzer\Downloads\Projekt.cpimport"
```

Die PDF-, JSON- und PNG-Eingabedateien werden immer im Ordner des Skripts
gesucht. Der erste Positionsparameter kann eine `.cpimport`-Datei, ein
Dateipfad ohne Endung oder ein bereits vorhandener Zielordner sein.

Bei einer abweichenden Palette-CAD-Installation kann der Stammordner in einer
Eingabeaufforderung angegeben werden:

```bat
Installieren.cmd -PaletteCadRoot "D:\PaletteCAD"
```
