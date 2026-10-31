# Häfele-Fetch mit Firefox-Sidebar

Diese WebExtension verbindet den sichtbaren, normal angemeldeten Häfele-Tab mit
dem Katalog in CarpentersProduction. Sie speichert und überträgt keine
Zugangsdaten oder Cookies. An das Backend gehen ausschließlich die ausgelesenen
Artikeldaten.

## Sidebar öffnen

- Klick auf das Erweiterungssymbol: öffnet die Sidebar und den Häfele-Tab.
- Alternativ: **Ansicht → Sidebar → Carpenters · Häfele**.
- Tastaturkürzel: `Alt` + `Umschalt` + `H`.

In der Sidebar können laufende Abrufe pausiert, fortgesetzt oder abgebrochen
werden. Einzelne Artikel lassen sich überspringen und erneut suchen. Vor der
Übertragung können Name, Beschreibung, Nettopreis, Einheit und Bild-URL
bearbeitet werden.

Ein Klick auf eine beliebige Zeile der Prüfliste lädt alle für diesen Artikel
erkannten Werte direkt in die manuelle Korrektur. Auf Produktseiten wartet die
Erweiterung mindestens fünf und höchstens 15 Sekunden auf dynamisch nachgeladene
Daten. Dabei werden sichtbare Netto-, Kunden- und „Ihr Preis“-Angaben gegenüber
frühen strukturierten Listenpreisen bevorzugt.

Bei der automatischen Zuordnung berücksichtigt die Erweiterung die sichtbare
Art.-Nr., die unpunktierte Nummer im Produktpfad und Häfeles `MasterSKU`.
Artikelnummern aus einer Stückliste werden dabei nicht als Hauptartikel
übernommen.

Mit **Aktuelle Häfele-Seite einlesen** wird die sichtbare Produktseite dem
ausgewählten Katalogartikel zugeordnet. Artikelnummer und Produkt-URL werden als
Verknüpfung ausschließlich im lokalen Firefox-Profil gespeichert und bei
künftigen Abrufen wiederverwendet.

## Direkt in Firefox laden

1. `about:debugging#/runtime/this-firefox` öffnen.
2. **Temporäres Add-on laden…** wählen.
3. Die Datei `manifest.json` aus diesem Ordner auswählen.
4. CarpentersProduction unter `/Purchasing` neu laden.
5. Im Katalog **Shop-Daten fetchen** drücken. Firefox öffnet bzw. aktiviert
   Häfele. Falls nötig, dort normal anmelden oder die Sicherheitsprüfung lösen.
6. Automatische Treffer in der Sidebar prüfen und anschließend **An Anwendung
   übertragen** wählen.

War `/Purchasing` beim Laden der Erweiterung bereits geöffnet, entweder den Tab
neu laden oder das Erweiterungssymbol einmal anklicken, während dieser Tab aktiv
ist. Der Klick verbindet den bestehenden Tab und öffnet anschließend Häfele.

Eine temporär geladene Erweiterung muss nach einem Firefox-Neustart erneut
geladen werden. Für eine dauerhafte Installation kann derselbe Ordner über
Mozilla signiert und als XPI verteilt werden; am Quellcode ist dafür keine
Änderung nötig.

## Berechtigungen

- `https://www.haefele.de/*`: Artikel suchen und Produktdaten lesen.
- `/Purchasing` auf der jeweils geöffneten Anwendungsdomain: Job empfangen und
  Ergebnisse zurückgeben.
- Tabs/Storage: sichtbaren Häfele-Tab steuern, einen laufenden Job über
  Seitennavigationen hinweg behalten und manuelle Verknüpfungen lokal speichern.
- ActiveTab/Scripting: einen bereits geöffneten `/Purchasing`-Tab nach einem
  manuellen Klick mit der Erweiterung verbinden.

Die Erweiterung läuft nicht auf anderen Seiten der Anwendung.
