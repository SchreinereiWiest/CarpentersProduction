# Vollständige Funktionsreferenz

Diese Referenz erfasst alle benannten Anwendungsfunktionen unter `Backend/src` sowie die fachlich relevanten Inline-Callbacks der Routen. Callback-Funktionen, die nur von `map`, `filter`, `forEach` oder Promise-Verkettungen verwendet werden, sind bei ihrer aufrufenden Funktion beschrieben und nicht als eigenständige API aufgeführt.

## Server und Routing

| Funktion/Callback | Datei | Aufgabe |
|---|---|---|
| Request-Logger `(req,res,next)` | `src/server.js` | schreibt Methode und Original-URL und ruft `next()` auf |
| HTTPS-Callback | `src/server.js` | weist in Produktion nicht sichere Requests mit `426` ab |
| Listen-Callback | `src/server.js` | startet Express fest auf Port 5000 und protokolliert den Start |
| `/auth/me`-Handler | `routes/auth.routes.js` | lädt `req.user.id`, antwortet mit `id`, `email`, `role` oder `404` |
| `/settings/company`-Wrapper | `routes/settings.routes.js` | setzt `req.params.name` auf `company` und delegiert an `getSettingsData` |
| Archiv-Dateiname-Callback | `routes/project.routes.js` | erzeugt für Multer `project-import-{randomUUID}` im System-Tempverzeichnis |

Alle übrigen Routendateien verbinden lediglich HTTP-Methode, Pfad, Middleware und die unten dokumentierten Handler. Die vollständige Zuordnung steht in der [API-Referenz](api.md).

## Authentifizierungs-Controller

Datei: `src/controllers/auth.controller.js`

| Funktion | Eingabe | Ergebnis und Seiteneffekte |
|---|---|---|
| `login(req,res)` | `body.login`, `body.password` | prüft Kontostatus und bcrypt-Hash, signiert ein an `authVersion` gebundenes 72-h-JWT und setzt Session-/CSRF-Cookie |
| `logout(req,res)` | `req.user.id` | erhöht `authVersion`, löscht Cookies und widerruft alle Sessions |
| `getAllUsers(req,res)` | keine fachlichen Parameter | lädt alle Benutzer nach E-Mail sortiert und liefert `filterUser` mit `id` und `email` |

## Kunden-Controller

Datei: `src/controllers/customer.controller.js`

| Funktion | Eingabe | Ergebnis und Seiteneffekte |
|---|---|---|
| `newcustomer(req,res)` | Kunden- und Adressfelder im Body | validiert Vor-/Nachname, legt Kunde mit einer Adresse an, liefert `201` |
| `getCustomers(req,res)` | Query `page` | lädt 20 Kunden je Seite samt Adressen und Paginierungsdaten |
| `updateCustomer(req,res)` | Pfad `id`, Kundenfelder, `addressId` und Adressfelder | aktualisiert Kunde und genau eine Adresse |
| `getCustomerInfo(req,res)` | Pfad `id` | lädt einen Kunden samt Adressen; kann `customer: null` liefern |
| `searchCustomers(req,res)` | Query `search`, `req.user.role` | sucht case-insensitive; gibt für normale Benutzer nur freigegebene Identifikationsfelder aus |

## Projekt-Controller

Datei: `src/controllers/project.controller.js`

| Funktion | Eingabe | Ergebnis und Seiteneffekte |
|---|---|---|
| `newProject(req,res)` | `customerId`, `title`, `description` | legt Projekt an und liefert `201` |
| `updateProject(req,res)` | Pfad `id`; `customerId`, `title`, `description`, `status` | aktualisiert Projekt und liefert `201` |
| `deleteProject(req,res)` | Pfad `projectId`, authentifizierter Admin | entfernt DB-Daten transaktional, schreibt Audit-Log und idempotente Garage-Löschjobs |
| `getAllProjectsID(req,res)` | Pfad `id` als Kunden-ID | lädt alle Projekte dieses Kunden nach Titel |
| `getAllProjects(req,res)` | `req.user` | lädt für Admin/Manager alle relevanten, für Benutzer nur eigene/zugeordnete aktive Projekte |
| `getAllActive` | Alias, gleiche Signatur wie `getAllProjects` | Kompatibilitätsexport ohne eigene Logik |
| `getProject(req,res)` | Pfad `id` | lädt Projekt mit Dateien |
| `getGeneratedProjectData(req,res)` | Pfad `id`, `name` | sucht `nesting/list/cabinet`-JSON und liefert signierte URL oder `exists:false` |
| `createGeneratedProjectData(req,res)` | Pfad `id`, `name`; beliebiger JSON-Body | serialisiert Body, überschreibt Garage-Objekt und legt/aktualisiert Metadaten |

## Projektarchiv-Controller

Datei: `src/controllers/projectArchive.controller.js`

| Funktion | Sichtbarkeit | Aufgabe |
|---|---|---|
| `pick(source,fields)` | intern | erstellt ein Objekt nur aus vorhandenen, erlaubten Feldern |
| `restoreDates(data)` | intern | wandelt bekannte Datumsfelder mit truthy Wert in `Date` um |
| `safeDownloadName(value)` | intern | normalisiert Projekttitel und ersetzt unsichere Zeichen für den Archivnamen |
| `sendArchiveEntry(pack,header,body)` | intern | schreibt Buffer/String oder Stream als Promise-basierten TAR-Eintrag |
| `loadProjectForArchive(projectId)` | intern | lädt Projekt mit Kunde/Adressen, Kommunikation, Terminen, Zeiten, Dateien und Projektspeicher |
| `exportProject(req,res)` | Route | baut Manifest, setzt Downloadheader und streamt TAR + gzip + S3-Objekte zur Antwort |
| `validateManifest(manifest)` | intern | prüft Format/Version, Pflichtteile, Arrays, Pfadmuster und doppelte Binärpfade |
| `validUserIds(manifest)` | intern | sammelt referenzierte Benutzer-IDs und gibt nur aktuell existierende als `Set` zurück |
| `resolveCustomer(snapshot,addressMap,createdRecords,users)` | intern | findet Kunde nach ID/Nummer/E-Mail oder legt ihn an; löst beziehungsweise erzeugt Adressen |
| `resolveImportCustomer(manifest,req,state,users)` | intern | verwendet optionalen Zielkunden oder delegiert an `resolveCustomer`; erstellt Adressmapping |
| `createImportedProject(manifest,req,state)` | intern | legt Projekt und relationale Kommunikation, Termine und Zeiten an; behandelt Nummernkollision |
| `importBinaryEntry(entryStream,metadata,state)` | intern | legt `S3Object` an, streamt Archiveintrag nach Garage und erzeugt `File` oder `ProjectStorage` |
| `rollbackImport(state)` | intern | löscht bestmöglich erzeugte Garage-Objekte, Projekt, Speicherobjekte, Kunden oder Adressen |
| `importProject(req,res)` | Route | koordiniert Uploadprüfung, gzip/TAR-Parsing, Manifest, Import, Vollständigkeit, Rollback und Temp-Cleanup |

## Zeit-Controller

Datei: `src/controllers/time.controller.js`

| Funktion | Eingabe | Ergebnis und Seiteneffekte |
|---|---|---|
| `startTime(req,res)` | Projekt-ID; Benutzer, Arbeitstyp | legt laufenden Eintrag mit aktuellem `startedAt` an |
| `stopTime(req,res)` | TimeEntry-ID | berechnet Minuten, setzt `endedAt`/`duration`, liefert aber den vorher geladenen Stand |
| `getTime(req,res)` | Projekt-ID | liefert Projektzeiten absteigend nach Anlagezeit |
| `getDayEntrys(req,res)` | Datum `YYYY-MM-DD` | liefert für Benutzer eigene, für Admin/Manager alle Einträge innerhalb lokaler Tagesgrenzen |
| `getOpenEntrys(req,res)` | `req.user.id` | liefert dessen Einträge ohne `startedAt` samt Projektkurzdaten |
| `newTime(req,res)` | Projekt-ID und kompletter Zeit-Body | legt Eintrag mit Start, Ende und vorgegebener Dauer an |
| `manualTime(req,res)` | Projekt-ID, Benutzer, Arbeitstyp, Dauer | legt noch nicht zeitlich zugeordneten Eintrag an |
| `assignTimeEntry(req,res)` | TimeEntry-ID, ein Segment oder `segments[]` | validiert Eigentümer und Minutensummen; aktualisiert/splittet transaktional |
| `updateTimeEntry(req,res)` | TimeEntry-ID und geänderte Felder | validiert Grunddaten und Eigentümer; aktualisiert Eintrag |
| `getGeneratedTimeData(req,res)` | Benutzer-ID und Datumskennung | liefert signierte URL für `weekData-{date}.json` oder `exists:false` |
| `createGeneratedTimeData(req,res)` | Benutzer-ID, Datumskennung und JSON-Body | schreibt Wochen-JSON und legt/aktualisiert S3-/File-Metadaten |

## Benutzer-Controller

Datei: `src/controllers/user.controller.js`

| Funktion | Eingabe | Ergebnis und Seiteneffekte |
|---|---|---|
| `getUsers(req,res)` | keine fachlichen Parameter | lädt nicht gelöschte Benutzer mit Beziehungszählern |
| `getUser(req,res)` | Pfad `id` | lädt nicht gelöschten Benutzer, Dateiliste und Zähler oder `404` |
| `newUser(req,res)` | Namen, Login, E-Mail, Passwort, Rolle | validiert Eindeutigkeit/Mindestlänge, hasht und legt aktiven Benutzer an |
| `updateUser(req,res)` | Pfad `id`, partielle Stammdaten | normalisiert Werte und aktualisiert ausgewählte Felder |
| `changeUserPassword(req,res)` | Pfad `id`, `body.password` | validiert Mindestlänge, hasht und ersetzt Passwort |
| `deleteUser(req,res)` | Pfad `id` | Soft Delete: setzt `isActive=false` und `deletedAt` |

## Datei-Handler

| Funktion | Datei | Aufgabe |
|---|---|---|
| `createUpload(req,res)` | `middleware/upload.middleware.js` | validiert Multipart-Datei/Entity, erzeugt Objektpfad, S3- und File-Datensatz und lädt Buffer hoch |
| `createDownloadUrl(req,res)` | `middleware/upload.middleware.js` | lädt Datei/Speicherobjekt und signiert einen GET für 900 Sekunden |
| `deleteFile(req,res)` | `middleware/upload.middleware.js` | entfernt DB-Daten transaktional, schreibt Audit-Log und Garage-Löschjob |
| `uploadcomplete(req,res)` | `controllers/file.controller.js` | setzt Dateistatus auf `complete`; deprecated und ohne aktive Route |

## Einstellungs-Controller

Datei: `src/controllers/settings.controller.js`

| Funktion | Eingabe | Ergebnis und Seiteneffekte |
|---|---|---|
| `getSettingsData(req,res)` | Pfad `name` | bildet Namen auf Datei ab und liefert signierte URL oder `exists:false` |
| `createSettingsData(req,res)` | Pfad `name`, JSON-Body | schreibt JSON nach `settings/` und legt/aktualisiert `S3Object` und `File` |

## Material-Controller

Datei: `src/controllers/storage.controller.js`

| Funktion | Eingabe | Ergebnis und Seiteneffekte |
|---|---|---|
| `getMaterials(req,res)` | keine | lädt Materialien nach Name und liefert `{materials}` |
| `createMaterial(req,res)` | Materialfelder | legt Material an und liefert `201 {material}` |
| `updateMaterialQuantity(req,res)` | Material-ID, `quantity` | weist negative Werte ab und setzt die Bestandsmenge |

## Authentifizierungs-Middleware

Datei: `src/middleware/auth.middleware.js`

| Funktion | Aufgabe |
|---|---|
| `authenticate(req,res,next)` | prüft JWT sowie aktuellen DB-Status und `authVersion`, setzt aktuelle Benutzerdaten oder antwortet `401` |
| `authenticateAdmin(req,res,next)` | führt dieselbe DB-gebundene Prüfung aus und verlangt Rolle `admin`; fehlende Rechte ergeben `403` |
| `authorizeRoles(...allowedRoles)` | erzeugt eine Middleware, die hinter `authenticate` nur ausgewählte Rollen zulässt |

## CSRF- und Ressourcen-Middleware

| Funktion | Datei | Aufgabe |
|---|---|---|
| `issueCsrfToken(res)` | `middleware/csrf.middleware.js` | erzeugt und setzt den Double-Submit-Token |
| `verifyRequestOrigin(req,res,next)` | `middleware/csrf.middleware.js` | blockiert mutierende Requests fremder Origins |
| `verifyCsrfToken(req,res,next)` | `middleware/csrf.middleware.js` | vergleicht CSRF-Cookie und Header zeitkonstant |
| `authorizeProject` / `authorizeProjectBody` | `middleware/resourceAuthorization.middleware.js` | prüft globale Rolle, Ersteller oder eigenen Zeiteintrag eines Projekts |
| `authorizeCustomer` / `authorizeCustomerBody` | `middleware/resourceAuthorization.middleware.js` | prüft Kundenberechtigung |
| `authorizeFile` / `authorizeUploadTarget` | `middleware/resourceAuthorization.middleware.js` | prüft Datei- oder Uploadzielberechtigung |
| `authorizeUserResource` | `middleware/resourceAuthorization.middleware.js` | erlaubt eigene Benutzer-ID oder Admin/Manager |
| `authorizeTimeEntry` | `middleware/resourceAuthorization.middleware.js` | erlaubt eigenen Zeiteintrag oder Admin/Manager |

## Speicherlöschdienst

| Funktion | Aufgabe |
|---|---|
| `enqueueStorageDeletions(transaction,objects)` | legt eindeutige Löschjobs innerhalb der Fachtransaktion an |
| `processStorageDeletionJob(jobId)` | beansprucht und verarbeitet genau einen idempotenten Garage-Löschjob |
| `processStorageDeletions(objects)` | stößt frisch angelegte Jobs unmittelbar an |
| `reconcileStorageDeletions()` | reaktiviert hängen gebliebene Jobs und verarbeitet fällige Wiederholungen |
| `startStorageDeletionWorker()` | startet Initiallauf und minütlichen Reconciliation-Zyklus |

## Utilities und Konfiguration

| Funktion/Export | Datei | Aufgabe |
|---|---|---|
| `generateAccessToken(user)` | `utils/jwt.js` | signiert `id` und `role` für 15 Minuten |
| `generateRefreshToken(user)` | `utils/jwt.js` | signiert `id` für 30 Tage |
| `hashPassword(password)` | `utils/passwords.js` | erzeugt bcrypt-Hash mit Kostenfaktor 12 |
| `comparePassword(password,hash)` | `utils/passwords.js` | vergleicht Klartext und bcrypt-Hash |
| `prisma` | `config/prisma.js` | Singleton-Instanz von `PrismaClient` |
| `s3Upload` | `config/s3.js` | S3-Client am internen Endpunkt |
| `s3Download` | `config/s3.js` | S3-Client am öffentlichen Endpunkt |

## Einmal-Skripte

| Funktion | Datei | Aufgabe und Hinweis |
|---|---|---|
| `createUser()` | `scripts/createAdmin.js` | validiert `BOOTSTRAP_ADMIN_*`, hasht das externe Passwort und legt einen aktiven Admin an |
| `createUser()` | `scripts/createUser.js` | validiert `BOOTSTRAP_USER_*`, hasht das externe Passwort und legt einen aktiven Standardbenutzer an |

Beide Skripte führen die Funktion sofort aus, protokollieren Fehler und trennen Prisma in `finally`. Sie sind nicht über `package.json` registriert.

## Leere Dateien

Die folgenden Dateien deklarieren derzeit keine Funktionen oder Exporte:

- `src/services/auth.service.js`
- `src/services/project.service.js`
- `src/services/storage.service.js`
- `src/services/user.service.js`
- `src/utils/logger.js`
