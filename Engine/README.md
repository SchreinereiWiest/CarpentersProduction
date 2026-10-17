# Engine

Dieser Ordner enthält laufzeitneutrale Fachlogik, die sowohl vom Frontend als auch vom Backend verwendet werden kann.

- `src/cabinet/`: Korpus-, Sektions-, Teilelisten- und CNC-Compilerlogik
- `src/calculation/`: Projektkalkulation und Schätzungen
- `src/cnc/`: Aufbereitung und Gruppierung fertiger CNC-Teile
- `src/management/`: Kostenrechnung, Defaults, Validierung und CSV-Import
- `src/nesting/`: laufzeitneutrale Nesting-Algorithmen
- `src/procurement/`: Beschaffungs- und Artikelregeln
- `src/contracts/`: gemeinsame Datenverträge für Frontend und Backend
- `src/shared/`: fachübergreifende ID- und Baumoperationen
- `browser/`: Adapter, die bewusst Browser-APIs benötigen, etwa die PDF-Erzeugung

Module in diesem Ordner dürfen weder React noch Axios oder Browser-APIs importieren. Ein- und Ausgabe bleibt in den jeweiligen Anwendungen. Das Frontend verwendet dafür den Vite-Alias `@Engine`; Node kann die ESM-Einstiegspunkte in `package.json` oder direkte relative Imports nutzen.

Der Frontend-Adapter `Frontend/src/features/projects/cabinet/services/projectSave.js` ist ein Beispiel für diese Grenze: Die Engine erzeugt und vereinigt die Teileliste, der Adapter lädt und speichert die Dateien.
