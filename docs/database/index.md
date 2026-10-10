# PostgreSQL und Prisma

`Backend/prisma/schema.prisma` definiert PostgreSQL als Datenquelle. IDs sind UUIDs, die überwiegend mit `gen_random_uuid()` in der Datenbank entstehen. Zeitstempel werden als Prisma-`DateTime` gespeichert.

## Modelle

| Modell | Zweck | Wichtige Beziehungen |
|---|---|---|
| `User` | Anmeldung, Rolle und Verantwortlichkeiten | erstellt Kunden/Projekte; besitzt Dateien, Termine, Kommunikation und Zeiten |
| `Customer` | Kundenstammdaten | Adressen, Projekte, Kommunikation, Termine und Dateien |
| `CustomerAddress` | eine Kundenadresse | gehört zu einem Kunden; optional in Terminen referenziert |
| `Project` | Projektstammdaten und Status | Kunde, Ersteller, Dateien, Speicherobjekte, Zeiten, Termine und Kommunikation |
| `Communication` | Kunden-/Projektkommunikation | Kunde, optional Projekt und Ersteller |
| `Appointment` | Termin | Kunde, optional Projekt, Adresse und Ersteller |
| `S3Object` | technischer Garage/S3-Verweis | Dateien oder `ProjectStorage` |
| `File` | fachliche Dateimetadaten | optional Kunde/Projekt/Benutzer und genau ein `S3Object` |
| `ProjectStorage` | binäre oder strukturierte Projektdaten | genau ein Projekt und ein `S3Object` |
| `Material` | Platten-/Lagermaterial | eigenständiges Inventarmodell |
| `TimeEntry` | Arbeitszeit in Minuten | Projekt und optional Benutzer |
| `AuditLog` | Sicherheits- und Aktionsspur | optionaler ausführender Benutzer sowie Aktion, Ressource und Request-Metadaten |
| `StorageDeletionJob` | dauerhafte Outbox für Garage-Löschungen | eindeutiger Bucket/Objektschlüssel, Status, Versuche und nächster Versuch |

## Enums

- `UserRole`: `admin`, `manager`, `user`
- `CustomerStatus`: `lead`, `active`, `inactive`

Projektstatus, Priorität, Terminstatus, Arbeitstyp und Dateistatus sind freie Strings. `TimeEntry.workType` ist bewusst kein Enum; zulässige Werte sollen aus `settings-company.json` stammen.

## Löschverhalten

- Kunde gelöscht: Adressen, Projekte und direkt zugeordnete Dateien werden durch Datenbank-Cascades mitgelöscht.
- Projekt gelöscht: Projektdateien, `ProjectStorage` und Zeiten werden per Cascade entfernt; Kommunikation und Termine verlieren nur den Projektbezug.
- `S3Object` gelöscht: zugehörige `File`- und `ProjectStorage`-Datensätze werden per Cascade entfernt.
- Benutzer gelöscht: Der API-Endpunkt führt ein Soft Delete über `deletedAt` und `isActive` aus.

!!! warning "Datenbank-Cascade löscht keine Garage-Objekte"
    Ein SQL-Cascade kennt den Objektspeicher nicht. Für Projekte und Dateien verwenden die Controller deshalb explizite S3-Löschbefehle. Direkte Löschungen in PostgreSQL können verwaiste Garage-Objekte erzeugen.

## Modellhinweise

- `Material.width` und `Material.height` sind Pflichtfelder.
- `Material.pricePerSquareMeter` ist `Decimal(10,2)`; API-Clients sollten Dezimalwerte nicht ungeprüft als JavaScript-Gleitkommazahl behandeln.
- `TimeEntry.duration` wird in Minuten gespeichert.
- `AuditLog` bewahrt erfolgreiche sicherheitsrelevante Aktionen auch nach dem Löschen der Fachressource auf; beim Löschen eines Benutzers wird nur dessen Referenz auf `null` gesetzt.
- `User.authVersion` bindet JWTs an den aktuellen Sessionstand und ermöglicht sofortigen Widerruf.
- `StorageDeletionJob` trennt die atomare DB-Änderung von der idempotenten Garage-Löschung. `pending`/`failed` werden durch den Worker erneut verarbeitet.
- Soft-Delete-Felder existieren auf mehreren Modellen, werden aber nicht von allen Abfragen einheitlich berücksichtigt.
