# Modulares CNC-Postprozessor-System

## Zielbild

Das interne Datenmodell beschreibt **was** gefertigt werden soll. Ein Postprozessor beschreibt **wie** eine konkrete Maschine diese Bearbeitung ausführt. Dadurch bleiben Cabinet Editor und Partlist unabhängig von Herstellerformaten.

```text
Cabinet functionConfig
        │
        ▼
buildPartList / internes CNC-Modell
        │
        ├── Bearbeitungszuordnung (z. B. Eckverbindung → Clamex)
        │
        ▼
Postprozessor-Runtime
        ├── translateForViewer()   → CNC-Viewer-Operationen
        ├── resolveMachining()     → Maschinenstrategie + Diagnose
        └── generateMachineCode()  → geprüfter Maschinen-/G-Code
```

Der CNC-Editor nutzt `generateMachineCode()` für konfigurierte Maschinenexporte. `buildPartList` und CNC Viewer werden weiterhin nicht automatisch umgeleitet.

## SCM Xilog 3 / RoutoLink (Wiest)

Der registrierte Adapter `scm-xilog3-routolink` ist ein erster Werkstattentwurf auf Grundlage der vorhandenen Xilog-3-Runtime, realer PGM-Programme, der dort installierten Festzyklen und der deutschen Befehlsreferenz. Er erzeugt das von Xilog importierbare ASCII-Format **XXL** mit CRLF-Zeilen und deklariert Windows-1252 als Zielkodierung. Das proprietäre binäre PGM-Format wird bewusst nicht nachgebaut.

Jedes gültige Programm endet mit einem konfigurierbaren Wegfahrschritt `N=<Position>`. Für das einzelne Feld A ist `1600`, für das volle Feld AD `2800` vorbelegt. Beide Werte gehören zur Maschinenkonfiguration des Plugins und können dort angepasst werden.

Aktuell abgedeckt sind `BO`, `VB`, `VBH`, `LR`, `RNT`/`NUT8`, `XG0` und `XL2P` auf Werkstückseite A. Für horizontale Bohrungen und Rückwandnuten werden die in der Wiest-Runtime vorhandenen Zyklen `VBH` und `RNT` angesprochen. Unbekannte Operationen oder unvollständige Geometrie blockieren den Export vollständig.

Jede erzeugte Datei trägt die Diagnose `XILOG3_IMPORT_VALIDATION_REQUIRED`: XXL in Xilog 3 importieren, grafisch prüfen und erst nach Maschinenfreigabe in PGM übernehmen. Direkter Maschinentransport ist nicht Bestandteil dieses Plugins.

## Verantwortungsgrenzen

- `functionConfig` bleibt semantisch und maschinenunabhängig.
- `cncDefault.machiningAssignments` ordnet Anwendungsfälle einer Strategie zu.
- Ein Plugin veröffentlicht alle Strategien, die seine Maschine tatsächlich unterstützt.
- Das Plugin übersetzt Geometrie, Koordinaten, Werkzeuge und Strategien in Viewer-Operationen beziehungsweise Maschinencode.
- Nicht unterstützte Bearbeitungen liefern Diagnosen und dürfen nicht stillschweigend ersetzt werden.
- Nur ein konkretes, getestetes Maschinen-Plugin darf ausführbaren Code als unterstützt melden.

## Neues Plugin hinzufügen

1. Eine Datei unter `plugins/` anlegen.
2. `manifest` und die drei Vertragsmethoden aus `contract.js` implementieren.
3. Das Plugin ausschließlich in `availablePostprocessors.js` importieren und registrieren.
4. Vertrags-, Geometrie- und Golden-File-Tests für den erzeugten Maschinencode ergänzen.

Die Settings-Oberfläche erzeugt Dropdown und Konfigurationsfelder vollständig aus dem Manifest. Für ein neues Plugin ist keine Änderung am Panel erforderlich.

## Strategieabhängige Bearbeitungsparameter

Die Parameter-Navigation zeigt nur Strategien, die zugleich vom aktiven Plugin unterstützt und in `machiningAssignments` verwendet werden. Derzeit existieren Ansichten für Bohrverbinder, Clamex, Fachboden-Lochreihen, Legrabox, Rückwandnut und Rückwandfalz. Werkzeugnummern, Drehzahlen und herstellerspezifische Werkzeugdaten gehören nicht in diese allgemeinen Parameter, sondern in das jeweilige Postprozessor-Plugin.

## Plugin-Vertrag

```js
export const examplePlugin = {
  manifest: {
    id: "vendor-machine-model",
    name: "Vendor Machine Model",
    version: "1.0.0",
    apiVersion: 1,
    capabilities: {
      viewer: true,
      machineCode: true,
      machiningResolution: true
    },
    supportedMachiningStrategies: [],
    configuration: []
  },
  translateForViewer(context) {},
  resolveMachining(context) {},
  generateMachineCode(context) {}
};
```

Konfigurationsfelder unterstützen derzeit `text`, `number`, `boolean`, `select` und `json`. Werkzeugtabellen oder herstellerspezifische Parametersätze können deshalb als JSON-Feld beginnen und später durch eigene Feldtypen erweitert werden.

## Empfohlene nächste Ausbaustufen

1. Ein neutrales, versioniertes internes `MachiningIntent`-Schema zwischen Partlist und Runtime definieren.
2. Den CNC Viewer über `translatePartForCncViewer()` anbinden und Legacy-Operationen parallel vergleichen.
3. Den Xilog-Adapter mit Werkstatt-Golden-Files, Simulation und einem dokumentierten Freigabestatus weiter absichern.
4. Werkzeugzuordnung und weitere Xilog-Befehle ergänzen; unvollständige Programme weiterhin vollständig blockieren.
5. Optional einen Transportadapter für Dateiablage oder Netzwerkfreigabe ergänzen. Transport und Codeerzeugung sollten getrennte Plugins bleiben.
