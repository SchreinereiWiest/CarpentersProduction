# Projektmodule

## Korpuskonfigurator

Der `CabinetEditor` ist der zentrale Editor für ein oder mehrere Möbelkorpusse. Er lädt Materialien, Projekt-/Kundendaten, Korpus- und CNC-Einstellungen sowie vorhandene `cabinet.json`-/`list.json`-Daten. Der lokale State enthält aktive Auswahl, Ansicht, Split-Spezifikationen, Presets, Speicherstatus und den gesamten Korpusbaum.

### Verarbeitungskette

1. Korpusgrunddaten und Innen-/Frontsektionen erzeugen oder laden.
2. Sektionen teilen, zusammenführen und mit Funktionen wie Fachboden oder Legrabox versehen.
3. Fronten aus dem Sektionsbaum ableiten und editieren.
4. `buildPartList` erzeugt geometrische Teile, Kanten, Materialien und Beschläge.
5. `compileCnc` ergänzt CNC-Operationen anhand Korpus-, Sektions- und Verbinderlogik.
6. `ProjectSave` führt manuelle und neu generierte Teile zusammen und schreibt Projekt-/JSON-Daten.

Die UI ist in Sidebar, Eigenschaftspanels und SVG-Viewport getrennt. View-Layer zeichnen Raster, Korpus, Innenleben, Fronten und Bemaßung unabhängig voneinander.

## Teileliste

`processContent` gruppiert und normalisiert die generierte Liste für Anzeige und Weiterverarbeitung. `createPartsListPDF` erzeugt ein PDF mit `jsPDF`/AutoTable. Manuell gepflegte Teile werden beim erneuten Generieren durch `mergeManualPartList` erhalten, sofern ihre Identität nicht mit automatisch erzeugten Teilen kollidiert.

## CAD

`cadParser.project.js` wandelt importierte CAD-JSON-Werte in die interne Parent-/Board-Struktur um. `cadLoader.project.js` lädt Dateimetadaten und signierte Inhalte. `cad.project.jsx` rendert GLB-Modelle oder Board-Geometrien und hält die aktuelle Auswahl für das Editorpanel.

## Nesting

Die Nesting-Pipeline verarbeitet die Teileliste zu Platten und Streifen:

1. `createPlateList` übernimmt Maße, Menge, Material und Kanten.
2. `findStorageMaterial` ordnet Lagerplatten nach Materialnummer und Stärke zu.
3. `calculateNesting` gruppiert kompatible Teile und delegiert an die Platzierungsalgorithmen.
4. `createStrips`, `nestPlates2D`, `nestStrips` und `nestWithRemainingPlates` erzeugen Kandidaten und Plattenpläne.
5. Manuelle Funktionen prüfen, konfigurieren und verschieben Streifen ohne Überlappung.
6. `NestingScene` visualisiert Platten, Teile, Freiräume, Schnitte und Drag-Interaktionen.

`nestPlates2D` bewertet Reihenfolgen und freie Rechtecke deterministisch anhand Flächennutzung, Schnittmetriken und Restflächen. Die Ergebnisdaten werden als `nesting.json` projektbezogen gecacht und gespeichert.

## Zuschnitt

`CutScene` zeigt den aktuell abzuarbeitenden Plattenstapel. Teile lassen sich auswählen und als erledigt markieren; Kamera und Geometrien werden auf Plattenmaß angepasst. Eingangsdaten sind die gespeicherten Nesting-Ergebnisse.

## CNC-Editor

`groupCncParts` fasst geometrisch und programmatisch identische Teile zusammen. Die Signatur berücksichtigt Abmessungen, Material und normalisierte CNC-Operationen. `CncViewport` zeichnet Teilkontur, Operationen und Maße für Fläche A oder B; Sidebars verwalten Gruppen-, Teil- und Operationsauswahl.

Unterstützte Darstellungen sind Bohren, Nuten, Fräsen, Fachboden, VB/VBH und Legrabox. `cncToSvg` transformiert Maschinenkoordinaten in ViewBox-Koordinaten; gemeinsame Operation-Utilities liefern ID, Maße sowie Auswahlfarben.

## CNC-Compiler

Der Compiler des Korpuskonfigurators leitet Operationen aus Bauteilrolle, Position, Verbinder- und Sektionskonfiguration ab. Wichtige Stufen:

- `ensureCnc` normalisiert die CNC-Struktur jedes Teils.
- `resolveSectionBoundaries` ordnet Sektionsgrenzen realen Bauteilen zu.
- `compileShelf`, `compileLegrabox` und `compileSpax` erzeugen fachbezogene Operationen.
- `compileSectionFunctions` verarbeitet Funktionen im Sektionsbaum.
- `compileCnc` koordiniert Rückwand, Beschläge, Verbinder und Sektionsoperationen.

Die Compilerfunktionen verändern beziehungsweise ergänzen die Teileliste. Aufrufer sollten Eingaben deshalb nicht als unveränderlich behandeln.

## Projektzeiterfassung

`TimeTracking` lädt Projektzeiten und Firmeneinstellungen. `TimeControls` startet, stoppt oder erzeugt Dauerbuchungen und lädt für berechtigte Rollen Benutzeroptionen. `TimeHistory`/`TimeRow` formatieren die Historie, `DurationInput` kapselt die Eingabe einer Dauer.

