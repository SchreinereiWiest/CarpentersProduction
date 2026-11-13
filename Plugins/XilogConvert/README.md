# XilogConvert

XilogConvert ist eine eigenständige Windows-Anwendung für den Xilog-3-Workflow.
Sie nimmt das vom CarpentersProduction-CNC-Editor exportierte ZIP mit
XXL-Dateien entgegen und übersetzt jede XXL-Datei mit der originalen
Konsolenanwendung `xISO.exe` in eine binäre PGM-Datei.

Die Anwendung unterstützt:

- ZIP-Auswahl und Drag-and-drop;
- einen dauerhaft gespeicherten Zielordner;
- einzelne PGM-Dateien, ein PGM-ZIP oder beides;
- Xilog-kompatible Programmnamen mit höchstens acht Zeichen;
- Auswertung der von xISO erzeugten INF-Datei;
- Abbruch, Zeitlimit und ein sichtbares Konvertierungsprotokoll;
- SHA-256-Prüfung der mit der Anwendung ausgelieferten `xISO.exe`.

Freigegeben ist die vorhandene Konsolenversion mit SHA-256
`131fd70a17ce4b05656b983d049e80d181d42a442a4baa04a082dcc85cdedba0`.

Die Anwendung ist vollständig portabel. Ihre Laufzeitkonfiguration liegt in
der `.env` direkt neben `XilogConvert.exe`; relative Pfade werden immer relativ
zu diesem Ordner aufgelöst.

## Windows-Anwendung bauen

Voraussetzung auf dem Build-Rechner ist das **.NET 8 SDK**. Im Ordner
`Plugins\XilogConvert` ausführen:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\build.ps1
```

Alternativ kann `build.cmd` per Doppelklick gestartet werden.

Wird nur der Ordner `XilogConvert` auf einen Windows-Rechner kopiert, muss
`XILOGCONVERT_BUILD_XISO_SOURCE` in der `.env` auf die dort vorhandene
Konsolenanwendung zeigen, beispielsweise:

```dotenv
XILOGCONVERT_BUILD_XISO_SOURCE=C:\Programme\Xilog3\xISO.exe
XILOGCONVERT_XISO_PATH=.\xISO.exe
```

Der erste Pfad gilt nur beim Build. Der zweite Pfad ist der portable
Laufzeitpfad im veröffentlichten Ordner. Ist der Build-Quellpfad nicht
vorhanden, verwendet das Skript als portable Alternative eine `xISO.exe` am
Laufzeitpfad – mit der Standardkonfiguration also direkt neben `build.cmd`.

Das Skript veröffentlicht eine eigenständige Windows-x64-Anwendung. Quelle und
Ziel der `xISO.exe` liest es aus der portablen `.env`. Mit der mitgelieferten
Konfiguration wird `WiestMoebelDesign\Xiso\xISO.exe` in den Ausgabeordner
übernommen. Erzeugt werden:

```text
artifacts\XilogConvert-win-x64.zip
publish\win-x64\XilogConvert.exe
```

Für einen 32-Bit-Windows-Rechner:

```powershell
.\build.ps1 -Runtime win-x86
```

Auf dem Zielrechner wird keine separate .NET-Installation benötigt. Der
komplette Inhalt des Distributions-ZIP muss zusammen in einem Ordner bleiben:

```text
XilogConvert.exe
.env
xISO.exe
README.md
```

Unterstützt werden aktuelle Windows-10- und Windows-11-Systeme. Die x86-Ausgabe
ist für ein 32-Bit-Windows gedacht, nicht für historische Windows-XP-Steuerungen.

Die Anwendung ist derzeit nicht digital signiert. Windows SmartScreen kann
daher beim ersten Start eine Rückfrage anzeigen.

## Bedienung

1. Im CNC-Editor das Xilog-Programm-ZIP exportieren.
2. Das ZIP auf das große Eingabefeld ziehen oder über **ZIP auswählen** öffnen.
3. Zielordner und Ausgabeart festlegen.
4. **XXL in PGM konvertieren** ausführen.

Der Zielordner, die Ausgabeart und die Überschreiboption werden portabel in
`settings.json` neben der Anwendung gespeichert. Liegt der gewählte Zielordner
innerhalb des Anwendungsordners, wird er dort als relativer Pfad abgelegt.
Ein ZIP kann außerdem auf `XilogConvert.exe` gezogen oder über **Öffnen mit**
an die Anwendung übergeben werden.

## Portable `.env`

Die `.env` ist beim Start zwingend erforderlich. Gleichnamige echte
Windows-Umgebungsvariablen überschreiben die Werte aus der Datei. Pfade dürfen
absolut oder relativ sein; `${APP_DIR}` steht für den Ordner der Anwendung und
auch Windows-Variablen wie `%TEMP%` werden aufgelöst.

| Variable | Bedeutung |
| --- | --- |
| `XILOGCONVERT_XISO_PATH` | Laufzeitpfad der xISO-Konsolenanwendung |
| `XILOGCONVERT_XISO_SHA256` | erwartete SHA-256-Prüfsumme der xISO-Datei |
| `XILOGCONVERT_BUILD_XISO_SOURCE` | xISO-Quelldatei für `build.ps1` |
| `XILOGCONVERT_SETTINGS_PATH` | Pfad der portablen `settings.json` |
| `XILOGCONVERT_DEFAULT_OUTPUT_PATH` | Zielordner beim ersten Start |
| `XILOGCONVERT_DEFAULT_EXPORT_MODE` | `files`, `zip` oder `files-and-zip` |
| `XILOGCONVERT_DEFAULT_OVERWRITE` | vorhandene Ausgaben standardmäßig ersetzen |
| `XILOGCONVERT_TEMP_PATH` | temporärer Arbeitsordner |
| `XILOGCONVERT_COMPILER_TIMEOUT_SECONDS` | Zeitlimit je XXL-Datei |
| `XILOGCONVERT_MAX_PROGRAMS` | maximale Anzahl XXL-Dateien je ZIP |
| `XILOGCONVERT_MAX_UNPACKED_MB` | maximale entpackte Gesamtgröße |

## Sichere Konvertierung

XilogConvert stellt keine frei programmierbare Shell-Schnittstelle bereit. Es
startet ausschließlich die über `XILOGCONVERT_XISO_PATH` konfigurierte und per
SHA-256 geprüfte `xISO.exe`. Die XXL-Dateien werden unter internen 8.3-Dateinamen in einem
isolierten temporären Ordner verarbeitet. Eine Ausgabe wird nur veröffentlicht,
wenn xISO beendet wurde, die INF-Datei `[ERRORS]=0` meldet und eine nicht leere
PGM-Datei vorliegt.

Das Eingabe-ZIP darf maximal 5.000 XXL-Dateien beziehungsweise insgesamt
250 MB entpackte XXL-Daten enthalten. Andere Dateien aus dem ZIP werden
ignoriert. Bei einem Fehler wird der temporäre Auftrag verworfen.

## xISO

`xISO.exe` ist eine proprietäre SCM/Xilog-Komponente und bleibt außerhalb des
Quellordners. Das Build-Skript übernimmt die in
`XILOGCONVERT_BUILD_XISO_SOURCE` konfigurierte lokale Kopie. Vor einer
Weitergabe der gebauten Anwendung muss die Berechtigung zur Verteilung dieser
Komponente geklärt werden.

