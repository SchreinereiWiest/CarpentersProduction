# Engine

Dieser Ordner enthält laufzeitneutrale Fachlogik, die sowohl vom Frontend als auch vom Backend verwendet werden kann.

- `management/`: Kostenrechnung, Defaults, Validierungshilfen und CSV-Import
- `cabinetConfigurator/`: Korpus-, Sektions-, Teilelisten- und CNC-Compilerlogik
- `cnc/`: Aufbereitung und Gruppierung fertiger CNC-Teile
- `utils/`: fachübergreifende ID- und Baumoperationen

Module in diesem Ordner dürfen weder React noch Axios oder Browser-APIs importieren. Ein- und Ausgabe bleibt in den jeweiligen Anwendungen. Das Frontend verwendet dafür den Vite-Alias `@Engine`; Node kann die ESM-Einstiegspunkte in `package.json` oder direkte relative Imports nutzen.

Der Frontend-Adapter `Frontend/src/pages/projects/cabinetConfigurator/services/projectSave.js` ist ein Beispiel für diese Grenze: Die Engine erzeugt und vereinigt die Teileliste, der Adapter lädt und speichert die Dateien.
