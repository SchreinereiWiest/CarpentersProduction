# Rollenabhängige Startseite

Die Route `/` ist eine modulare Arbeitsübersicht. Sichtbare Inhalte werden serverseitig nach Mandant, Lizenz und Membership-Rolle begrenzt; die persönliche Reihenfolge oder das Ausblenden eines Moduls erweitert keine Berechtigung.

| Rolle | Standardmodule |
|---|---|
| Mitarbeiter | zugewiesene Aufträge, eigene beziehungsweise projektbezogene Termine und kompakte Kalenderwoche |
| Manager | Mitarbeitermodule plus im DMS persönlich zur Bearbeitung freigegebene Dokumente |
| Administrator | Aufträge, alle Produktionstermine der Woche, freigegebene Shop-Einkäufe, offene Lieferungen mit verknüpfter Auftragsbestätigung und gefilterter DMS-Eingang |

Eine Management-Auftragszuweisung erzeugt auf der Startseite des betroffenen Accounts eine hervorgehobene Notification und erscheint im Modul **Meine Aufträge** samt Info und geplantem Kalenderzeitraum.

## Personalisierung

Unter **Einstellungen → Benutzeroberfläche → Startseite** kann jeder Account seine verfügbaren Module ein-/ausblenden und deren Reihenfolge ändern. Die Auswahl liegt als JSON in `TenantMembership.preferences.home` und gilt damit nur für diese Firmenmitgliedschaft.

User und Manager können dort außerdem sämtliche Oberflächenbereiche – Aufmaßdarstellung, Bedienhilfen, Tastenkürzel und Fensterlayout – persönlich konfigurieren. Unter **Persönlicher Cache** verwalten sie Offline-Modus, Vorladen, Aufbewahrungsdauer und lokale Daten, ohne Zugriff auf Firmen-, Projekt-, Benutzer- oder Advanced-Einstellungen zu erhalten.

Administratoren konfigurieren im selben Reiter zusätzlich die firmenweiten Paperless-Tags beziehungsweise Dokumenttypen, die im Startseitenmodul **Dokumenteingang** erscheinen. Standardmäßig sind `Rechnung`, `Auftragsbestätigung` und `Angebot` aktiv.

## Datenfluss

`GET /api/dashboard` liefert einen kompakten, bereits rollenbezogenen Snapshot für die aktuelle Kalenderwoche. Die Terminmodule zeigen dieselbe Sichtbarkeit wie der Firmenkalender: firmenweit sichtbare Termine sowie die eigenen privaten Termine. Projekte und Termine kommen aus PostgreSQL. Freigegebene Projektbeschaffungen werden aus den bestehenden `procurement.json`-Dateien gelesen; offene Lieferungen werden nur gezeigt, wenn das Projekt eine im DMS verknüpfte Auftragsbestätigung besitzt.

Die Dokumentbearbeitung wird im Dokumenteingang über **Bearbeiter** gesetzt. Manager sehen danach dieselbe Paperless-Referenz in ihrem Startseitenmodul und öffnen die eigentliche Datei weiterhin im geschützten Dokumentbereich.
