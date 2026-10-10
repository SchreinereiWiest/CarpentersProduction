# Projekte und Projektarchive

## Stammdaten

### `newProject`

`POST /api/projects/new` erwartet `customerId`, `title` und optional `description`. Prisma legt das Projekt an; Defaults wie `status: "active"` und `priority: "normal"` stammen aus dem Schema. Erfolg: `201` mit dem Projekt.

### `updateProject`

`PUT /api/projects/update/:id` setzt `customerId`, `title`, `description` und `status`. Erfolg: `201` mit dem aktualisierten Projekt. Der Endpunkt verwendet damit auch für ein Update den Statuscode `201`.

### `deleteProject`

`DELETE /api/projects/delete/:projectId` arbeitet in dieser Reihenfolge:

1. Projekt samt Datei- und `ProjectStorage`-Referenzen laden oder `404` liefern.
2. Projekt und abhängige Datensätze in einer Prisma-Transaktion löschen.
3. Nur danach unreferenzierte `S3Object`-Datensätze ermitteln.
4. Für jedes physische Objekt in derselben Transaktion einen eindeutigen `StorageDeletionJob` anlegen und die verwaiste S3-Metadatenzeile entfernen.
5. In derselben Transaktion einen Audit-Eintrag mit Admin-ID, Projekt-ID, Dateianzahl, IP-Adresse und User-Agent schreiben.
6. Die idempotenten Garage-Löschungen unmittelbar anstoßen; der Reconciliation-Worker wiederholt Fehler mit Backoff.

Erfolg:

```json
{
  "success": true,
  "message": "Project deleted successfully",
  "projectId": "UUID",
  "deletedFiles": 3,
  "storageDeletionJobs": 3
}
```

Die Route verlangt die Admin-Rolle. Datenbanklöschungen, Audit-Log und Jobanlage sind atomar. Garage bleibt außerhalb der PostgreSQL-Transaktion; fehlgeschlagene Löschungen sind jedoch dauerhaft als Job sichtbar und werden minütlich erneut verarbeitet.

## Abfragen

### Projekte eines Kunden

`GET /api/projects/getAll/:id` verwendet `id` als `customerId`, sortiert nach Titel und liefert `{ "projects": [...] }`. Vor dem Handler wird die Kundenberechtigung geprüft.

### Sichtbare Projekte

`GET /api/projects/getAll` und der Kompatibilitätsalias `/getActive` verwenden `getAllProjects`:

- Admin und Manager: Status `active` und `inactive`
- normale Benutzer: nur aktive Projekte, die sie erstellt haben oder zu denen ein eigener Zeiteintrag existiert

Die Antwort ist nach Titel sortiert und enthält den vollständigen `customer`-Datensatz. `deletedAt` wird nicht ausgewertet.

### Einzelprojekt

`GET /api/projects/get/:id` liefert nach zentraler Projektberechtigung `{ "project": ... }` und bettet Dateimetadaten ein. Fremde oder unbekannte Projekte werden bereits von der Policy als `404` abgewiesen.

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

`POST /api/projects/import` ist auf Admin und Manager beschränkt und erwartet `multipart/form-data` mit dem Feld `projectFile`. Multer schreibt maximal eine Datei bis 2 GiB temporär auf das Dateisystem. Optional kann das Textfeld `customerId` einen vorhandenen Zielkunden bestimmen.

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
