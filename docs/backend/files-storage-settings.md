# Dateien, Material und Einstellungen

## S3-/Garage-Clients

`src/config/s3.js` exportiert zwei `S3Client`-Instanzen:

- `s3Upload`: interner `S3_ENDPOINT` für Schreiben und Löschen,
- `s3Download`: öffentlicher `S3_PUBLIC_ENDPOINT` für signierte Browser-URLs.

Beide verwenden Region `garage`, path-style Requests, dieselben Zugangsdaten und Checksum-Berechnung nur bei Bedarf.

## Datei hochladen

`POST /api/files/upload` akzeptiert `multipart/form-data`. Multer hält das einzelne Feld `file` vollständig im Arbeitsspeicher. Zusätzliche Formfelder:

| Feld | Bedeutung |
|---|---|
| `entity` | `project` oder `customer` |
| `entityId` | ID für den Objektpfad; im aktuellen DB-Code zugleich Projekt-ID |
| `customerId` | zu verknüpfende Kunden-ID |
| `fileName` | fachlicher Dateiname und Bestandteil des S3-Schlüssels |
| `mimeType` | Content-Type und Datenbankfeld |
| `fileSize` | wird mit `parseInt` in eine Zahl umgewandelt |

`createUpload` wählt `projects/{entityId}` oder `customers/{entityId}` als Prefix und ergänzt `{UUID}-{fileName}`. Danach legt es zuerst ein `S3Object` an, lädt den Buffer nach Garage und erzeugt einen `File`-Datensatz mit Status `completed`.

!!! warning "Aktuelles Zuordnungsverhalten"
    Auch bei `entity: "customer"` verbindet der Controller `entityId` als `project.id` und zusätzlich `customerId`. Ein reiner Kunden-Upload funktioniert daher nicht wie der gewählte Objektpfad vermuten lässt. Außerdem existiert kein Rollback, falls S3-Upload oder File-Anlage nach dem ersten DB-Schritt scheitert.

Erfolg liefert `success`, `objectKey` und `fileEntry`.

## Download-URL

`GET /api/files/download/:id` ruft `createDownloadUrl` auf. Nach Laden von `File` und `S3Object` wird eine 900 Sekunden gültige URL erzeugt und als `{ "url": "..." }` zurückgegeben. Unbekannte Datei: `404`; Signaturfehler: `500`.

## Datei löschen

`DELETE /api/files/delete/:fileId` ruft `deleteFile` auf:

1. `File` mit `S3Object` laden,
2. Garage-Objekt löschen,
3. `File` löschen,
4. `S3Object` löschen.

Bei Erfolg folgen `success`, `fileId` und `objectKey`. Die Route verlangt ein Login, prüft aber keine Eigentümerschaft oder Projektberechtigung. Der Ablauf besitzt keine Transaktion über Datenbank und Objektspeicher.

## Veralteter Abschluss-Handler

`uploadcomplete` in `file.controller.js` setzt den Dateistatus anhand von `body.id` auf `complete`. Die zugehörige Route ist auskommentiert; der Handler ist daher nicht erreichbar und als deprecated markiert.

## Materialien

### Liste

`GET /api/materials/get` ruft `getMaterials` auf und liefert `{ "materials": [...] }`, sortiert nach Name.

### Anlage

`POST /api/materials/create` ruft `createMaterial` auf. Unterstützte Felder:

`materialNumber`, `name`, `width`, `height`, `minimumStorage`, `maser`, `manufacturer`, `category`, `thickness`, `pricePerSquareMeter`, `supplier`.

Das Prisma-Schema verlangt `name`, `width` und `height`. Erfolg: `201 { "material": ... }`; Controller-seitige Typ- oder Pflichtfeldvalidierung existiert nicht.

### Bestand setzen

`PATCH /api/materials/:id/quantity` erwartet `{ "quantity": INTEGER }`. Negative Werte ergeben `400`, ansonsten wird die Menge gesetzt und `{ "material": ... }` geliefert. Typ, Ganzzahligkeit und Existenz werden nicht separat validiert. Die Route verlangt ein gültiges Login und erlaubt ausschließlich die Rollen `admin` und `manager`.

## Einstellungen

Einstellungsnamen werden auf feste Dateien abgebildet:

| Name | Datei |
|---|---|
| `cabinet` | `settings-cabinet.json` |
| `cabinetPreset` | `settings-cabinetPreset.json` |
| `nesting` | `settings-nesting.json` |
| `cnc` | `settings-cnc.json` |
| `cache` | `settings-cache.json` |
| `company` | `settings-company.json` |

### Lesen

`getSettingsData` sucht eine nicht gelöschte `File` anhand des Dateinamens. Bei Treffer liefert es `{exists:true, downloadUrl}` mit 900 Sekunden Gültigkeit, sonst `{exists:false}`. Ungültige Namen ergeben `400`.

`GET /api/settings/company` ist für normale Benutzer verfügbar, weil der Kalender die Firmeneinstellungen benötigt. Der Routen-Wrapper setzt intern `req.params.name = "company"`. Alle anderen GET-Einstellungen benötigen Adminrechte.

### Schreiben

`POST /api/settings/:name` benötigt Adminrechte. `createSettingsData` serialisiert den Body, schreibt ihn unter `settings/{datei}` nach Garage und legt beim ersten Aufruf `S3Object` und `File` an. Spätere Aufrufe aktualisieren beide Metadatensätze und überschreiben denselben Objektschlüssel.

Der Handler besitzt keinen `try/catch` und keine gemeinsame Transaktion für Garage und PostgreSQL. Ein partieller Fehler kann daher inkonsistente Metadaten hinterlassen oder von Express als allgemeiner Fehler behandelt werden.
