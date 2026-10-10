# Fachmodule

## Nesting

Nesting-Daten werden je Projekt als `nesting.json` unter `projects/{projectId}/nesting.json` gespeichert. Globale Einstellungen liegen als `settings/settings-nesting.json` in Garage.

## CNC

CNC-Einstellungen liegen als `settings/settings-cnc.json` vor. Ein eigener CNC-Controller oder eine eigene Route existiert im Backend derzeit nicht.

## Cabinet Editor

Projektbezogene Cabinet-Daten werden als `cabinet.json` gespeichert. Globale Einstellungen und Presets verwenden `settings-cabinet.json` beziehungsweise `settings-cabinetPreset.json`.

## CRM

Das CRM stützt sich auf die Prisma-Modelle `Customer`, `CustomerAddress`, `Project`, `Communication` und `Appointment`. Im aktuellen Backend sind HTTP-Routen für Kunden und Projekte vorhanden; eigenständige CRUD-Routen für Kommunikation und Termine fehlen noch.

## Listen

Projektbezogene Listendaten werden als `list.json` gespeichert. Wie bei Nesting und Cabinet liefert der GET-Endpunkt eine signierte URL statt den JSON-Inhalt direkt auszuliefern.
