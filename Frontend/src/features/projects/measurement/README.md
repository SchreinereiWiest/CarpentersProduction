# Aufmaß-Modul

Der Einstiegspunkt des Moduls ist `MeasurementPage.jsx`. Diese Datei lädt und speichert den Workspace, hält den gemeinsamen Zustand und verbindet die spezialisierten Bausteine. Fachlogik und Darstellung liegen bewusst in Unterordnern.

## Verzeichnisstruktur

```text
measurement/
├── MeasurementPage.jsx        # Workspace-Orchestrierung und Persistenz
├── components/
│   ├── common/                 # Gemeinsam verwendete UI-Bausteine
│   ├── editor/                 # 2D-Editor, Objektgrafiken und Editor-Konfiguration
│   └── panels/                 # Werkzeuge, Eigenschaften, Ansichten und Fortschritt
├── config/                     # Standardansichten und Standardzustände
├── domain/                     # Reine Geometrie- und Ausrichtungslogik
├── import/                     # PDF-, DXF- und CAD-Einlesung
├── state/                      # Flüchtiger Workspace-Cache
├── utils/                      # Kleine allgemeine Hilfsfunktionen
└── views/
    ├── images/                 # Baustellen- und Projektbilder
    └── three/                  # GLB/CAD-Ansicht und Beleuchtung
```

## Datenfluss

1. `MeasurementPage.jsx` lädt Projekt, `aufmas.json`, `cabinet.json` und Projektdateien.
2. Dateien werden über `import/` in darstellbare PDF-Seiten, DXF-Formen oder CAD-Bauteile umgewandelt.
3. `components/editor/AufmasEditor.jsx` erzeugt und bearbeitet ansichtsbezogene Aufmaßobjekte.
4. Die Panel-Komponenten bearbeiten dasselbe Objektmodell und zeigen Status, Eigenschaften und Aufgaben an.
5. Änderungen werden im `state/workspaceCache.js` zwischengespeichert und verzögert als `aufmas.json` persistiert.
6. `views/three/` und `views/images/` ersetzen den 2D-Editor für ihre jeweiligen Ansichten.

## Typische Änderungen

- Neue Werkzeuge oder Editorinteraktionen: `components/editor/`
- Werkzeug- und Eigenschaftsoberflächen: `components/panels/`
- Fangpunkt-, Pan- oder Rechteckberechnungen: `domain/geometry.js`
- PDF-/DXF-/CAD-Verarbeitung: `import/`
- Standardansichten und Anzeigeoptionen: `config/defaults.js`
- 3D-Modell, Licht oder Schatten: `views/three/`
- Laden, Speichern oder Zusammenspiel aller Bereiche: `MeasurementPage.jsx`

Die Dateien in `domain/` und der überwiegende Teil von `import/` sind unabhängig von React und können direkt mit Vitest getestet werden.
