# Seiten und Komponenten

## Globale Komponenten

| Komponente | Datei | Aufgabe |
|---|---|---|
| `SideBar` | `components/sideBar.jsx` | Hauptnavigation, Rollenfilter, Ein-/Ausklappen und Fullscreen-Steuerung |
| `ProjectBar` | `components/projectBar.jsx` | Navigation zwischen Projekt, CAD, Korpus, Liste, Nesting, Zuschnitt, CNC, Zeiten und Einstellungen |
| `SettingsBar` | `components/settingsBar.jsx` | Tabnavigation für Unternehmens-, Cache-, Benutzer-, Projekt- und CNC-Einstellungen |
| `ImageGallery` | `components/images/imageGalery.jsx` | lädt signierte Datei-URLs und zeigt Projektbilder |
| `ImageCarousel` | `components/images/ImageCarousel.jsx` | blättert durch eine übergebene Bildliste |

## Anmeldung und Start

`Login` verwaltet Login, Passwort und Fehlermeldung lokal. Nach erfolgreichem Request wird die Identität neu geladen. `HomeAdmin` bildet die geschützte Startseite und bindet die globale Sidebar ein.

## Kunden

| Seite | Verantwortung |
|---|---|
| `contacts.jsx` | paginierte Kundenliste laden und zu Detail/Neuanlage navigieren |
| `newcontact.jsx` | Kunden- und Adressdaten erfassen und anlegen |
| `showcontact.jsx` | Kunde und zugehörige Projekte parallel laden; `.cproject` oder `.cpimport` importieren |
| `editcontact.jsx` | Kunden-/Adressdaten laden, bearbeiten und speichern |
| `newproject.jsx` | älterer Ablauf für Projektanlage und Datei-Upload |

Alle Kundenrouten sind im Frontend Admin-seitig geschützt. Die moderne Projektanlage für einen Kunden verwendet `/Kontakte/NewProject/:userId` und öffnet den `CabinetEditor` im Create-Modus.

## Projekte

| Seite | Aufgabe |
|---|---|
| `overview.jsx` | sichtbare Projekte laden, darstellen und `.cproject` oder `.cpimport` importieren |
| `home.jsx` | Projektdetails, Kunde, Dateien und Bildgalerie anzeigen |
| `settings.jsx` | Stammdaten ändern, Dateien hochladen/löschen, Archiv exportieren und Projekt löschen |
| `cad.jsx` | CAD-/GLB-Dateien laden und in Three.js darstellen |
| `list.jsx` | generierte Teileliste laden, aufbereiten und als PDF ausgeben |
| `nesting.jsx` | Teile/Materialien laden, automatisches oder manuelles Nesting durchführen und speichern |
| `cut.jsx` | verschachtelte Platten als Zuschnittstapel abarbeiten |
| `cncEditor.jsx` | CNC-Teile gruppieren, Flächen/Operationen auswählen und grafisch bearbeiten |
| `timeTracking.jsx` | Projektzeiten, Start/Stopp und manuelle Dauerbuchungen |
| `cabinetEditor.jsx` | Korpusse, Sektionen, Fronten, Materialien, Presets, Teilelisten und CNC-Daten bearbeiten |

Der gemeinsame Importdialog erkennt Palette-CAD-Pakete an `.cpimport`, prüft
deren Manifest, repariert das Palette-CAD-Schlusskomma in `model.json` und
erzeugt `list.json`, `cabinet.json` und `aufmas.json`. PDF-Seiten werden im
Browser gerendert und vor dem Import der Projekt-Startseite, einer
Aufmaß-Frontansicht oder keinem Ziel zugeordnet. Manifestierte PNGs werden als
Aufmaß-Bilder getrennt von den Startseitenbildern gespeichert. Der Dialog zeigt
alle verwendeten `MID`-/Kantenreferenzen und übersetzt sie auf ausgewählte
Materialien der internen Datenbank. Nicht-KO-Bauteile ohne gesetzte `BPID`
werden beim Einlesen verworfen; KO-Datensätze bleiben davon ausgenommen. Aus
den CAD-Positionen der Frontbauteile entstehen Cabinet-Fronten samt inneren und
äußeren Fugen sowie linearer Aufteilung. Seiten, Böden und Deckel bestimmen die
reine Korpushöhe, den Bodenabstand und die durchgehende Bauteilrichtung. Lage
und Außenmaße der Rückwand erzeugen automatisch die Ausführung Stumpf, Falz,
Nut geschlossen oder Nut offen. Das Palette-CAD-KO-Tiefenmaß wird immer um die
Frontstärke, bei einer stumpfen Rückwand zusätzlich um deren Stärke korrigiert.
Die Teilelisten-Gruppierung des Standardkorpus wird in importierte Cabinets
übernommen, sodass etwa Fronten beim Speichern als eigene Gruppe entstehen.

## Mitarbeiterkalender

`Personal` verbindet die aktuelle Identität mit `useEmployeeCalendar`. `EmployeeCalendar` rendert Wochensteuerung, fehlende Zeiten und Tagespalten. `DayColumn`, `TimeBlock` und `TimeSlot` bilden die Kalendergeometrie; `EditTimeModal` bearbeitet einen ausgewählten Eintrag, `MissingTimes` zeigt noch nicht platzierte Dauerbuchungen.

## Lager

`home.jsx` lädt Materialien und öffnet `MaterialModal` für neue Datensätze. `updateQuantity` schreibt Bestandsänderungen und aktualisiert den lokalen Array-State funktional.

## Einstellungen

`companySettings.jsx` steuert die aktive Einstellungsregisterkarte. Die Panels besitzen folgende Zuständigkeiten:

| Panel | Inhalt |
|---|---|
| `CompanySettingsPanel` | Arbeitszeiten, Pausen und Tätigkeitsarten |
| `CacheSettingsPanel` | Cache-Gültigkeit und Invalidierung |
| `UserSettingsPanel` | Benutzer laden, anlegen, ändern, Passwort setzen und soft-löschen |
| `CabinetSettingsPanel` | Korpus-, Material-, Verbinder- und Fertigungsvorgaben |
| `CncSettingsPanel` | CNC-Geometrien, Bohrraster, Fräs- und Beschlagparameter |

## Darstellungsprinzipien

- Seiten kombinieren meist `SideBar` mit einem fachlichen Hauptbereich.
- Projektseiten ergänzen `ProjectBar` und lesen `projectId` aus `useParams`.
- Lade-, Fehler-, Dialog- und Auswahlzustände werden überwiegend lokal gehalten.
- Editor-Komponenten erhalten Fachzustand und Setter über Props; ein externer State-Store wird nicht verwendet.
