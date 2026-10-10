# Fachmodule

## Nesting

Das React-Modul erzeugt Teile-/Plattenlisten, bewertet 2D-Platzierungen und unterstützt manuelle Streifenpositionierung. Nesting-Daten werden je Projekt als `nesting.json` unter `projects/{projectId}/nesting.json` gespeichert. Details: [Frontend-Projektmodule](../frontend/project-modules.md#nesting).

## CNC

CNC-Einstellungen liegen als `settings/settings-cnc.json` vor. Editor und Compiler laufen im Browser; persistiert wird über die generische Projekt-JSON-API. Details: [CNC-Editor und Compiler](../frontend/project-modules.md#cnc-editor).

## Cabinet Editor

Der Korpuskonfigurator pflegt Sektions-/Frontbäume, erzeugt Teile und kompiliert CNC-Operationen. Projektbezogene Daten werden als `cabinet.json`, Listen als `list.json` gespeichert. Details: [Korpuskonfigurator](../frontend/project-modules.md#korpuskonfigurator).

## CRM

Das CRM stützt sich auf die Prisma-Modelle `Customer`, `CustomerAddress`, `Project`, `Communication` und `Appointment`. Im aktuellen Backend sind HTTP-Routen für Kunden und Projekte vorhanden; eigenständige CRUD-Routen für Kommunikation und Termine fehlen noch.

## Listen

Projektbezogene Listendaten werden als `list.json` gespeichert. Wie bei Nesting und Cabinet liefert der GET-Endpunkt eine signierte URL statt den JSON-Inhalt direkt auszuliefern.
