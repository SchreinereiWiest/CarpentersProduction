# State, API und Cache

## Zustandsarten

| Ebene | Inhalt | Lebensdauer |
|---|---|---|
| `AppContext` | Sidebar-Zustand und `projectRoute` | bis zum Reload |
| `AuthContext` | aktuelle Identität und Ladezustand | bis zum Reload; Quelle ist `/api/auth/me` |
| Komponenten-State | Formulare, Auswahl, Editor-, Kamera- und Modalzustände | Lebensdauer der Seite/Komponente |
| Custom Hooks | Unternehmenssettings und Mitarbeiterkalender | Lebensdauer der konsumierenden Seite |
| Memory Cache | geladene Projekt- und globale JSON-Dateien | bis zum Reload |
| IndexedDB | Projektdateien und globale Settings | browserpersistent bis zur Invalidierung/Expiration |

## API-Helfer

`downloadFile(path)` lädt zunächst die Metadatenantwort des Backends. Bei `exists: true` lädt es die JSON-Datei anschließend über die signierte Garage-URL. `uploadJSONFile(path,data)` sendet JSON mit Axios.

Direkte Axios-Aufrufe werden für Stammdaten, Material, Zeiten, Dateien und Archive verwendet. Download-URLs von Garage werden mit `fetch` gelesen. Da alle Backend-Aufrufe relative `/api`-Pfade verwenden, sendet der Browser Session- und CSRF-Cookies gleichursprünglich.

## Cache-Lesepfad

Projektdateien (`list`, `cabinet`, `nesting`) und globale Einstellungsdateien verwenden dieselbe Reihenfolge:

1. Wert aus dem Modul-`Map` lesen.
2. IndexedDB-Datenbank `carpentersproduction`, Store `projectFiles`, abfragen.
3. Ablaufzeit anhand der Cache-Einstellung prüfen.
4. Bei Miss über Backend/Garage laden.
5. Memory Cache und IndexedDB aktualisieren.

Projektkeys besitzen das Format `project:{projectId}:{file}`, globale Keys `global:{file}`. `uploadProjectFile` und `uploadGlobalFile` schreiben erst zum Server und aktualisieren danach beide Cache-Ebenen.

## Invalidierung

- `invalidateProjectFile`: genau eine Projektdatei entfernen.
- `invalidateProject`: alle Einträge einer Projekt-ID per Cursor entfernen.
- `invalidateAllProjects`: gesamten Store leeren.
- `invalidateGlobalFile`: genau eine globale Datei entfernen.

Der Memory Cache besitzt aktuell keine exportierte Invalidierungsfunktion. Ein IndexedDB-Delete entfernt daher nicht automatisch bereits geladene Werte aus dem laufenden Tab.

## Unternehmenssettings

`companySettings.js` liefert robuste Defaults für Arbeitszeit, Pausen und Tätigkeitsarten. `normalizeCompanySettings` ergänzt fehlende Werte, `createWorkBlocks` teilt den Arbeitstag entlang der Pausen, und `useCompanySettings` lädt die Einstellungen beim Mounten mit Default-Fallback.

## Kalenderzustand

`useEmployeeCalendar` koordiniert Benutzer, Woche, Zeitslots, offene Einträge, Drag/Drop und Editierdialoge. Die Hilfsmodule laden Wochen-JSON und Tagesdaten, ordnen freie Slots zu, validieren Splits und speichern geänderte beziehungsweise neu erzeugte Zeitsegmente wieder im Backend.

