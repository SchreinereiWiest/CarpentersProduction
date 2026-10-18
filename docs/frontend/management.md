# Management und Betriebskalkulation

Die ausführliche Dokumentation liegt im eigenen Bereich [Management](../management/index.md). Sie beschreibt jede Einrichtungs- und Jahresansicht sowie Berechnung, Vorgaben, Import und Backendbeziehungen.

## Einrichtung

| Schritt | Bereich |
| --- | --- |
| 01 | [Betrieb und Geschäftsjahr](../management/setup/business.md) |
| 02 | [Vermögen und Finanzierung](../management/setup/assets.md) |
| 03 | [Jährliche Betriebskosten](../management/setup/annual-costs.md) |
| 04 | [Mitarbeiter und Arbeitsstunden](../management/setup/hours.md) |
| 05 | [Kostenstellenverteilung](../management/setup/distribution.md) |
| 06 | [Maschinenkostenrechnung](../management/setup/machines.md) |
| 07 | [BAB und Vollkostenkalkulation](../management/setup/bab.md) |
| 08 | [Prüfung und Freigabe](../management/setup/review.md) |

## Jahresbetrieb

Nach der Freigabe zeigt die ManagementBar [Betriebsübersicht](../management/operating/overview.md), [Stunden und Produktivität](../management/operating/hours.md) sowie [Kostenstellen und Vorjahresvergleich](../management/operating/costs.md). **Betrieb konfigurieren** öffnet erneut die Einrichtung. Planversionen bleiben bis zur nächsten Freigabe fixiert; laufende Ist-Felder und neue Berichte werden separat ausgewertet.

[Dokumente und CSV-Import](../management/documents-import.md) beschreibt die unterstützte Datenübernahme. Eine DATEV-Anbindung ist noch nicht eingerichtet. Die unbenutzte Vorfall- und Zahlungsrechnung ist entfernt.

## Entwicklung

[Architektur und Dateien](../management/architecture.md), [Defaults](../management/defaults.md), [API](../management/api.md), [Funktionsreferenz](../management/functions.md) und [Tests](../management/testing.md) beschreiben die Umsetzung. Die vorhandenen Default- und Rechenmodule liegen unter `Engine/src/management/`; Frontendmasken und Backendservices sind entsprechend untergliedert.
