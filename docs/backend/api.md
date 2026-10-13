# API-Referenz

Basis-URL im lokalen Backend: `http://localhost:5000/api`. Geschützte Endpunkte erwarten den Cookie `token`. Mutierende Requests benötigen zusätzlich den zum `XSRF-TOKEN`-Cookie passenden Header `X-XSRF-TOKEN` und eine erlaubte Origin.

## Authentifizierung

| Methode | Pfad | Schutz | Handler | Zweck |
|---|---|---|---|---|
| `POST` | `/auth/login` | öffentlich | `login` | Zugangsdaten prüfen und JWT-Cookie setzen |
| `POST` | `/auth/logout` | angemeldet + CSRF | `logout` | alle Sessions widerrufen und Cookies löschen |
| `GET` | `/auth/users` | Admin oder Manager | `getAllUsers` | reduzierte Benutzerliste `{id,email}` laden |
| `GET` | `/auth/me` | angemeldet | Inline-Handler | aktuelle Identität laden |

## Kunden

| Methode | Pfad | Schutz | Handler | Zweck |
|---|---|---|---|---|
| `POST` | `/customers/new` | Admin oder Manager | `newcustomer` | Kunde mit einer Adresse anlegen |
| `GET` | `/customers/all?page=1` | Admin oder Manager | `getCustomers` | Kunden seitenweise laden |
| `GET` | `/customers/get/:id` | Admin oder Manager | `getCustomerInfo` | Kunde mit Adressen laden |
| `POST` | `/customers/update/:id` | Admin oder Manager | `updateCustomer` | Kunde und ausgewählte Adresse aktualisieren |
| `GET` | `/customers/search?search=...` | angemeldet; rollenbasierte Felder | `searchCustomers` | bis zu 15 Kunden suchen |

## Projekte

| Methode | Pfad | Schutz | Handler | Zweck |
|---|---|---|---|---|
| `POST` | `/projects/new` | berechtigter Kunde | `newProject` | Projekt anlegen |
| `PUT` | `/projects/update/:id` | Projekt- und Kundenberechtigung | `updateProject` | Projektstammdaten ändern |
| `DELETE` | `/projects/delete/:projectId` | Admin oder Manager | `deleteProject` | Projekt, Dateien und S3-Objekte löschen; Audit-Log schreiben |
| `GET` | `/projects/getAll/:id` | Kundenberechtigung | `getAllProjectsID` | Projekte eines Kunden laden |
| `GET` | `/projects/getAll` | angemeldet | `getAllProjects` | sichtbare Projekte laden |
| `GET` | `/projects/getActive` | angemeldet | `getAllProjects` | Kompatibilitätsalias für `getAll` |
| `GET` | `/projects/get/:id` | Projektberechtigung | `getProject` | Projekt mit Dateimetadaten laden |
| `GET` | `/projects/export/:id` | Projektberechtigung | `exportProject` | `.cproject`-Archiv streamen |
| `POST` | `/projects/import` | Admin oder Manager | `importProject` | `.cproject`-Archiv importieren |
| `GET` | `/projects/generated/:id/:name` | Projektberechtigung | `getGeneratedProjectData` | signierte URL für generierte JSON-Datei |
| `POST` | `/projects/generated/:id/:name` | Projektberechtigung | `createGeneratedProjectData` | generierte JSON-Datei speichern |
| `POST` | `/projects/time/:id/start` | Projektberechtigung | `startTime` | laufende Projektzeit beginnen |
| `PATCH` | `/projects/time/:id/stop` | Zeiteintragsberechtigung | `stopTime` | Zeiteintrag beenden |
| `GET` | `/projects/time/:id` | Projektberechtigung | `getTime` | Projektzeiten laden |
| `POST` | `/projects/time/:id/new` | Projektberechtigung | `manualTime` | noch nicht terminierte Zeitdauer anlegen |

## Dateien

| Methode | Pfad | Schutz | Handler | Zweck |
|---|---|---|---|---|
| `POST` | `/files/upload` | Zielressourcenberechtigung | `createUpload` | Multipart-Datei nach Garage laden |
| `GET` | `/files/download/:id` | Dateiberechtigung | `createDownloadUrl` | 15 Minuten gültige Download-URL erzeugen |
| `DELETE` | `/files/delete/:fileId` | Dateiberechtigung | `deleteFile` | Datei entfernen und Garage-Löschjob anlegen |

Die im Quellcode auskommentierte Route `/files/complete` ist nicht aktiv.

## Materialien

| Methode | Pfad | Schutz | Handler | Zweck |
|---|---|---|---|---|
| `POST` | `/materials/create` | angemeldet | `createMaterial` | Material anlegen |
| `GET` | `/materials/get` | angemeldet | `getMaterials` | Materialien alphabetisch laden |
| `PATCH` | `/materials/:id/quantity` | Admin oder Manager | `updateMaterialQuantity` | Bestandsmenge setzen |

## Zeiterfassung

| Methode | Pfad | Schutz | Handler | Zweck |
|---|---|---|---|---|
| `GET` | `/time/day/:date` | eigene; Admin/Manager alle | `getDayEntrys` | Einträge eines lokalen Kalendertags laden |
| `GET` | `/time/open` | angemeldet | `getOpenEntrys` | unzugeordnete Dauer-Einträge des Benutzers laden |
| `POST` | `/time/new/:id` | Projektberechtigung | `newTime` | vollständigen Zeiteintrag anlegen |
| `PATCH` | `/time/:id/assign` | Zeiteintragsberechtigung | `assignTimeEntry` | Dauer einem oder mehreren Zeitfenstern zuordnen |
| `PATCH` | `/time/:id` | Zeit- und Projektberechtigung | `updateTimeEntry` | bestehenden Zeiteintrag ändern |
| `POST` | `/time/uploadWeek/:id/:date` | eigene ID; Admin/Manager alle | `createGeneratedTimeData` | Wochen-JSON speichern |
| `GET` | `/time/downloadWeek/:id/:date` | eigene ID; Admin/Manager alle | `getGeneratedTimeData` | signierte URL für Wochen-JSON laden |

## Benutzerverwaltung

Alle sechs Routen erfordern weiterhin ausschließlich die Admin-Rolle, da die
Benutzerverwaltung Teil der ausgenommenen `/CompanySettings`-Route ist.

| Methode | Pfad | Handler | Zweck |
|---|---|---|---|
| `POST` | `/user/new` | `newUser` | Benutzer anlegen |
| `GET` | `/user/get/:id` | `getUser` | Benutzer mit Dateien und Zählern laden |
| `GET` | `/user/all` | `getUsers` | aktive und inaktive, nicht gelöschte Benutzer laden |
| `PUT` | `/user/update/:id` | `updateUser` | Benutzer partiell ändern |
| `PUT` | `/user/password/:id` | `changeUserPassword` | Passwort ersetzen |
| `DELETE` | `/user/delete/:id` | `deleteUser` | Benutzer soft-löschen |

## Einstellungen

Gültige Namen sind `cabinet`, `cabinetPreset`, `nesting`, `cnc`, `cache` und `company`.

| Methode | Pfad | Schutz | Handler | Zweck |
|---|---|---|---|---|
| `GET` | `/settings/company` | angemeldet | Wrapper → `getSettingsData` | Firmeneinstellungen laden |
| `GET` | `/settings/:name` | Admin | `getSettingsData` | Einstellungsdatei laden |
| `POST` | `/settings/:name` | Admin | `createSettingsData` | Einstellungsdatei anlegen/überschreiben |

## Management

Alle Management-Endpunkte verlangen Admin- oder Managerrolle. Der Parameter `year` wählt das Startjahr des Geschäftsjahres; ohne Angabe wird das aktuelle Jahr verwendet.

| Methode | Pfad | Zweck |
|---|---|---|
| `GET` | `/management?year=2026` | Snapshot mit Entwurf, Revision, abgeschlossenen Zeitberichten, `setupCalculation`, `operationalConfig`, fixiertem `operatingPlan`, laufendem `operatingActual` und `previous` laden |
| `GET` | `/management/references` | aktive Personalkonten und Betriebsbelege laden |
| `PUT` | `/management/settings` | `{config, revision}` validieren und für das Geschäftsjahr speichern |
| `POST` | `/management/setup/approve` | gespeicherten Entwurf mit `{revision, note?}` prüfen und als unveränderliche Kalkulationsversion freigeben |
| `POST` | `/files/management-document` | PDF/JPG bis 50 MB als Betriebsbeleg hochladen; Multipart-Felder `file`, `fileName` |

Die neue Einrichtung speichert Anlagen, Restschulden, jährliche Kosten, Mitarbeiterplanung und Freigabesnapshots in `config.setup`. Die Freigabehistorie wird beim Speichern ausschließlich aus der bestehenden Serverkonfiguration übernommen; clientseitige Änderungen an ihr werden ignoriert. Eine Freigabe verlangt vollständige Zuordnungen und eine aktuelle Revision. Der Snapshot fixiert auch eine aus Zeitberichten berechnete Stundenbasis. Neue Berichte ändern anschließend die laufende Stundenanalyse, während Ist-Summen aus der aktuellen Konfiguration gelesen werden.

Die früheren Vorfall-, Zahlungs-, Regel-, Anlage- und Darlehensbuchungs-APIs sowie die alte Antwort `calculation` wurden entfernt. Anlagen und Restschulden werden im Jahresentwurf gepflegt; bestehende Tabellen werden nicht gelöscht. Die einmalige Übernahme alter Bestände bleibt vor der ersten Einrichtung erhalten. [API und Speicherung](../management/api.md) beschreibt den aktiven Vertrag ausführlich.

Konflikte bei Revisionen oder parallelen Änderungen liefern `409`. Ungültige Zuordnungen und überlappende Geschäftsjahre werden abgelehnt. Betriebsbelege sind ausschließlich für Manager/Admins zugänglich. Weitere Details stehen unter [Management und Betriebskalkulation](../frontend/management.md).

## Allgemeine Antwortkonventionen

- Erfolgreiche Reads liefern überwiegend `200`.
- Erzeugte Datensätze liefern meist `201`; einige Upserts liefern `200`.
- Validierungsfehler verwenden `400`, fehlende Authentifizierung `401`, fachlich verbotene Zeitänderungen `403`, fehlende Datensätze `404`, Konflikte `409`.
- Nicht alle Controller unterscheiden Prisma-Fehler von internen Fehlern; mehrere nicht gefundene Datensätze erscheinen daher derzeit als `500` oder als `null` in einer `200`-Antwort.
