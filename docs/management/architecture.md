# Architektur des Management-Arbeitsbereichs

## Frontend

`managementLayout.jsx` lädt den Jahresarbeitsbereich und die Firmeneinstellungen. Fünf Routen verwenden denselben Outlet-Kontext:

```text
Frontend/src/features/management/
├── layout/managementLayout.jsx
├── layout/managementBar.jsx
└── operating/
    ├── overview.jsx       Mitarbeiterauslastung
    ├── projectBoard.jsx   Management-Statusboard
    ├── projectTimeline.jsx interaktives Tages-Gantt
    ├── annualGoals.jsx    Soll, Zwischenstände und Ist
    └── hourlyRates.jsx    lineare Vollkostenrechnung
```

`managementSettingsPanel.jsx` erweitert `settings-company.json` um `management.workflowStates` und `management.goalTypes`. `companySettingsPanel.jsx` bleibt Eigentümer der Tätigkeitsliste.

## Backend und Datenbank

`workspace.controller.js` enthält die CRUD-Operationen des Arbeitsbereichs. Die neuen operativen Daten liegen in sechs mandantenbezogenen Tabellen:

- `management_assignments`
- `management_project_stages`
- `management_project_schedules`
- `management_employee_profiles`
- `management_annual_goals`
- `management_goal_checkpoints`

Alle Tabellen verwenden Row Level Security und werden zusätzlich vom Tenant-Prisma-Proxy gefiltert. Zuweisungen referenzieren Projekt, Mitarbeiter, Ersteller und optional den erzeugten Kalendereintrag. Projektstatus und Ziele werden bei Projekt-/Ziellöschung kaskadiert entfernt.

Die Stundensatzdaten verwenden die vorhandene jahresbezogene `management_periods.config`. Das gemeinsame Fachmodul `Engine/src/management/calculation/hourlyRates.mjs` wird für Vorschau und Serverberechnung verwendet. `calculation.controller.js` übersetzt das gespeicherte Ergebnis in den bestehenden Projekt-Kalkulationsvertrag.

## Datenfluss

1. Das Layout lädt `/api/management/workspace` und `settings-company.json`.
2. Die Ansichten schreiben nur ihre abgegrenzten Datensätze und laden den Arbeitsbereich anschließend neu.
3. Das Board speichert keinen Wert in `Project.status`.
4. Der Gantt-Plan wird als JSON-Zeilen-/Balkenstruktur gespeichert; Beginn und Ende werden aus allen Balken abgeleitet. Der Kalender übernimmt nach zwei Tagesklicks den bestätigten Gesamtzeitraum als Produktionstermin mit Projekt- und Mitarbeiterbezug.
5. Tagesarbeitsblöcke entstehen aus der jeweiligen Wochentagskonfiguration, deren eigenen Pausen und wiederkehrenden Sonderregeln. Kalendereinträge vom Typ `company-closed` überschreiben einen Tag zusätzlich als betriebsfrei.
6. Zeitbuchungen werden für das gewählte Jahr nach Mitarbeiter und Tätigkeits-ID aggregiert. Urlaubstermine werden im Frontend mit den resultierenden Tagesarbeitsblöcken verschnitten.
7. Gespeicherte Stundensätze werden beim Laden einer Projektkalkulation als Kostenstellen mit Tätigkeits-IDs ausgegeben.
