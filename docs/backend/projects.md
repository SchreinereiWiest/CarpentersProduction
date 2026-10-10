# Projekte und Projektarchive

## Stammdaten

### `newProject`

`POST /api/projects/new` erwartet `customerId`, `title` und optional `description`. Prisma legt das Projekt an; Defaults wie `status: "active"` und `priority: "normal"` stammen aus dem Schema. Erfolg: `201` mit dem Projekt.

### `updateProject`

`PUT /api/projects/update/:id` setzt `customerId`, `title`, `description` und `status`. Erfolg: `201` mit dem aktualisierten Projekt. Der Endpunkt verwendet damit auch für ein Update den Statuscode `201`.

### `deleteProject`

`DELETE /api/projects/delete/:projectId` arbeitet in dieser Reihenfolge:

1. Projekt laden oder `404` liefern.
2. Alle zugeordneten `File`-Datensätze samt `S3Object` laden.
3. Jedes vorhandene Objekt physisch aus Garage löschen.
4. Datei- und anschließend `S3Object`-Datensätze löschen.
5. Projekt löschen; Datenbank-Cascades behandeln weitere Projektbeziehungen.

Erfolg:

```json
{
  "success": true,
  "message": "Project deleted successfully",
  "projectId": "UUID",
  "deletedFiles": 3
}
```

Der Ablauf besitzt keine Datenbanktransaktion. Ein Fehler in der Mitte kann daher einen Teilzustand hinterlassen. Die Route ist außerdem aktuell nicht mit Auth-Middleware geschützt.

## Abfragen

### Projekte eines Kunden

`GET /api/projects/getAll/:id` verwendet `id` als `customerId`, sortiert nach Titel und liefert `{ "projects": [...] }`. Es gibt keinen Status- oder Soft-Delete-Filter.

### Sichtbare Projekte

`GET /api/projects/getAll` und der Kompatibilitätsalias `/getActive` verwenden `getAllProjects`:

- Admin: Status `active` und `inactive`
- alle anderen angemeldeten Rollen: nur `active`

Die Antwort ist nach Titel sortiert und enthält den vollständigen `customer`-Datensatz. `deletedAt` wird nicht ausgewertet.

### Einzelprojekt

`GET /api/projects/get/:id` liefert `{ "project": ... }` und bettet Dateimetadaten ein. Eine unbekannte ID ergibt `200` mit `project: null`.

## Generierte Projektdaten

Gültige Namen sind `nesting`, `list` und `cabinet`; daraus entstehen `nesting.json`, `list.json` oder `cabinet.json`.

### Lesen

`GET /api/projects/generated/:id/:name` sucht eine nicht gelöschte Datei des Projekts. Bei einem Treffer wird eine 900 Sekunden gültige signierte URL geliefert:

```json
{ "exists": true, "downloadUrl": "https://..." }
```

Ohne Treffer lautet die Antwort `{ "exists": false }`. Ein ungültiger Name wird im GET-Handler derzeit nicht abgelehnt, sondern als leerer Dateiname gesucht.

### Schreiben

`POST /api/projects/generated/:id/:name` serialisiert den gesamten JSON-Body und schreibt ihn unter `projects/{id}/{datei}.json` nach Garage. Danach wird:

- beim ersten Speichern je ein `S3Object`- und `File`-Datensatz angelegt,
- bei einem vorhandenen Eintrag der bestehende `S3Object`- und `File`-Datensatz aktualisiert.

Ein ungültiger Name erzeugt `400`. Erfolg liefert `success`, `objectKey` und `fileEntry`. Die S3-Operation und die Datenbankänderungen sind nicht transaktional und die Funktion besitzt keinen umschließenden `try/catch`.

## Projekt exportieren

`GET /api/projects/export/:id` ruft `exportProject` auf. Das Ergebnis ist ein gzip-komprimiertes TAR mit der Dateiendung `.cproject` und `Cache-Control: no-store`.

### Manifest

Der erste Archiveintrag ist zwingend `manifest.json`. Er enthält:

- Format `carpenters-production-project`, Version `1` und Exportzeit,
- ausgewählte Projekt- und Kundendaten,
- Kundenadressen,
- Kommunikation, Termine und Zeitbuchungen,
- Metadaten und Archivpfade aller `File`- und `ProjectStorage`-Binärdaten.

Binärdaten werden einzeln aus Garage gelesen und direkt in das Archiv gestreamt. `safeDownloadName` bereinigt den Projekttitel für den Downloadnamen.

## Projekt importieren

`POST /api/projects/import` erwartet `multipart/form-data` mit dem Feld `projectFile`. Multer schreibt maximal eine Datei bis 2 GiB temporär auf das Dateisystem. Optional kann das Textfeld `customerId` einen vorhandenen Zielkunden bestimmen.

### Ablauf

1. gzip dekomprimieren und TAR streamend lesen.
2. Sicherstellen, dass `manifest.json` zuerst kommt und höchstens 5 MiB groß ist.
3. Manifestformat, Version und Eintragspfade prüfen; maximal 10.000 Archiveinträge zulassen.
4. Vorhandenen Kunden auflösen oder Kunden/Adressen aus dem Archiv anlegen. Bei `customerId` werden keine archivierten Kundendaten angelegt.
5. Projekt, Kommunikation, Termine und Zeiten erzeugen; ungültige Benutzerreferenzen werden entfernt oder auf den importierenden Benutzer abgebildet.
6. Binärdaten mit neuen UUID-Objektschlüsseln nach Garage streamen und Metadaten anlegen.
7. Vollständigkeit prüfen und temporäre Datei löschen.

Erfolg liefert `201`:

```json
{
  "success": true,
  "projectId": "UUID",
  "project": {},
  "importedFiles": 4
}
```

Bei Fehlern versucht `rollbackImport` erzeugte Garage-Objekte, Projekt- und abhängige Datensätze sowie neu angelegte Kunden/Adressen zu entfernen. Anschließend folgt `400` mit einer allgemeinen Fehlermeldung und dem technischen `message`-Text.

### Kollisions- und Zuordnungsregeln

- Existiert die archivierte `projectNumber` bereits, wird sie beim Import auf `null` gesetzt.
- Ohne Zielkunden wird zuerst nach ursprünglicher Kunden-ID, dann nach `customerNumber`, dann nach E-Mail gesucht.
- Bei explizitem Zielkunden werden Terminadressen positionsweise, ersatzweise auf dessen erste Adresse abgebildet.
- Nur weiterhin existierende Benutzer-IDs werden für Ersteller, Uploads und Zeiten übernommen.
