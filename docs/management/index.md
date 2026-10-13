# Management: Betriebskalkulation

Der Bereich bildet die interne Kosten- und Leistungsrechnung eines Betriebs ab. Ziel ist eine nachvollziehbare jährliche Kalkulationsbasis: Vermögen und Finanzierung, laufende Kosten, produktive Stunden, Kostenstellen, Maschinenkosten und freigegebene Stundensätze.

## Orientierung

| Ansicht | Wann sie verwendet wird | Einstieg |
| --- | --- | --- |
| Einrichtung | Noch keine Jahresversion freigegeben oder Konfiguration bearbeiten | Acht nummerierte Schritte |
| Jahresbetrieb | Jahresversion freigegeben | Betriebsübersicht, Stunden, Kostenstellen |
| Dokumente | Betriebsbelege sammeln | Eigene Dokumentenseite |

Ohne Freigabe führt `/Management` nach `/Management/Setup/Business`. Nach der Freigabe wechselt die ManagementBar zur Jahresnavigation. **Betrieb konfigurieren** öffnet die Einrichtung; **Zur Jahresansicht** zeigt wieder die laufenden Daten.

## Einrichtung

1. [Betrieb und Geschäftsjahr](setup/business.md): Zeitraum, Umfang und Betriebsbereiche.
2. [Vermögen und Finanzierung](setup/assets.md): Anlagen, Eröffnungsbestände, Abschreibungen und Restschulden.
3. [Jährliche Betriebskosten](setup/annual-costs.md): verbleibende Aufwendungen und Personalkostenquelle.
4. [Mitarbeiter und Arbeitsstunden](setup/hours.md): Kapazität, Tätigkeitsgruppen und Kalenderberichte.
5. [Kostenstellenverteilung](setup/distribution.md): direkte Kosten und nachvollziehbare Umlagen.
6. [Maschinenkostenrechnung](setup/machines.md): Standardmaschinen, CNC und Laufzeitbasis.
7. [BAB und Vollkostenkalkulation](setup/bab.md): Stellenkosten, Easy-Sätze und Planexport.
8. [Prüfung und Freigabe](setup/review.md): Preisvorschau und unveränderliche Jahresversionen.

## Laufender Betrieb

- [Betriebsübersicht](operating/overview.md) zeigt freigegebene Sätze und bisherige Kennzahlen.
- [Stunden und Produktivität](operating/hours.md) gliedert abgeschlossene Arbeitsberichte auf.
- [Kostenstellen und Vorjahresvergleich](operating/costs.md) erfasst Ist-Summen und vergleicht Stellenkosten.
- [Dokumente und CSV-Import](documents-import.md) erklärt Ablage, Übernahme und unterstützte Datenformate.

## Arbeitsweise

Ein Entwurf ist zunächst lokal. Schrittwechsel behalten seine Eingaben. **Entwurf speichern** sichert den gesamten Jahresentwurf; **Speichern & Weiter** sichert und navigiert zum nächsten Schritt. **Änderungen verwerfen** setzt ungespeicherte Eingaben zurück. Geschäftsjahrwechsel und Aktualisierung sind bei ungespeicherten Änderungen gesperrt.

Eine gespeicherte Änderung ist noch keine Freigabe. Die veröffentlichte Planbasis bleibt bis zur nächsten Freigabe unverändert. Ist-Summen bleiben im Jahresbetrieb separat editierbar. Leere Ist-Werte bedeuten fehlende Daten; ein geprüfter Nullbetrag wird ausdrücklich als `0` erfasst.

Im **Easy-Modus** genügen Betriebsname und mindestens ein positiver Satz in Schritt 07. Die weiteren Betriebsdaten sind optional. Neue, vollständig leere Betriebe starten mit dem Vorschlag zur Vollkalkulation; der Umfang kann in Schritt 01 umgestellt werden.

## Technische Unterlagen

[Architektur und Dateien](architecture.md), [Vorgaben und Defaultfabriken](defaults.md), [API und Speicherung](api.md), [Funktionsreferenz](functions.md) und [Tests](testing.md) beschreiben die Umsetzung. Alle Management-Endpunkte sind auf Admin- und Managerrollen beschränkt.

Einzelne Geschäftsvorfälle, Zahlungen und Darlehensbuchungen werden derzeit nicht angeboten. Die zugehörigen unbenutzten APIs und Berechnungen wurden entfernt. Vorhandene Datenbanktabellen werden nicht gelöscht; die einmalige Übernahme vorhandener Anlagen und Restschulden bleibt erhalten. Eine DATEV-Anbindung ist noch nicht implementiert.
