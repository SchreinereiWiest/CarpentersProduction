# UI-/UX-Konzept für CarpentersProduction

## Kurzfassung

CarpentersProduction braucht keinen grundlegenden Layoutwechsel. Die bestehende Kombination aus globaler Navigation links und projektbezogener `ProjectBar` oben ist eine gute, eigenständige Basis. Sie vermittelt bereits: **Zuerst wähle ich meinen Arbeitsbereich, dann arbeite ich innerhalb eines Projekts entlang des Fertigungsprozesses.**

Der empfohlene Entwurf entwickelt genau dieses Prinzip weiter:

- Die linke Navigation bleibt flach und erhält klarere Gruppen, sichtbare Beschriftungen und einen getrennten Utility-Bereich.
- Die `ProjectBar` wird zu einer beschrifteten, durchgehenden **Projekt-Prozessleiste** mit fest sichtbarem Projektkontext.
- Neue Projektfunktionen werden fachlich in den Ablauf einsortiert, nicht als weitere gleichrangige Icons angehängt.
- CNC, CAM, Postprozessor und Maschinenanbindung bleiben ein zusammenhängender Fertigungsbereich. Sie erzeugen keine neue obere Navigationsebene.
- Einstellungen, Management-Einrichtung und künftige Mitarbeiterverwaltung verwenden eine seitliche Bereichsauswahl **im Inhalt**, weil diese Bereiche keine lineare Projektkette sind.
- Seiten erhalten eine gemeinsame visuelle Grammatik für Titel, Aktionen, Status, Tabellen, leere Zustände und Meldungen.

Das Ergebnis soll nicht wie eine typische kommerzielle Verwaltungssoftware wirken, sondern wie ein ruhiges, präzises Werkstattwerkzeug: projektbezogen, direkt und fachlich nachvollziehbar.

## Was am bestehenden Konzept erhalten bleiben sollte

### 1. Das Projekt ist der Arbeitskontext

Beim Öffnen eines Projekts bleiben Aufmaß, Konstruktion, Stückliste, Nesting, Zuschnitt, CNC, Zeiten, Einkauf und Kalkulation gemeinsam erreichbar. Diese Entscheidung ist richtig. Sie verhindert, dass Benutzer fachliche Informationen über globale Modulordner zusammensuchen müssen.

### 2. Die Oberfläche folgt dem Arbeitsablauf

Die Reihenfolge der Projektfunktionen bildet schon heute einen großen Teil der realen Prozesskette ab. Diese lineare Erzählung ist wertvoller als eine klassische App-Navigation mit Hauptmenü, Untermenü und weiteren Tabs.

### 3. Arbeitsflächen dürfen dicht sein

Aufmaß, Konstruktion, Nesting und CNC sind Werkzeuge, keine Marketingseiten. Ihre Zeichenflächen, Listen und Eigenschaftenbereiche dürfen informationsreich bleiben. Die Verbesserung sollte vor allem Orientierung, Hierarchie und Zustände betreffen, nicht die fachliche Dichte künstlich reduzieren.

### 4. Die vorhandene Farbidee ist brauchbar

Das bestehende Theme-System mit Graphit-/Grautönen, heller Arbeitsfläche und warmem Kupferakzent im Light Mode bietet eine gute Grundlage. Ein komplett neues Branding ist nicht erforderlich.

## Beobachtungen im aktuellen Frontend

Die folgenden Punkte ergeben sich aus der aktuellen Routen-, Komponenten- und Seitenstruktur.

### Navigation

- Die globale Sidebar kann abhängig von Rolle und Modulen bis zu elf Ziele plus Einklappen und Vollbild enthalten.
- Die Sidebar startet eingeklappt. Damit sind viele Bereiche zunächst nur über Icons und Hover-Titel erkennbar. Auf Touch-Geräten entfällt dieser Hinweis.
- Ziele und globale Aktionen sind optisch gleich behandelt. „Projekte“, „Benutzer“, „Navigation einklappen“ und „Vollbild“ wirken dadurch wie gleichartige Navigationspunkte.
- Die Project Bar enthält bereits zwölf Icon-Ziele. Alle sind nahezu gleich gewichtet und nur über Icon, `title` und `aria-label` benannt.
- Die Project Bar zeigt nicht, in welchem konkreten Projekt man arbeitet. Der Projektname erscheint auf manchen Seiten im Inhalt, auf anderen nicht.
- Der aktive Zustand ist ein dunkleres Rechteck auf dunkler Fläche. Er ist funktional, aber nicht schnell genug erfassbar.
- Settings Bar und Management Bar führen weitere horizontale Navigationen ein. Dadurch entstehen je nach Bereich unterschiedliche Navigationslogiken.

### Seiten und Arbeitsflächen

- Die Seiten bauen ihre Grundstruktur jeweils selbst aus `SideBar`, `main`, optionaler `ProjectBar`, Header und Scrollbereich. Abstände, Farben und Titelhierarchien unterscheiden sich deshalb sichtbar.
- Es werden sowohl `gray`- als auch `slate`-Paletten sowie einige fachbereichsspezifische feste Farben verwendet. Das Theme-System fängt einen Teil davon ab, aber die visuelle Sprache bleibt uneinheitlich.
- Die Startseite ist derzeit leer und bietet keine Orientierung oder Wiederaufnahme zuletzt genutzter Arbeit.
- Die Projektliste verwendet teilweise englische Bezeichnungen wie „Create Project“, „Title“, „Customer“ und „StartDate“, während der übrige Bereich überwiegend deutsch ist.
- Die Projektübersicht zeigt Bilder und Basisdaten, beantwortet aber noch nicht sofort die wichtigsten Fragen: Wo steht das Projekt? Was ist als Nächstes relevant? Wo gibt es unvollständige Daten?
- Lade-, Leer-, Fehler- und Erfolgszustände sind je nach Modul unterschiedlich gestaltet.

### Skalierungsrisiko

Weitere Funktionen nur als zusätzliche Icons oder Tabs einzufügen, führt absehbar zu drei Problemen:

1. Benutzer müssen sich immer mehr Symbole merken.
2. Die Prozessreihenfolge wird durch Nebenfunktionen undeutlich.
3. Auf kleineren Desktop- und Tabletbreiten wird horizontales Scrollen zum Normalzustand, ohne dass der verdeckte Inhalt sichtbar angekündigt wird.

## Zielbild: drei klar getrennte Flächen

Das neue Layout besteht weiterhin aus wenigen, stabilen Bereichen:

```text
┌──────────────────────┬────────────────────────────────────────────────────────────────────────┐
│ Globale Navigation   │ Projektkontext + durchgehende Prozessleiste                           │
│                      ├────────────────────────────────────────────────────────────────────────┤
│ Arbeitsübersicht     │                                                                        │
│ Projekte             │                        aktuelle Arbeitsfläche                           │
│ Kalender             │                                                                        │
│ Team & Zeit          │       Liste / Formular / Editor / Zeichenfläche / Eigenschaften        │
│ Kontakte             │                                                                        │
│ Dokumente            │                                                                        │
│ Lager                │                                                                        │
│ Einkauf              │                                                                        │
│ Management           │                                                                        │
│                      │                                                                        │
│ Einstellungen        │                                                                        │
│ Profil               │                                                                        │
└──────────────────────┴────────────────────────────────────────────────────────────────────────┘
```

Wichtig: Projektname und Prozessschritte liegen **in derselben Leiste**. Es entsteht keine zusätzliche Top Bar und keine Ordner-/Unterordner-Navigation.

Außerhalb eines Projekts entfällt die Prozessleiste vollständig. Die Seite beginnt dann direkt mit einem einheitlichen Seitenkopf im Inhalt.

## Entwurf der globalen Navigation

### Aufbau

Die Sidebar bleibt die einzige globale Navigation. Auf normalem Desktop ist sie standardmäßig beschriftet; in dichten Arbeitsbereichen kann sie auf Wunsch auf eine schmale Icon-Leiste reduziert werden.

Empfohlene Gliederung:

| Gruppe | Direkte Ziele |
|---|---|
| Arbeit | Arbeitsübersicht, Projekte, Kalender, Team & Zeit |
| Organisation | Kontakte, Dokumente, Lager, Einkauf |
| Betrieb | Management |
| fest am unteren Rand | Firmeneinstellungen, Profil, Navigation einklappen |

Die Gruppenüberschriften sind reine Orientierung und nicht anklickbar. Es gibt keine aufklappbaren Ordner.

### Verhalten

- Breite Version: etwa 220–232 px, Icon und Klartext.
- Kompakte Version: etwa 68–72 px, mit gut lesbarem Tooltip bei Tastaturfokus und Hover.
- Die gewählte Breite wird pro Benutzer oder Browser gespeichert.
- Der aktive Bereich erhält einen klaren Akzentbalken und stärkeren Textkontrast, nicht nur eine dunklere Hintergrundfläche.
- Einstellungen und Profil bleiben am unteren Rand; die eigentlichen Arbeitsbereiche scrollen bei geringer Höhe getrennt.
- Vollbild ist keine globale Navigation. Die Aktion gehört in die Werkzeugleiste der dichten Editoren, in denen sie tatsächlich nützt.

### Mobile Variante

Auf dem Telefon bleibt eine untere Navigation sinnvoll. Statt bis zu elf horizontal scrollenden Icons sollten vier häufige Ziele direkt erscheinen, zum Beispiel Arbeitsübersicht, Projekte, Kalender und Team & Zeit. „Bereiche“ öffnet eine klar beschriftete Liste der übrigen Ziele als Sheet. Das betrifft nur die globale mobile Navigation und erzeugt keine verschachtelte Projekt-Topbar.

## Entwurf der Projekt-Prozessleiste

### Prinzip

Die Project Bar wird nicht abgeschafft, sondern zu dem zentralen Orientierungselement des Produkts ausgebaut.

```text
┌──────────────────────────┬──────────────────────────────────────────────────────────────────────────────┐
│ ‹ Projekte               │  Projekt  Aufmaß  Konstruktion  Variablen  Stückliste  Nesting  Zuschnitt  CNC/CAM │
│ 24-031 · Küche Müller    │  [●]      [●]     [● aktiv]     [!]        [○]         [○]      [○]       [○]     │
│ Kunde · Status           │  ────────────────────────────────────────────────────────────────────────────  │
│                          │  Dokumente  Einkauf  Zeiten  Kalkulation                         Einstellungen │
└──────────────────────────┴──────────────────────────────────────────────────────────────────────────────┘
```

Die Darstellung im Wireframe ist schematisch. In der realen Leiste liegen die Ziele in **einer horizontalen Navigationsreihe**. Die zweite Textzeile im Projektblock zeigt nur Kontext, keine weitere Navigation. Unterstützende Projektbereiche werden durch Abstand oder einen feinen vertikalen Trenner vom Fertigungsfluss unterschieden, nicht in ein Untermenü verschoben.

### Fester Projektblock

Links innerhalb der Prozessleiste steht ein kompakter, nicht scrollender Kontextblock:

- Zurück zu Projekte
- Projektnummer und gekürzter Projekttitel
- Kunde oder Auftraggeber
- Projektstatus als kleine Statusmarke

Damit ist auf jeder Projektseite sofort klar, wo gearbeitet wird. Wiederholte große Projektüberschriften in den einzelnen Modulen können entfallen oder kleiner werden.

### Empfohlene Reihenfolge

| Bereich | Rolle im Ablauf | Empfehlung |
|---|---|---|
| Projekt | Einstieg und Gesamtstatus | bleibt erster Punkt |
| Aufmaß | Erfassung der Ausgangsdaten | bleibt Prozessschritt |
| Konstruktion | heutiger Schrankkonfigurator | verständlicher Kurzname; Fachname kann als Unterzeile/Tooltip bleiben |
| Variablen | neue variable Projektdaten | zwischen Konstruktion und abgeleiteten Listen |
| Stückliste | abgeleitete Fertigungsdaten | bleibt Prozessschritt |
| Nesting | Plattenbelegung | bleibt Prozessschritt |
| Zuschnitt | Bearbeitung der Platten | bleibt Prozessschritt |
| CNC/CAM | Bearbeitungen bis Maschinenausgabe | ein gemeinsamer Fertigungsbereich |
| Dokumente | Anlagen und Fertigungspläne | Supportbereich nach feinem Trenner |
| Einkauf | projektbezogene Beschaffung | Supportbereich |
| Zeiten | Projektzeiten | Supportbereich |
| Kalkulation | Vor-/Nachkalkulation | Supportbereich |
| Einstellungen | Projektstammdaten und technische Verwaltung | optisch am Ende abgesetzt |

Diese Reihenfolge ist keine harte Sperre: Jeder Schritt bleibt direkt anklickbar. Sie erzählt lediglich den typischen Ablauf.

### Beschriftung und Zustand

- Jeder Eintrag erhält Icon **und** kurzen sichtbaren Text. Bedeutungen dürfen nicht nur über Hover vermittelt werden.
- Der aktive Eintrag erhält Akzentlinie, kontrastreiche Fläche und kräftige Beschriftung.
- Kleine Statuspunkte können später anzeigen: Daten vorhanden, unvollständig, Warnung oder nicht verfügbar.
- Ein Haken sollte nur verwendet werden, wenn „abgeschlossen“ fachlich wirklich definiert ist. Sonst wäre die Prozessanzeige irreführend.
- Rollen- oder lizenzbedingt nicht verfügbare Punkte werden vollständig entfernt; fachlich noch nicht mögliche Schritte bleiben sichtbar, aber deaktiviert und erklären den Grund.
- Auf schmaleren Breiten scrollt nur der Prozessbereich. Der Projektblock bleibt stehen, der aktive Schritt wird automatisch sichtbar zentriert und eine Randblende zeigt weitere Inhalte an.

### Darstellungsmodi

- Ab etwa 1440 px: Icon und Text für alle erreichbaren Schritte.
- Mittlere Desktop-/Tabletbreite: kompaktere Abstände, horizontaler Scrollbereich mit sichtbaren Scrollhinweisen.
- Dichte Editoren: gleiche Leiste, geringfügig reduzierte Höhe; kein abweichendes Navigationsmodell.
- Telefon: Projektinformationen und nicht-dichte Projektseiten bleiben erreichbar. CAD-, Aufmaß-, Nesting- und CNC-Arbeitsflächen können wie bisher einen klaren Tablet-/Desktop-Hinweis zeigen.

## Einordnung der angekündigten Funktionen

Dieser Abschnitt beschreibt nur die spätere Platzierung im UI, nicht die Umsetzung der Funktionen.

### Variablenansicht

Die Variablenansicht ist ein eigener Prozessschritt zwischen Konstruktion und Stückliste, wenn ihre Daten nachgelagerte Fertigungsdaten beeinflussen. Ihr Inhalt sollte wie ein fachliches Datenblatt wirken:

- Variable und lesbarer Anzeigename
- aktueller Wert und Einheit
- Quelle, zum Beispiel Aufmaß, Projekt oder Konstruktion
- Verwendung in Korpussen, Teilen oder Bearbeitungen
- Validierungsstatus und verständliche Fehlermeldung

Die Ansicht sollte keine weitere obere Tabzeile erhalten. Filter und Ansichtsoptionen gehören in eine lokale Werkzeugzeile oberhalb der Tabelle.

### CNC, CAM, Postprozessor und Maschine

Diese Funktionen sollten in der Project Bar **ein** Ziel `CNC/CAM` bleiben. Innerhalb der Arbeitsfläche entsteht ein fachlicher Übergabeprozess, beispielsweise:

```text
Bauteile/Programme          Vorschau und Simulation           Eigenschaften/Ausgabe
┌──────────────────┐       ┌──────────────────────────┐       ┌──────────────────────┐
│ Gruppen          │       │                          │       │ Operationen           │
│ Programme        │       │      Werkstück           │       │ Prüfung               │
│ Warnungen        │       │      + Bearbeitung       │       │ Postprozessor         │
│                  │       │                          │       │ Zielmaschine          │
└──────────────────┘       └──────────────────────────┘       └──────────────────────┘
                                                               [Programm ausgeben]
```

Postprozessor und Maschinenanbindung werden also als Eigenschaften und Übergabeaktion des CNC/CAM-Ergebnisses sichtbar. Sie werden weder zu globalen Modulen noch zu weiteren Project-Bar-Icons. Eine kompakte Prüfkette im rechten Bereich kann „Bearbeitungen → Simulation → Ausgabe → Maschine“ zeigen, ohne eine zweite Top-Navigation einzuführen.

### Weitere Mitarbeiteransichten

Der globale Eintrag sollte mittelfristig `Team & Zeit` statt nur `Mitarbeiter` heißen. Darunter öffnet sich eine gemeinsame Arbeitsfläche mit einer **seitlichen** Bereichsauswahl:

```text
┌───────────────────────┬────────────────────────────────────────────────────────────┐
│ Team & Zeit           │ Mitarbeiter                                               │
│                       │ Suche, Statusfilter                         + Mitarbeiter  │
│ Meine Arbeitszeit     │                                                            │
│ Teamkalender          │ Name        Rolle       Arbeitszeitmodell      Status      │
│ Mitarbeiter           │ …                                                           │
│ Abwesenheiten         │                                                            │
└───────────────────────┴────────────────────────────────────────────────────────────┘
```

Damit wächst die globale Sidebar nicht mit jeder Mitarbeiterfunktion. Die seitliche Auswahl ist im Inhalt verankert und liegt nicht als Unterordnerzeile über der Seite.

## Entwurf wichtiger Seiten

### Arbeitsübersicht

Die leere Startseite sollte zu einer ruhigen Arbeitsübersicht werden, nicht zu einem Management-Dashboard mit beliebigen Diagrammen.

Empfohlene Inhalte:

- zuletzt geöffnete Projekte
- heutige Termine und eigene Zeiteinträge
- Projekte mit konkretem Handlungsbedarf
- Offline-/Synchronisationszustand nur bei Relevanz
- eine klare Aktion „Projekt öffnen“ oder „Neues Projekt“ abhängig von der Rolle

Maximal drei bis vier Inhaltsbereiche reichen. Alles Weitere gehört in die jeweiligen Fachseiten.

### Projektliste

```text
Projekte                                      [Importieren]  [+ Neues Projekt]
Aktive und geplante Aufträge

[Suchen …________________] [Status ▾] [Verantwortlich ▾] [Sortierung ▾]

24-031  Küche Müller       Müller     12.11.2026    Hoch     In Arbeit      ›
24-028  Empfangstheke      Bauer      05.11.2026    Normal   Fertigung      ›
```

Verbesserungen gegenüber dem Ist-Stand:

- einheitlich deutsche Beschriftung
- Seitentitel und kurze Einordnung
- ein klarer primärer Button, Import als sekundäre Aktion
- Suche und wenige relevante Filter
- Projektkennung und Titel als stärkste Information
- Status als semantischer Chip, Priorität nicht nur als Rohtext
- sichtbarer Öffnen-Indikator statt ausschließlich unsichtbarer klickbarer Tabellenzeile
- definierte Lade-, Leer- und Fehlerzustände

Eine gut gestaltete Liste ist hier passender als eine großflächige Kartenansicht, weil viele Projekte schnell verglichen werden sollen.

### Projektstartseite

Die Startseite eines Projekts wird zur kompakten Projektzentrale. Sie dupliziert die Navigation nicht.

Empfohlene Reihenfolge:

1. Kurzstatus mit Kunde, Termin, Verantwortlichem, Priorität und Projektstatus
2. „Als Nächstes“-Hinweis oder offene fachliche Warnungen
3. kompakter Datenstatus der Prozessschritte
4. Beschreibung und Bilder
5. zuletzt geänderte oder wichtige Dokumente

```text
┌ Status ─────────────────────────┐  ┌ Nächster sinnvoller Schritt ────────────────┐
│ In Arbeit · Priorität hoch      │  │ Variablen prüfen                            │
│ Lieferung 12.11.2026            │  │ 3 Werte fehlen für die Stückliste           │
└─────────────────────────────────┘  └──────────────────────────────────────────────┘

Beschreibung
…

Bilder und Unterlagen
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│              │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

Die Seite bleibt bildorientiert, beantwortet aber zusätzlich den aktuellen Projektzustand.

### Dichte Editoren

Für Aufmaß, Konstruktion, Nesting, Zuschnitt und CNC gelten gemeinsame Regeln:

- Project Bar bleibt unverändert an derselben Position.
- Darunter folgt höchstens **eine** lokale Werkzeugzeile für Aktionen und Ansichtsmodi.
- Links: Auswahl oder Objektstruktur.
- Mitte: größtmögliche Zeichen-/Arbeitsfläche.
- Rechts: Eigenschaften und kontextbezogene Aktionen.
- Panels sind größenstabil, aber bei Bedarf einklappbar.
- Speichern, Export und Freigabe erscheinen an konsistenten Positionen.
- Vollbild/Fokusmodus liegt in der lokalen Werkzeugzeile.
- Warnungen stehen bei dem Element, das sie verursacht, nicht nur als globale Meldung.

### Einstellungen und Management-Einrichtung

Zwölf horizontale Settings-Tabs skalieren nicht gut. Einstellungen sind kein Prozess und sollten als durchsuchbarer, vertikaler Bereichsindex gestaltet werden:

```text
Firmeneinstellungen
┌──────────────────────────┬─────────────────────────────────────────────────────────┐
│ Einstellungen suchen …  │ CNC                                                     │
│                          │ Standardwerte und maschinenspezifische Vorgaben          │
│ Unternehmen              │                                                         │
│ Kalkulation              │ [Inhalt des gewählten Bereichs]                         │
│ Programme                │                                                         │
│ Benutzeroberfläche       │                                                         │
│ Benutzer                 │                                                         │
│ Projekte                 │                                                         │
│ CNC                      │                                                         │
│ Storage & Cache          │                                                         │
└──────────────────────────┴─────────────────────────────────────────────────────────┘
```

Verwandte technische Punkte wie Storage und Cache können unter einer sichtbaren Gruppenüberschrift stehen, bleiben aber direkt auswählbar. Es gibt keine aufklappbaren Ordnerpflicht.

Die Management-Einrichtung ist dagegen wirklich sequenziell. Dort eignet sich ein vertikaler nummerierter Schrittanzeiger links neben dem Formular. Die operative Jahresansicht erhält nur wenige direkte Bereiche im Inhaltskopf oder ebenfalls in einer schmalen Seitenauswahl.

## Visuelles System

### Charakter

Der Stil sollte „präzises Werkstattwerkzeug“ vermitteln:

- ruhige, matte Flächen statt vieler starker Kartenrahmen
- klare Ausrichtung und großzügige, aber nicht verschwenderische Abstände
- fachliche Daten im Vordergrund
- Akzentfarbe nur für Auswahl, Primäraktion und Fokus
- Statusfarben ausschließlich für Bedeutung

### Farbe

Die vorhandene Light-Mode-Palette aus warmem Off-White, dunklem Ink/Graphit und Kupfer kann zur Markenbasis werden. Für Dark Mode sollte dieselbe Identität gelten, statt standardmäßigem Blau und generischem Tailwind-Grau zwei getrennte Erscheinungsbilder zu erzeugen.

Empfohlene Rollen, nicht zwingend endgültige Farbwerte:

| Rolle | Verwendung |
|---|---|
| Canvas | Seitenhintergrund |
| Surface | Panels, Tabellen, Navigation |
| Surface raised | Hover, Auswahlumgebung, Dialoge |
| Border subtle | Struktur ohne starke Kästen |
| Text primary/secondary/muted | feste Informationshierarchie |
| Brand accent | aktive Navigation, Primäraktion, Fokus |
| Success/Warning/Danger/Info | ausschließlich fachliche Zustände |

CNC-Bemaßungs- und Werkzeugfarben müssen von der allgemeinen UI-Akzentfarbe unterscheidbar bleiben. Vor der finalen Farbfestlegung sollte deshalb die Editorpalette mitgeprüft werden.

### Typografie und Abstände

- Systemschrift oder eine sachliche Grotesk; keine dekorative Hausschrift notwendig.
- Seite: 24–30 px Titel, 14–16 px Beschreibung.
- Panel: 16–18 px Titel.
- Daten und Formulare: 14 px Desktop, mindestens 16 px Eingaben auf Telefonen.
- Ein durchgehendes 4-/8-px-Abstandssystem reduziert die aktuell unterschiedlichen Innenabstände.
- Großbuchstaben nur sparsam für kleine Bereichskennzeichnungen, nicht für vollständige Tabellenüberschriften.

### Komponenten mit hoher Hebelwirkung

Ein einheitliches Erscheinungsbild entsteht vor allem durch wenige gemeinsame Bausteine:

- `AppShell` für globale Navigation und Hauptbereich
- `ProjectShell` für Projektkontext, Prozessleiste und Arbeitsfläche
- `PageHeader` für Titel, Beschreibung und Aktionen
- `WorkspaceToolbar` für Editoraktionen
- `SectionNav` für Einstellungen, Team und nichtlineare Bereiche
- `DataTable` mit Lade-, Leer- und Fehlerzustand
- `StatusBadge`, `InlineNotice` und `EmptyState`

Diese Namen beschreiben den Entwurf; sie sind keine Aufforderung, die Komponenten jetzt zu implementieren.

## Interaktionsregeln

1. **Klartext vor Symbolrätsel:** Icon und Text gemeinsam, außer bei allgemein verständlichen lokalen Werkzeugaktionen.
2. **Ein primäres Ziel pro Ansicht:** Weitere Aktionen sind sekundär oder kontextbezogen.
3. **Kontext bleibt sichtbar:** Projekt, Kunde und aktueller Arbeitsschritt verschwinden beim Scrollen nicht.
4. **Kein Hover als Voraussetzung:** Alle wesentlichen Informationen funktionieren auf Touch und per Tastatur.
5. **Fachstatus statt Dekoration:** Farben und Badges sagen etwas Konkretes aus.
6. **Keine Navigation im Inhalt duplizieren:** Project Bar, Seitenauswahl und Buttons erfüllen unterschiedliche Aufgaben.
7. **Direkter Zugriff bleibt erhalten:** Gruppierung bedeutet visuelle Ordnung, nicht zusätzliche Klicks.
8. **Fehler dort erklären, wo sie entstehen:** mit Ursache und möglicher Korrektur.
9. **Ansichten erinnern sich sinnvoll:** Sidebarbreite, zuletzt verwendete Filter und Panelgrößen können lokal erhalten bleiben.
10. **Tastaturfokus ist sichtbar:** besonders in Tabellen, Prozessleiste und Editoren.

## Priorisierte Empfehlung

### Stufe A – größte Wirkung ohne grundlegenden Umbau

1. Project Bar beschriften und aktiven Zustand verstärken.
2. Projektname, Kunde und Zurück-Navigation direkt in die Project Bar integrieren.
3. Prozessschritte und Supportbereiche in eine fachlich klare Reihenfolge bringen.
4. Globale Sidebar beschriftet starten lassen, Ziele gruppieren und Utilities absetzen.
5. Sprache und Seitentitel vereinheitlichen, beginnend mit Projektliste und Projektstartseite.
6. Einheitliche `PageHeader`-, Meldungs- und Leerzustandsmuster festlegen.

### Stufe B – skalierbare Flächen

1. Gemeinsame App-/Project-Shell verwenden, damit Abstände und Scrollverhalten identisch werden.
2. Firmeneinstellungen von horizontalen Tabs auf eine inhaltliche Seitenauswahl umstellen.
3. `Team & Zeit` als gemeinsamen Bereich für aktuelle und künftige Mitarbeiteransichten strukturieren.
4. Projektstartseite um Status, nächste Aufgabe und Datenvollständigkeit erweitern.
5. Leere Arbeitsübersicht durch wenige handlungsorientierte Inhalte ersetzen.

### Stufe C – fachliche Zustände und Feinschliff

1. Daten-/Warnstatus an Prozessschritten anzeigen.
2. CNC/CAM-Übergabe bis Postprozessor und Maschine innerhalb einer gemeinsamen Arbeitsfläche visualisieren.
3. Responsive Scrollhinweise, Fokusmodus und gespeicherte Panelzustände ergänzen.
4. Dark- und Light-Mode farblich auf eine gemeinsame Markenidentität ausrichten.
5. Tastaturbedienung, Kontrast und Touch-Ziele systematisch prüfen.

## Bewusste Nicht-Empfehlungen

- keine globale Top Bar mit Modulen und darunterliegenden Unterordnern
- keine Mega-Menüs
- keine Kachelstartseite für jede einzelne Funktion
- keine separate globale Navigation für CNC, CAM, Postprozessor und Maschinen
- keine weitere Project-Bar-Zeile für Unterfunktionen
- keine rein iconbasierte Navigation als Standard
- kein Komplettumbau der dichten Editoren, solange ihre fachliche Anordnung funktioniert
- keine Prozesssperren, die Benutzer zwingen, jeden Schritt linear abzuschließen

## Entscheidungsvorschlag

Als Zielrichtung empfehle ich eine **Evolution des bestehenden Layouts**:

> CarpentersProduction bleibt eine projektzentrierte, durchgehende Arbeitsumgebung. Die Project Bar wird zur klar beschrifteten Prozessleiste, die globale Sidebar bleibt flach, und nichtlineare Verwaltungsbereiche werden seitlich im Inhalt geordnet. Neue Funktionen erweitern fachliche Arbeitsbereiche, nicht die Zahl der Navigationsebenen.

Damit bleibt das heute bereits gute Bediengefühl erhalten, während die Oberfläche auch mit Variablenansicht, CNC/CAM-Ausgabe, Maschinenanbindung und zusätzlichen Mitarbeiterfunktionen übersichtlich wachsen kann.
