# Tests und Qualitätsregeln

Im Backend ist derzeit kein Testskript und keine Testsuite konfiguriert. Die folgenden Ebenen bilden das empfohlene Mindestziel.

## Testpyramide

1. Unit-Tests für Passwort-/JWT-Hilfen, Manifestvalidierung, Datumswiederherstellung und Dateinamenbereinigung.
2. Controller-Tests mit isolierter Testdatenbank und emuliertem S3-Endpunkt.
3. API-Integrationstests für Authentifizierung, Rollen, Validierungsfehler und Statuscodes.
4. End-to-End-Tests für Login, Projektanlage, Zeitbuchung, Upload/Download und Projektarchiv-Roundtrip.

## Kritische Testfälle

- Kein Cookie, ungültiges JWT, Benutzer- und Admin-Rollen.
- Zugriff eines Benutzers auf fremde Zeitbuchungen.
- Datei-/Projektlöschung bei teilweisem S3-Fehler.
- Archiv mit falscher Version, doppelten Pfaden, fehlenden Einträgen oder übergroßem Manifest.
- Zeitsplitting: Summe der Segmente entspricht exakt der Ausgangsdauer.
- Tagesgrenzen und Zeitzone bei `GET /api/time/day/:date`.
- Eindeutige E-Mail, Login-, Kunden- und Projektnummern.

## Testdaten

Testdaten dürfen keine echten Kunden-, Personal- oder Zugangsdaten enthalten. Für S3-Tests ist ein eigener Bucket beziehungsweise ein lokaler Emulator zu verwenden. Jede Testsuite sollte ihre Datensätze eindeutig benennen und zuverlässig entfernen.

## Qualitätsregeln

- Jede neue Route dokumentiert Authentifizierung, Eingabe, Antwort und Fehlerfälle.
- Jeder mutierende Endpunkt besitzt Validierung und einen Autorisierungstest.
- Datenbank- und S3-Änderungen werden entweder atomar ausgeführt oder besitzen einen getesteten Rollback.
- `mkdocs build --strict` muss ohne Warnungen durchlaufen.
- Geheimnisse und generierte Verzeichnisse dürfen nicht versioniert werden.
