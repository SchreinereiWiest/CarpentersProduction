# AV Product Fetch für Firefox

Diese WebExtension verbindet angemeldete Händler-Tabs mit dem Artikelkatalog in
CarpentersProduction. Sie sortiert einen Abruf nach Lieferant und Artikelnummer,
öffnet je Lieferant die in den Shop-Einstellungen hinterlegte Startadresse und
liest die Produktdaten im normalen Firefox-Profil aus.

Zugangsdaten, Cookies und Sicherheitsprüfungen bleiben in Firefox. An
CarpentersProduction werden nur Artikelnummer, Name, Beschreibung, Nettopreis,
Einheit, Bild-URL und Produkt-URL übertragen.

## Unterstützte Shops

- Häfele: spezialisierte Erkennung für Produktnummer, dynamischen Nettopreis und
  Produktseiten.
- Würth und weitere Shops: generische Suche und Produktdatenerkennung über
  sichtbare Artikeldaten, Meta-Tags und JSON-LD.

Weitere Händler können in CarpentersProduction mit dem Plugin
`AV Product Fetch (Firefox)` und einer HTTPS-Shop-Startadresse aktiviert werden.

## Sidebar

- **Aktuelle Seite prüfen + aufnehmen** funktioniert auch ohne laufenden
  Shop-Fetch. Ist die aktive Domain einem in CP konfigurierten Lieferanten
  bekannt, wird daraus eine neue Prüfliste erzeugt. Fehlt der Artikel, wird er
  mit diesem Lieferanten ergänzt und bei der Übertragung im internen Shop sowie
  im Nummernkatalog angelegt.
- **Panel leeren** entfernt den aktuellen Job und die Prüfliste. Lokal
  gespeicherte Produktverknüpfungen bleiben bestehen.
- Ergebniszeilen öffnen die erkannten Daten direkt in der manuellen Korrektur.
- Abrufe lassen sich pausieren, fortsetzen, korrigieren und gesammelt an CP
  übertragen.

## Direkt in Firefox laden

1. `about:debugging#/runtime/this-firefox` öffnen.
2. Ein eventuell noch geladenes altes Häfele-Add-on entfernen.
3. **Temporäres Add-on laden…** wählen.
4. `Plugins/av-firefox-extension/manifest.json` auswählen.
5. CarpentersProduction unter `/Purchasing` neu laden.
6. Im Katalog **Shop-Daten fetchen** wählen, Lieferanten und Artikel markieren
   und den Abruf starten.

Eine temporär geladene Erweiterung muss nach einem Firefox-Neustart erneut
geladen werden. Für eine dauerhafte Installation kann dieser Ordner als XPI
signiert werden.

## Berechtigungen

- `https://*/*`: konfigurierte Händlerseiten öffnen und Produktdaten lesen.
- `/Purchasing`: Abrufjob empfangen und geprüfte Ergebnisse zurückgeben.
- Tabs/Storage: den aktiven Händler-Tab steuern sowie Prüfliste und lokale
  Verknüpfungen im Firefox-Profil halten.
