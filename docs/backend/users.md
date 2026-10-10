# Benutzerverwaltung

Alle Routen unter `/api/user` verwenden `authenticateAdmin`. Passworthashes werden mit bcrypt und Kostenfaktor 12 erstellt und nie in API-Antworten ausgewählt.

## Liste

`GET /api/user/all` ruft `getUsers` auf. Es lädt Datensätze mit `deletedAt: null`, sortiert nach Nachname, Vorname und E-Mail und liefert:

- `id`, Vor-/Nachname, `login`, `email`, `role`, `isActive`, Zeitstempel,
- `_count` für Dateien, erstellte Kunden/Projekte, Kommunikation, Termine und Zeittabelle.

Deaktivierte, aber noch nicht soft-gelöschte Benutzer bleiben sichtbar.

## Einzelansicht

`GET /api/user/get/:id` ruft `getUser` auf. Zusätzlich zu den Stammdaten und Zählern werden hochgeladene Dateien mit Basisfeldern eingebettet und absteigend nach Uploadzeit sortiert. Soft-gelöschte Benutzer gelten als nicht gefunden (`404`).

## Anlegen

`POST /api/user/new` erwartet mindestens `email`, `login` und `password`; `firstName`, `lastName` und `role` sind optional. Die Standardrolle ist `user`.

Validierung:

- Passwort mindestens 8 Zeichen,
- E-Mail wird getrimmt und kleingeschrieben,
- E-Mail und Login müssen eindeutig sein.

Erfolg: `201 { "user": ... }`. Konflikte ergeben `409`. Der Konflikttext nennt derzeit auch bei einem doppelten Login nur die E-Mail-Adresse.

## Ändern

`PUT /api/user/update/:id` ist partiell: Nur vorhandene Felder aus `firstName`, `lastName`, `login`, `email`, `role` und `isActive` werden gesetzt. Leere Namen werden zu `null`; Login und E-Mail dürfen nicht leer sein. E-Mail wird normalisiert.

Eine Rollen- oder Statusänderung erhöht `authVersion` und widerruft alle bestehenden Sessions des Benutzers.

`Boolean(isActive)` wird direkt verwendet. Ein String wie `"false"` wird deshalb zu `true`; Clients sollten einen echten JSON-Boolean senden.

## Passwort ändern

`PUT /api/user/password/:id` erwartet `{ "password": "..." }` mit mindestens 8 Zeichen. Das neue Passwort wird mit bcrypt gehasht und `authVersion` erhöht. Erfolg: `200` mit einer Meldung; unbekannte ID: `404`.

## Soft Delete

`DELETE /api/user/delete/:id` setzt `isActive: false`, `deletedAt` auf den aktuellen Zeitpunkt und erhöht `authVersion`. Verbundene Fachdaten bleiben erhalten; Login und vorhandene Tokens werden abgewiesen.

## Bootstrap-Skripte

`src/scripts/createAdmin.js` und `createUser.js` lesen E-Mail, Login und Passwort ausschließlich aus den `BOOTSTRAP_ADMIN_*`- beziehungsweise `BOOTSTRAP_USER_*`-Umgebungsvariablen. Das Passwort muss mindestens 12 Zeichen lang sein. Sie sind nicht als Package-Skripte registriert und sollten nur einmalig mit temporär gesetzten Werten ausgeführt werden.
