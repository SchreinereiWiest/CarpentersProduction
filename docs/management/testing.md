# Tests und Entwicklung

Die Aufteilung verändert Importpfade und entfernt eine nicht mehr verwendete Buchungsrechnung. Deshalb werden der aktive Funktionsumfang, Defaultkopien und die Nichterreichbarkeit alter APIs ausdrücklich geprüft.

## Frontend

```bash
cd Frontend
pnpm test
pnpm exec eslint src/pages/management
pnpm build
```

`test/management/management-workflows.test.jsx` prüft Einstieg ohne Freigabe, acht Schritte, Entwurferhalt beim Wechsel, Personalübernahme, Firmenzeiten, Anlage-/Restschuldpflege, CSV-Vorschau, Easy-Freigabe, Navigation nach Veröffentlichung, reale Zeitaufschlüsselung und getrennte Ist-Summen.

`test/management/management-uuid.test.js` prüft native Browser-UUIDs und den sicheren HTTP-kompatiblen Fallback. Die Workflowtests simulieren ebenfalls fehlendes `crypto.randomUUID`, damit neue Formularfabriken im LAN funktionsfähig bleiben.

## Rechenmodell und Validierung

```bash
cd Backend
node test/management/foundations.test.js
node test/management/setup.test.js
```

Die Grundlagenprüfungen decken Geschäftsjahre, Prisma-Datumswerte, positive/negative Centverteilung, unabhängige Defaultfabriken, fehlerhafte Eingaben und einmalige Bestandsübernahme ab.

Die Fachprüfungen decken CNC mit 26,00 €/h, Restschuld/Tilgung, exklusive Zinsmethoden, Darlehenszinsverteilung, Plan-/Ist-Trennung, fehlende Anlagen-Ist-Kosten, Wiederbeschaffungswert, Restnutzungsdauer, Teilzeit, Tätigkeitsgruppen, Berliner Tage, Ist-Zeitbasis, Hilfskostenstellen, individuelle Personalkosten, Freigabebedingungen und CSV-Deduplizierung ab.

## API mit isolierter Datenbank

```bash
cd Backend
MANAGEMENT_TEST_DATABASE_URL='postgresql://user:password@127.0.0.1:55439/management_test?schema=public' node test/management/api.test.js
```

Die Datenbank muss den bestehenden Prisma-Schemastand besitzen. Der Test erlaubt ausschließlich einen ausdrücklich angegebenen lokalen Host und den Datenbanknamen `management_test`. Er setzt seine Management-/Personalfixtures zurück und darf nie mit der Anwendungsdatenbank gestartet werden. Ohne Variable wird dieser Test übersprungen.

Geprüft werden Rollen, Jahresparameter, aktive Snapshotfelder, alte Bestandsübernahme, Revisionen, Freigabeverweigerung, feste Planstunden trotz neuer Berichte, unveränderliche Historie, aktuelle Ist-Felder, Folgejahr, Periodenkonflikte, entfernte Buchungs-APIs und Auditnachweise.

Die Package-Scripts `test:management` und `test:management:api` zeigen auf die gruppierten Dateien. Direkte Aufrufe oben zeigen alle einzelnen Prüffälle.

## Dokumentation und Daten

```bash
.venv-docs/bin/mkdocs build --strict
git diff --check
```

Die Struktur benötigt keine neue Prisma-Migration und löscht keine früheren Tabellen. Produktionsdaten werden durch Code- und Dokumentationsprüfungen nicht verändert. Neue gemeinsame Dateien werden über den bestehenden `shared`-Dockerkontext bzw. Entwicklungs-Mount bereitgestellt.
