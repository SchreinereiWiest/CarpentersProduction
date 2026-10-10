# Öffentliche Funktionsreferenz

Diese Referenz beschreibt die aus Frontend-Modulen exportierten Funktionen, Hooks und Komponenten. Lokale Eventhandler und kleine, nicht exportierte Render-Helfer bleiben bei ihrer aufrufenden Seite gekapselt.

## Context, Routing und globale UI

| Export | Aufgabe |
|---|---|
| `AppProvider`, `useApp` | globalen Layout-/Navigationsstate bereitstellen beziehungsweise lesen |
| `AuthProvider`, `useAuth` | Session prüfen und Identität/Ladezustand über Context bereitstellen |
| `ProtectedRoute` | komplette Route nach Session und Rolle schützen |
| `ProtectedElement` | einzelnes UI-Element nach Session und Rolle ausblenden |
| `PublicRoute` | angemeldete Benutzer von öffentlichen Seiten weg navigieren |
| `SideBar`, `ProjectBar`, `SettingsBar` | globale, projektbezogene und administrative Navigation rendern |
| `ImageGallery`, `ImageCarousel` | signierte Bilder laden beziehungsweise als Karussell darstellen |
| `useCompanySettings` | Unternehmenssettings laden und Default-/Loading-State liefern |

## API, Settings und Cache

| Export | Aufgabe |
|---|---|
| `downloadFile(path)` | signierte JSON-URL anfordern und Inhalt laden |
| `uploadJSONFile(path,data)` | JSON an einen Backendpfad senden |
| `timeToMinutes(time)` | `HH:mm` in Minuten seit Tagesbeginn umwandeln |
| `normalizeCompanySettings(data)` | Settings mit Defaults und stabilen IDs normalisieren |
| `createWorkBlocks(settings)` | Arbeitsblöcke zwischen konfigurierten Pausen erzeugen |
| `getWorkTypeLabel(...)` | benutzerdefinierte oder konfigurierte Tätigkeitsbezeichnung auflösen |
| `loadCompanySettings()` | `settings-company.json` laden und normalisieren |
| `getProjectFile(options)` | Projektdatei über Memory → IndexedDB → Server laden |
| `uploadProjectFile(options)` | Projektdatei hochladen und beide Cache-Ebenen aktualisieren |
| `getGlobalFile(options)` | globale Datei über Memory → IndexedDB → Server laden |
| `uploadGlobalFile(options)` | globale Datei hochladen und cachen |
| `openDb()` | IndexedDB `carpentersproduction` öffnen/anlegen |
| `loadSettings()` | Cache-Konfiguration ohne normale Expiration laden |
| `getCachedGlobalFile`, `setCachedGlobalFile`, `invalidateGlobalFile` | globale IndexedDB-Einträge lesen, schreiben und entfernen |
| `getCachedProjectFile`, `setCachedProjectFile`, `invalidateProjectFile` | projektbezogene IndexedDB-Einträge lesen, schreiben und entfernen |
| `invalidateProject(projectId)` | alle Cacheeinträge eines Projekts entfernen |
| `invalidateAllProjects()` | gesamten gemeinsamen Object Store leeren |

## Benutzer- und Lager-API

| Export | Aufgabe |
|---|---|
| `getUsers`, `getUser` | Benutzerliste beziehungsweise Einzelbenutzer laden |
| `createUser`, `updateUser` | Benutzer anlegen beziehungsweise Stammdaten ändern |
| `changeUserPassword`, `deleteUser` | Passwort ersetzen beziehungsweise Benutzer soft-löschen |
| `MaterialModal` | Materialformular und Anlageworkflow rendern |
| `updateQuantity` | Materialmenge patchen und lokalen State aktualisieren |

## Mitarbeiterkalender

| Export | Aufgabe |
|---|---|
| `useEmployeeCalendar(settings)` | gesamten interaktiven Wochenkalenderzustand koordinieren |
| `loadWeek`, `loadDayEntries` | Wochen-JSON und serverseitige Tagesbuchungen laden |
| `saveEditedSlot`, `saveWeek` | einzelnen Slot und vollständige Wochenstruktur speichern |
| `toMinutes`, `addMinutesToTime` | Zeitformat-Konvertierungen |
| `getBlockForEntry` | passenden Arbeitsblock für einen Zeiteintrag bestimmen |
| `findInsertSlot`, `insertSlot` | freien Einfügepunkt suchen und Eintrag platzieren |
| `mergeFreeSlots`, `insertIntoSlots` | benachbarte Freiräume vereinigen und Slots rekursiv belegen |
| `updateSlot` | bearbeiteten Eintrag in der Kalenderstruktur ersetzen |
| `Personal`, `EmployeeCalendar`, `MissingTimes`, `DayColumn`, `TimeBlock`, `TimeSlot`, `EditTimeModal` | Kalenderseiten und visuelle Bausteine |

## Klassischer Projekteditor, CAD und Liste

| Export | Aufgabe |
|---|---|
| `useCorpus()` | State und Mutationen eines klassischen Korpus bereitstellen |
| `CorpusLeft`, `CorpusMiddle`, `CorpusRight` | Editorbereiche für Navigation, Korpusinhalt und Eigenschaften |
| `CustomerSearch` | debouncte Kundensuche und Auswahl |
| `ProjectSave(...)` in `edit/uploadProject.js` | Projekt, Uploads sowie generierte Listen-/Korpusdaten speichern |
| `importCadData(cadData,materials)` | CAD-Import in interne Korpus-/Materialstruktur überführen |
| `toFloat`, `parseCadJson` | CAD-Werte normalisieren und CAD-JSON parsen |
| `processContent(content)` | Teilelisten gruppieren und Anzeigeattribute ergänzen |
| `createPartsListPDF(data)` | formatierte Stückliste als PDF erzeugen |
| `CutScene` | Zuschnittstapel in React Three Fiber darstellen |
| `TimeTracking`, `TimeControls`, `TimeHistory`, `TimeRow`, `DurationInput` | Projektzeitseite und Unterkomponenten |

## Nesting

| Export | Aufgabe |
|---|---|
| `createPlateList(content)` | Teilelisteneinträge zu Nesting-Platten expandieren |
| `calculateNesting(...)` | Materialgruppen bilden und vollständigen Nestinglauf koordinieren |
| `splitRect(rect,strip,settings)` | freies Rechteck nach Platzierung guillotinieren |
| `findStorageMaterial(...)` | passende Lagerplatte nach Nummer und Stärke finden |
| `area`, `clone`, `randomBool`, `canFit`, `hasEdge`, `addEdgeKey` | gemeinsame Geometrie-/Datenhilfen |
| `sortPlates(plates)` | Teile für die Platzierung priorisieren |
| `createStrips(...)` | kompatible Teile zu Streifenkandidaten kombinieren |
| `placeStrip(...)` | Streifen in einem freien Plattenbereich platzieren |
| `createEmptyNestingPlate(...)` | leeren Plattenzustand mit freien Flächen erzeugen |
| `nestStrips(...)` | Streifen nacheinander auf Platten platzieren |
| `nestPlates2D(...)` | 2D-Kandidaten simulieren, bewerten und besten Plan wählen |
| `nestWithRemainingPlates(...)` | zuerst vorhandene Restplatten, danach Neuware verwenden |
| `getStripLayout`, `configureStripPlacement` | manuelles Streifenlayout lesen beziehungsweise anwenden |
| `canPlaceStrip`, `findNearestFreeSpace` | manuelle Platzierung validieren beziehungsweise korrigieren |
| `NestingScene`, `NestingSettingsRemaining` | Nesting-Viewport und Restplatteneditor |
| `SheetObject`, `PlateObject`, `ItemObject`, `FreeRectObject` | Platten-, Teil- und Freiraumgeometrien rendern |

## CNC-Editor

| Export | Aufgabe |
|---|---|
| `flattenPartList(parts)` | hierarchische Teileliste linearisieren |
| `getCncProgramSignature(part)` | stabile Programmsignatur für Gruppierung bilden |
| `groupCncParts(parts)` | gleiche CNC-Programme zu Gruppen zusammenfassen |
| `getSplitPositions(...)` | Positionen für geteilte Operationen berechnen |
| `cncToSvg(...)` | CNC- in SVG-Koordinaten transformieren |
| `getOperationId`, `getPartWidth`, `getPartHeight` | normalisierte Operations-ID und Teilabmessungen liefern |
| `isFiniteNumber`, `getSelectedStroke`, `getSelectedFill` | Darstellungsvalidierung und Auswahlfarben |
| `CncEditor`, `CncViewport`, `CncPartSidebar`, `CncPropertiesSidebar` | Editor, Zeichenfläche und Sidebars |
| `CncOperationsLayer`, `CncPartsLayer`, `CncDimensionLayer` | Operationen, Kontur und Bemaßung zeichnen |
| `Drill`, `Groove`, `Milling`, `Shelf`, `VB`, `VBH`, `LgBox` | einzelne CNC-Operationstypen darstellen |

## Korpus – Sektionen und Fronten

| Exportgruppe | Aufgabe |
|---|---|
| `createInitialSections`, `createSections` | initialen beziehungsweise konfigurierten Innenbaum erzeugen |
| `parseSplitSpec`, `calculateSplitSizes`, `splitSection` | Teilungsverhältnis parsen und Sektion horizontal/vertikal teilen |
| `updateSectionTree` (beide Module) | Sektionsbaum rekursiv aktualisieren |
| `findSection`, `findParent`, `mergeSectionChildren` | Innenknoten suchen und Kindsektionen vereinigen |
| `getAvailableCabinetArea` | nutzbare Korpusinnenfläche berechnen |
| `frontsToSections`, `generateFronts`, `splitFront` | Front-/Sektionsbäume ableiten und teilen |
| `findFront`, `findFrontParent`, `mergeFrontChildren` | Frontknoten suchen und zusammenführen |

## Korpus – Teileliste

| Exportgruppe | Aufgabe |
|---|---|
| `getMaterial`, `getMaterialNumber`, `getGrainValue` | Materialkonfiguration und Maserung auflösen |
| `getCabinetDimensions`, `getCarcassPartsGeometry` | effektive Korpusmaße und Grundgeometrien berechnen |
| `getDefaultEdges`, `getLeafFronts`, `getBackPanelGeometry` | Kanten-, Front- und Rückwanddaten erzeugen |
| `createPart` | kanonischen Teilelisteneintrag anlegen |
| `flattenSections` | Sektionsbaum für Generatoren linearisieren |
| `generateSideParts`, `generateBottomPart`, `generateBackPart` | Korpusseiten, Boden/Deckel und Rückwand erzeugen |
| `generateFrontParts`, `generateShelfParts`, `generateMiddleWallParts` | Fronten, Fachböden und Mittelwände erzeugen |
| `generateLegraboxParts`, `generateLegraboxHardware` | Legrabox-Holzteile und Beschläge erzeugen |
| `buildPartList` | alle Generatoren koordinieren und gruppierte Ergebnisliste liefern |
| `mergeManualPartList` | manuelle Listeneinträge bei Neugenerierung erhalten |
| `ProjectSave` in `cabinetConfigurator/engine/projectSave.js` | Projekt-, Korpus- und Teilelistendaten konsistent speichern |

## Korpus – CNC-Compiler

| Exportgruppe | Aufgabe |
|---|---|
| `createEmptyCnc`, `ensureCnc`, `addOperation` | CNC-Struktur initialisieren und Operationen dedupliziert ergänzen |
| `getOperationSignature` | Operationen für Deduplizierung normalisieren |
| `flattenSections`, `getSectionFunctions` | Sektionsdaten für den Compiler zugänglich machen |
| `getCncConfig`, `getSource`, `getRole`, `getPartType`, `getPartPosition` | Compilerkontext aus Korpus und Teil lesen |
| `isNear`, `getConnectorHoleCount` | Toleranz- und Lochanzahlberechnung |
| `isSidePart`, `isTopPart`, `isBottomPart`, `isMiddleWallPart` | Bauteilrollen klassifizieren |
| `getLegraboxHeight`, `getLegraboxBackHeight` | Beschlagmaße aus Variantenkonfiguration auflösen |
| `getVerticalMembers`, `getMemberInstances`, `getBoundary`, `resolveSectionBoundaries` | reale Bauteilgrenzen für Sektionsoperationen bestimmen |
| `compileShelf`, `compileLegrabox`, `compileSpax` | Operationen für Fachboden, Schubkasten und Schraubverbinder erzeugen |
| `compileSectionFunctions` | alle Funktionen eines Sektionsbaums kompilieren |
| `compileCnc` | gesamten CNC-Kompiliervorgang koordinieren |

## Korpus – UI

| Exportgruppe | Aufgabe |
|---|---|
| `CabinetEditor`, `CabinetSidebar`, `CabinetPresetModal` | Editor orchestrieren, Korpusse verwalten und Presets wählen |
| `PropertiesSidebar`, `PropertiesTabs` | Auswahltyp auf das passende Eigenschaftenpanel abbilden |
| `CabinetProperties`, `SectionProperties`, `FrontProperties`, `SectionFunctionProperties`, `SelectedElementProperties`, `MaterialSelect` | fachliche Eigenschaften bearbeiten |
| `CabinetViewport`, `CabinetList` | SVG-Viewport und Korpusliste rendern |
| `Grid`, `CarcassLayer`, `InteriorLayer`, `FrontLayer`, `DimensionLayer` | unabhängige Zeichenebenen des Korpusviewports |

