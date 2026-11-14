const firstProjectRoute = () => {
  if (/^\/Projects\/(?!Create(?:\/|$))/.test(window.location.pathname)) return window.location.pathname;
  return document.querySelector("[data-tour-project-route]")?.dataset.tourProjectRoute || null;
};

const firstContactRoute = () => {
  const path = window.location.pathname;
  if (/^\/Kontakte\/info\/[^/]+/.test(path)) return path.replace(/\/crm$/, "");
  return document.querySelector("[data-tour-contact-route]")?.dataset.tourContactRoute || null;
};

const contactCrmRoute = () => {
  const path = window.location.pathname;
  if (/^\/Kontakte\/info\/[^/]+\/crm$/.test(path)) return path;
  if (/^\/Kontakte\/info\/[^/]+$/.test(path)) return `${path}/crm`;
  return document.querySelector("[data-tour-contact-crm-route]")?.dataset.tourContactCrmRoute || null;
};

const systemSteps = [
  { id: "navigation", route: "/", target: '[data-tour="global-sidebar"]', placement: "right", title: "Die zentrale Navigation", text: "Von hier erreichst du alle freigeschalteten Arbeitsbereiche. Die Navigation bleibt in jeder Ansicht an derselben Stelle." },
  { id: "management-nav", route: "/Management", target: '[data-tour="management-nav"]', title: "Management steuern", text: "Wechsle zwischen Auslastung, Projektboard, Zeitplanung, Jahreszielen und Stundensätzen.", requiredFeature: "business-management", requiredRole: "admin" },
  { id: "management-work", route: "/Management", target: '[data-tour="management-assignment"]', title: "Aufträge und Personal verbinden", text: "Ordne Projekte Mitarbeitenden zu und übergib geplante Zeiträume direkt an den Kalender.", requiredFeature: "business-management", requiredRole: "admin" },
  { id: "management-board", route: "/Management/Board", target: '[data-tour="management-board"]', title: "Projektstatus organisieren", text: "Das Board bildet deinen betrieblichen Ablauf ab. Projekte können per Drag-and-drop oder mit den Pfeilen verschoben werden.", requiredFeature: "business-management", requiredRole: "admin" },
  { id: "management-timeline", route: "/Management/Timeline", target: '[data-tour="management-timeline"]', title: "Projektzeiträume planen", text: "Plane Arbeitsschritte als Zeitbalken und übertrage bestätigte Projektzeiträume in den Kalender.", requiredFeature: "business-management", requiredRole: "admin" },
  { id: "management-goals", route: "/Management/Goals", target: '[data-tour="management-goals"]', title: "Jahresziele verfolgen", text: "Sollwerte, Zwischenstände und der spätere Istwert machen die Unternehmensziele messbar.", requiredFeature: "business-management", requiredRole: "admin" },
  { id: "management-rates", route: "/Management/Rates", target: '[data-tour="management-rates"]', title: "Stundensätze nachvollziehbar kalkulieren", text: "Gemeinkosten, produktive Stunden, Personal- und Maschinenkosten ergeben die Sätze für deine Projektkalkulation.", requiredFeature: "business-management", requiredRole: "admin" },
  { id: "projects-actions", route: "/Projects", target: '[data-tour="projects-actions"]', title: "Projekte anlegen oder übernehmen", text: "Neue Projekte startest du im Schrankkonfigurator; vorhandene Projektdaten können importiert werden.", requiredFeature: "work-preparation" },
  { id: "projects-list", route: "/Projects", target: '[data-tour="projects-list"]', title: "Alle Projekte im Blick", text: "Öffne ein Projekt, um Aufmaß, Konstruktion, Stückliste, CNC, Einkauf, Kalkulation und Dokumente gemeinsam zu bearbeiten.", requiredFeature: "work-preparation" },
  { id: "project-workspace", route: firstProjectRoute, target: '[data-tour="project-bar"]', skipTo: ["documents-tabs", "contacts-search", "shop-tabs", "employees-calendar"], title: "Projektarbeitsplatz", text: "Der Rundgang öffnet das erste vorhandene Projekt. Diese Leiste verbindet sämtliche projektbezogenen Unteransichten.", requiredFeature: "work-preparation" },
  { id: "project-measurement", target: '[data-tour="project-nav-measurement"]', title: "Aufmaß", text: "Erfasse Maße, Skizzen, Fotos und 3D-Daten direkt beim Projekt.", requiredFeature: "work-preparation" },
  { id: "project-construction", target: '[data-tour="project-nav-cabinet"]', title: "Konstruktion", text: "Im Schrankkonfigurator entstehen Korpusse, Fronten, Beschläge und CNC-relevante Daten.", requiredFeature: "work-preparation" },
  { id: "project-production", target: '[data-tour="project-nav-parts"]', title: "Stückliste und Fertigung", text: "Stückliste, Nesting, Zuschnitt und CNC bauen auf denselben Projektdaten auf.", requiredFeature: "work-preparation" },
  { id: "project-time", target: '[data-tour="project-nav-time"]', title: "Projektzeiten", text: "Arbeitszeiten werden Tätigkeiten und diesem Projekt zugeordnet.", requiredFeature: "work-preparation" },
  { id: "project-purchasing", target: '[data-tour="project-nav-purchasing"]', title: "Projekteinkauf", text: "Sammle benötigte Artikel und gib sie an den zentralen Einkauf weiter.", requiredFeature: "shop" },
  { id: "project-calculation", target: '[data-tour="project-nav-calculation"]', title: "Projektkalkulation", text: "Material, Tätigkeiten und die Management-Stundensätze fließen hier zusammen.", requiredFeature: "calculation" },
  { id: "project-files", target: '[data-tour="project-nav-attachments"]', title: "Fertigungsunterlagen", text: "Anhänge und Fertigungspläne bleiben direkt am Projekt verfügbar.", requiredFeature: "work-preparation" },
  { id: "documents-tabs", route: "/Documents", target: '[data-tour="documents-tabs"]', title: "Dokumente aus allen Quellen", text: "Der Eingang, die Paperless-Bibliothek und die Carpenters-Dateien bilden einen gemeinsamen Dokumentarbeitsplatz.", requiredFeature: "business-management", requiredRole: "admin" },
  { id: "documents-inbox", route: "/Documents", target: '[data-tour="documents-inbox"]', title: "Belege prüfen und zuordnen", text: "Neue Dokumente lassen sich ansehen, einem Projekt oder Kunden zuordnen und an einen Bearbeiter übergeben.", requiredFeature: "business-management", requiredRole: "admin" },
  { id: "documents-actions", target: '[data-tour="documents-inbox-actions"]', title: "Dokumente übernehmen", text: "Belege können hochgeladen und Paperless-Daten manuell synchronisiert werden.", requiredFeature: "business-management", requiredRole: "admin" },
  { id: "documents-library", target: '[data-tour="documents-tabs"]', title: "Paperless durchsuchen", text: "Nach der Verbindung erscheint hier die Paperless-Bibliothek. Vorhandene Dokumente können dann gesucht und mit Carpenters verknüpft werden.", requiredFeature: "business-management", requiredRole: "admin" },
  { id: "documents-local", activate: '[data-tour="documents-tab-local"]', target: '[data-tour="documents-local"]', title: "Carpenters-Dateien", text: "Aufmaß-Scans, Firmenordner und Garage-Dateien bleiben auch ohne Paperless erreichbar.", requiredFeature: "business-management", requiredRole: "admin" },
  { id: "contacts-search", route: "/Kontakte", target: '[data-tour="contacts-search"]', title: "Kontakte schnell finden", text: "Suche nach Namen oder Firma und lege neue Kunden direkt aus der Übersicht an.", requiredFeature: "crm", requiredRole: "admin" },
  { id: "contacts-list", route: "/Kontakte", target: '[data-tour="contacts-list"]', title: "Kundenstamm und CRM", text: "Ein Klick öffnet Stammdaten, Projekte, Dokumente und den vollständigen Kontaktverlauf.", requiredFeature: "crm", requiredRole: "admin" },
  { id: "contact-details", route: firstContactRoute, target: '[data-tour="contact-detail-actions"]', skipTo: ["shop-tabs", "employees-calendar"], title: "Kundendetails und Aktionen", text: "Beim ersten vorhandenen Kontakt erreichst du CRM, Bearbeitung, Projektimport und ein neues Kundenprojekt.", requiredFeature: "crm", requiredRole: "admin" },
  { id: "contact-data", target: '[data-tour="contact-detail-data"]', title: "Stammdaten und Dokumente", text: "Kontaktwege, Adressen und verknüpfte Paperless-Dokumente stehen gemeinsam bereit.", requiredFeature: "crm", requiredRole: "admin" },
  { id: "contact-crm", route: contactCrmRoute, target: '[data-tour="contact-crm-actions"]', title: "CRM-Aktionen", text: "Erfasse Kommunikation und Termine oder bearbeite die Stammdaten.", requiredFeature: "crm", requiredRole: "admin" },
  { id: "contact-history", target: '[data-tour="contact-crm-history"]', title: "Kontaktverlauf", text: "Telefonate, E-Mails, Schriftverkehr und Notizen erscheinen chronologisch.", requiredFeature: "crm", requiredRole: "admin" },
  { id: "shop-tabs", route: "/Purchasing", target: '[data-tour="shop-tabs"]', title: "Der zentrale Einkauf", text: "Freigaben, interner Shop, Lieferantenkatalog, Bestellhistorie, Listen und Archiv sind hier zusammengeführt.", requiredFeature: "shop" },
  { id: "shop-releases", route: "/Purchasing", target: '[data-tour="shop-released-actions"]', title: "Freigaben gesammelt bearbeiten", text: "Markiere mehrere Positionen und lehne sie gesammelt ab oder kennzeichne sie als gekauft.", requiredFeature: "shop" },
  { id: "shop-internal", activate: '[data-tour="shop-tab-shop"]', target: '[data-tour="shop-controls"]', title: "Interner Shop", text: "Suche Artikel, wähle ein Zielprojekt und pflege Shop-Gruppen im Editiermodus.", requiredFeature: "shop" },
  { id: "shop-catalog", activate: '[data-tour="shop-tab-catalog"]', target: '[data-tour="shop-catalog-controls"]', title: "Lieferantenkatalog", text: "Artikelnummern, Bezeichnungen und Lieferanten lassen sich zentral pflegen.", requiredFeature: "shop" },
  { id: "shop-history", activate: '[data-tour="shop-tab-purchased"]', target: '[data-tour="shop-purchased"]', title: "Einkaufsverlauf", text: "Gekaufte Positionen bleiben nach Lieferant und Projekt nachvollziehbar.", requiredFeature: "shop" },
  { id: "shop-lists", activate: '[data-tour="shop-tab-lists"]', target: '[data-tour="shop-lists-controls"]', title: "Wiederkehrende Bestelllisten", text: "Verbrauchsmaterial wird in Listen vorbereitet und ohne Projekt gesammelt freigegeben.", requiredFeature: "shop" },
  { id: "shop-archive", activate: '[data-tour="shop-tab-archive"]', target: '[data-tour="shop-archive-controls"]', title: "Lieferantenvarianten", text: "Alternative und frühere Lieferantenvarianten bleiben im Archiv erhalten.", requiredFeature: "shop" },
  { id: "employees-calendar", route: "/Mitarbeiter", target: '[data-tour="employee-calendar"]', title: "Arbeitszeit im Wochenkalender", text: "Erfasse und bearbeite Arbeitsblöcke direkt in der Kalenderwoche.", requiredFeature: "work-preparation" },
  { id: "employees-week", target: '[data-tour="employee-week-controls"]', title: "Kalenderwochen wechseln", text: "Blättere durch die Wochen; Arbeits- und Pausenzeiten stammen aus den Firmeneinstellungen.", requiredFeature: "work-preparation" },
  { id: "employees-open", route: "/Mitarbeiter", target: '[data-tour="employee-open-times"]', title: "Offene Zeiten zuordnen", text: "Wähle einen offenen Zeiteintrag und anschließend den passenden freien Kalenderbereich.", requiredFeature: "work-preparation" }
];

export const GUIDED_TOURS = [
  {
    id: "system-overview",
    label: "Kompletter Systemrundgang",
    description: "Management, Projekte, Dokumente, Kontakte, Shop und Mitarbeiter",
    match: () => true,
    steps: systemSteps
  },
  {
    id: "management",
    label: "Management erklären",
    description: "Auslastung, Board, Zeitplan, Ziele und Stundensätze",
    requiredFeature: "business-management",
    requiredRole: "admin",
    match: pathname => pathname.startsWith("/Management"),
    steps: [
      { id: "nav", route: "/Management", target: '[data-tour="management-nav"]', title: "Managementbereiche", text: "Diese Leiste verbindet die operativen Managementansichten." },
      { id: "metrics", route: "/Management", target: '[data-tour="management-metrics"]', title: "Kapazität auf einen Blick", text: "Die Kennzahlen zeigen aktive Mitarbeitende, laufende Zuweisungen und noch ungeplante Projekte." },
      { id: "assignment", route: "/Management", target: '[data-tour="management-assignment"]', title: "Aufträge zuweisen", text: "Verknüpfe Mitarbeitende und Projekte und dokumentiere Übergaben oder erledigte Arbeiten." },
      { id: "employees", route: "/Management", target: '[data-tour="management-employees"]', title: "Personalbasis", text: "Urlaubsanspruch und Jahresgehalt bilden die Grundlage für Kapazität und Stundensatzkalkulation." },
      { id: "board", route: "/Management/Board", target: '[data-tour="management-board"]', title: "Projektstatus als Board", text: "Ziehe Projekte durch die konfigurierten Prozessspalten oder nutze die Pfeiltasten." },
      { id: "timeline", route: "/Management/Timeline", target: '[data-tour="management-timeline"]', title: "Projektzeiträume planen", text: "Lege Phasen und Balken an und übertrage bestätigte Zeiträume in den Kalender." },
      { id: "goals", route: "/Management/Goals", target: '[data-tour="management-goals"]', title: "Jahresziele verfolgen", text: "Definiere Sollwerte, dokumentiere Zwischenstände und schließe das Jahr mit dem Istwert ab." },
      { id: "rates", route: "/Management/Rates", target: '[data-tour="management-rates"]', title: "Stundensätze kalkulieren", text: "Gemeinkosten, produktive Kapazität, Personal- und Maschinenkosten ergeben nachvollziehbare Selbstkostensätze." }
    ]
  },
  {
    id: "projects",
    label: "Projektübersicht erklären",
    description: "Anlegen, importieren und Projekte öffnen",
    requiredFeature: "work-preparation",
    match: pathname => pathname === "/Projects",
    steps: [
      { id: "actions", target: '[data-tour="projects-actions"]', title: "Projektstart", text: "Lege ein Projekt neu an oder importiere vorhandene Carpenters-Projektdaten." },
      { id: "list", target: '[data-tour="projects-list"]', title: "Projektliste", text: "Die Liste zeigt Kunde, Start, Priorität und Status. Ein Klick öffnet den Projektarbeitsplatz." }
    ]
  },
  {
    id: "project-workflow",
    label: "Projektfunktionen erklären",
    description: "Alle Unteransichten eines geöffneten Projekts",
    requiredFeature: "work-preparation",
    match: pathname => /^\/Projects\/(?!Create(?:\/|$))/.test(pathname),
    steps: [
      { id: "bar", target: '[data-tour="project-bar"]', title: "Der Projektarbeitsplatz", text: "Alle folgenden Ansichten arbeiten mit demselben Projekt und sind jederzeit über diese Leiste erreichbar." },
      { id: "overview", target: '[data-tour="project-nav-overview"]', title: "Projektübersicht", text: "Kundenzuordnung, Beschreibung, Bilder und Projektdruck." },
      { id: "measurement", target: '[data-tour="project-nav-measurement"]', title: "Aufmaß", text: "Maße, Skizzen, Bilder und 3D-Aufmaß direkt auf der Baustelle erfassen." },
      { id: "cabinet", target: '[data-tour="project-nav-cabinet"]', title: "Schrankkonfigurator", text: "Korpusse, Fronten, Beschläge und CNC-relevante Konstruktion bearbeiten." },
      { id: "parts", target: '[data-tour="project-nav-parts"]', title: "Stückliste", text: "Bauteile prüfen, gruppieren und für Fertigung oder PDF-Ausgabe vorbereiten." },
      { id: "nesting", target: '[data-tour="project-nav-nesting"]', title: "Nesting", text: "Plattenbelegung optimieren und Materialverbrauch kontrollieren." },
      { id: "cut", target: '[data-tour="project-nav-cut"]', title: "Zuschnitt", text: "Zuschnittreihenfolge und fertigungsgerechte Plattenbearbeitung vorbereiten." },
      { id: "cnc", target: '[data-tour="project-nav-cnc"]', title: "CNC", text: "Bearbeitungen kontrollieren, Werkzeugwege prüfen und Maschinendaten für die Fertigung erzeugen." },
      { id: "time", target: '[data-tour="project-nav-time"]', title: "Zeiterfassung", text: "Arbeitszeiten und Tätigkeiten direkt dem Projekt zuordnen." },
      { id: "purchasing", target: '[data-tour="project-nav-purchasing"]', title: "Projekteinkauf", text: "Artikel sammeln und zur zentralen Beschaffung freigeben." },
      { id: "calculation", target: '[data-tour="project-nav-calculation"]', title: "Kalkulation", text: "Material, Tätigkeiten und hinterlegte Stundensätze zur Projektkalkulation verbinden." },
      { id: "attachments", target: '[data-tour="project-nav-attachments"]', title: "Anhänge", text: "Fertigungsunterlagen, Dokumente und weitere Projektdateien verwalten." },
      { id: "settings", target: '[data-tour="project-nav-settings"]', title: "Projekteinstellungen", text: "Status, Stammdaten und projektspezifische Einstellungen pflegen." }
    ]
  },
  {
    id: "project-home-functions",
    label: "Projektübersicht bedienen",
    description: "Kunde, Projektinhalt, Bilder und PDF-Ausgabe",
    requiredFeature: "work-preparation",
    match: pathname => /^\/Projects\/(?!Create$)[^/]+$/.test(pathname),
    steps: [
      { id: "summary", target: '[data-tour="project-home-summary"]', title: "Projektkopf", text: "Hier siehst du den zugeordneten Kunden und erreichst die Ausgabe des gesamten Projekts." },
      { id: "print", target: '[data-tour="project-home-print"]', title: "Projekt als PDF ausgeben", text: "Erzeuge eine kompakte Projekt-PDF mit den verfügbaren Projektinformationen und Bildern." },
      { id: "content", target: '[data-tour="project-home-content"]', title: "Beschreibung und Projektbilder", text: "Die Beschreibung hält den Auftrag fest; die Galerie zeigt die allgemeinen Projektdateien und Referenzbilder." }
    ]
  },
  {
    id: "project-measurement-functions",
    label: "Aufmaß bedienen",
    description: "Zeichenfläche, Eigenschaften, Ansichten und Abschluss",
    requiredFeature: "work-preparation",
    match: pathname => /^\/Projects\/Aufmas\/[^/]+$/.test(pathname),
    steps: [
      { id: "status", target: '[data-tour="project-measurement-status"]', title: "Aufmaß prüfen und abschließen", text: "Prüfe erkannte OCR-Daten, kontrolliere den Speicherstatus und sperre das fertige Aufmaß mit „Aufmaß abschließen“ gegen unbeabsichtigte Änderungen." },
      { id: "canvas", target: '[data-tour="project-measurement-canvas"]', title: "Aufmaß zeichnen und importieren", text: "In der Arbeitsfläche zeichnest und bemaßt du Räume, importierst PDF oder DXF und wechselst je nach Ansicht zu Fotos oder 3D-Daten." },
      { id: "properties", target: '[data-tour="project-measurement-properties"]', title: "Objekte und Fortschritt bearbeiten", text: "Bearbeite das ausgewählte Objekt, verknüpfe Schränke und Fotos und dokumentiere offene Punkte in der Fortschrittsliste." },
      { id: "views", target: '[data-tour="project-measurement-views"]', title: "Aufmaßansichten wechseln", text: "Wechsle zwischen Grundrissen, Detailansichten, Bildern und 3D-Ansicht, ohne das aktuelle Aufmaß zu verlassen." }
    ]
  },
  {
    id: "project-cabinet-functions",
    label: "Schrankkonfigurator bedienen",
    description: "Korpusse, Ansichten, Konstruktion und Eigenschaften",
    requiredFeature: "work-preparation",
    match: pathname => /^\/Projects\/Cabinet\/[^/]+$/.test(pathname),
    steps: [
      { id: "list", target: '[data-tour="project-cabinet-list"]', title: "Korpusse verwalten", text: "Lege Korpusse an, dupliziere oder lösche sie, passe Anzahl und Grundmaße an und wähle den aktuell bearbeiteten Korpus." },
      { id: "toolbar", target: '[data-tour="project-cabinet-toolbar"]', title: "Ansicht und Presets", text: "Wechsle zwischen Front- und kombinierter Ansicht, erzeuge Bereiche aus Fronten und füge wiederverwendbare Korpus- oder Funktionspresets ein." },
      { id: "viewport", target: '[data-tour="project-cabinet-viewport"]', title: "Konstruktion auswählen", text: "Die Konstruktionsansicht zeigt den aktiven Korpus. Wähle Fronten, Bereiche und Einbauten direkt an, um sie rechts zu bearbeiten." },
      { id: "properties", target: '[data-tour="project-cabinet-properties"]', title: "Eigenschaften und Funktionen", text: "Passe Maße, Materialien, Aufteilungen, Fronten, Beschläge und CNC-Funktionen des ausgewählten Elements an." }
    ]
  },
  {
    id: "project-parts-functions",
    label: "Stückliste bedienen",
    description: "Bauteile prüfen, aktualisieren und ausgeben",
    requiredFeature: "work-preparation",
    match: pathname => /^\/Projects\/List\/[^/]+$/.test(pathname),
    steps: [
      { id: "list", target: '[data-tour="project-parts-list"]', title: "Bauteile kontrollieren", text: "Prüfe je Korpus alle erzeugten Bauteile einschließlich Material, Fertigmaßen, Stärke und Menge." },
      { id: "actions", target: '[data-tour="project-parts-actions"]', title: "Stückliste weiterverarbeiten", text: "Gib die Liste als PDF aus, öffne sie zur konstruktiven Bearbeitung oder aktualisiere sie aus den aktuellen Korpusdaten." },
      { id: "sidebar", target: '[data-tour="project-parts-sidebar"]', title: "Fertigungsnotizen", text: "Nutze den rechten Bereich für Aktionen und projektspezifische Hinweise, die bei der weiteren Fertigung berücksichtigt werden sollen." }
    ]
  },
  {
    id: "project-nesting-functions",
    label: "Nesting bedienen",
    description: "Plattenbelegung, Restpool, Ausrichtung und Speichern",
    requiredFeature: "work-preparation",
    match: pathname => /^\/Projects\/Nesting\/[^/]+$/.test(pathname),
    steps: [
      { id: "sheets", target: '[data-tour="project-nesting-sheets"]', title: "Hauptplatte wählen", text: "Wechsle zwischen den benötigten Rohplatten und kontrolliere Material, Stärke, Belegung und Reststücke." },
      { id: "actions", target: '[data-tour="project-nesting-actions"]', title: "Nesting steuern", text: "Konfiguriere die Optimierung, speichere manuelle Anpassungen und berechne die Belegung neu. „Rebuild“ steuert, ob Entnahmen sofort neu angeordnet werden." },
      { id: "selection", target: '[data-tour="project-nesting-canvas"]', title: "Ausgewählten Strip ausrichten", text: "Wähle einen Pool-Strip in der Zeichenfläche. Danach kannst du Schnittlage und Drehung festlegen, bevor du ihn auf der Platte platzierst." },
      { id: "canvas", target: '[data-tour="project-nesting-canvas"]', title: "Belegung interaktiv prüfen", text: "Die Zeichenfläche zeigt Platten, Strips und Bauteile. Wähle Elemente direkt aus und kontrolliere Lage sowie Materialausnutzung." }
    ]
  },
  {
    id: "project-cut-functions",
    label: "Zuschnitt bedienen",
    description: "Platten, Stapel, Bauteile und Fertigmeldung",
    requiredFeature: "work-preparation",
    match: pathname => /^\/Projects\/Cut\/[^/]+$/.test(pathname),
    steps: [
      { id: "sheets", target: '[data-tour="project-cut-sheets"]', title: "Hauptplatte auswählen", text: "Wähle die Rohplatte, deren Zuschnittreihenfolge und Bauteile du gerade bearbeiten möchtest." },
      { id: "stack", target: '[data-tour="project-cut-stack"]', title: "Stapel und Bauteile durchgehen", text: "Blättere durch die Zuschnittstapel und wähle ein Bauteil aus dem aktuellen Strip für die Detailanzeige." },
      { id: "part", target: '[data-tour="project-cut-part"]', title: "Bauteildaten und Kanten", text: "Kontrolliere Maße und Kantenmaterial des ausgewählten Bauteils und markiere es nach der Bearbeitung als fertig oder wieder offen." },
      { id: "canvas", target: '[data-tour="project-cut-canvas"]', title: "Zuschnittlage erkennen", text: "Die grafische Ansicht zeigt den aktiven Stapel und hebt das ausgewählte beziehungsweise bereits fertige Bauteil hervor." }
    ]
  },
  {
    id: "project-cnc-functions",
    label: "CNC-Übersicht bedienen",
    description: "Bauteile, Bearbeitungen, Header und Maschinenexport",
    requiredFeature: "work-preparation",
    match: pathname => /^\/Projects\/Cnc\/[^/]+$/.test(pathname),
    steps: [
      { id: "parts", target: '[data-tour="project-cnc-parts"]', title: "CNC-Bauteil wählen", text: "Wähle eine Bauteilgruppe und anschließend die konkrete Variante, deren Bearbeitungen du prüfen möchtest." },
      { id: "export", target: '[data-tour="project-cnc-export"]', title: "Prüfen, bearbeiten und exportieren", text: "Öffne den erzeugten Code, wechsle in den Bauteileditor oder exportiere alle Programme mit dem aktiven Postprozessor als ZIP." },
      { id: "viewport", target: '[data-tour="project-cnc-viewport"]', title: "Bearbeitungen auf dem Bauteil", text: "Wechsle zwischen Seite A und B, kontrolliere Anschlag und Spiegelung und wähle Bearbeitungen direkt in der Zeichnung." },
      { id: "properties", target: '[data-tour="project-cnc-properties"]', title: "CNC-Eigenschaften prüfen", text: "Hier findest du Bauteildaten, Parameter und die Bearbeitungsliste der aktuell ausgewählten Seite beziehungsweise Operation." }
    ]
  },
  {
    id: "project-cnc-editor-functions",
    label: "CNC-Bauteileditor bedienen",
    description: "Operationen, Werkzeuge, Makros und Speichern",
    requiredFeature: "work-preparation",
    match: pathname => /^\/Projects\/Cnc\/[^/]+\/Edit\/[^/]+$/.test(pathname),
    steps: [
      { id: "actions", target: '[data-tour="project-cnc-editor-actions"]', title: "Änderungen verwalten", text: "Gehe zurück zur CNC-Übersicht, nutze Rückgängig und Wiederholen und speichere die geänderten Bearbeitungen am Bauteil." },
      { id: "operations", target: '[data-tour="project-cnc-editor-operations"]', title: "Bearbeitungsreihenfolge", text: "Wähle eine oder mehrere Operationen, ändere ihre Reihenfolge, dupliziere oder lösche sie. Doppelklick öffnet die Detailbearbeitung." },
      { id: "viewport", target: '[data-tour="project-cnc-editor-viewport"]', title: "Seiten und Werkzeugwege", text: "Wechsle zwischen Seite A und B, kontrolliere Header, Anschlag und Werkzeugspuren und wähle bei Bedarf Koordinaten direkt in der Zeichnung." },
      { id: "tools", target: '[data-tour="project-cnc-editor-tools"]', title: "Werkzeuge und Makros", text: "Füge manuelle Bearbeitungen oder unterstützte Makros ein. Die aktive Werkzeugdatenbank liefert Durchmesser für die Radiuskorrektur." }
    ]
  },
  {
    id: "project-time-functions",
    label: "Projektzeiten bedienen",
    description: "Tätigkeit starten und Zeithistorie prüfen",
    requiredFeature: "work-preparation",
    match: pathname => /^\/Projects\/Time\/[^/]+$/.test(pathname),
    steps: [
      { id: "controls", target: '[data-tour="project-time-controls"]', title: "Projektzeit erfassen", text: "Wähle die passende Tätigkeit und starte, pausiere oder beende die Zeitbuchung direkt für dieses Projekt." },
      { id: "history", target: '[data-tour="project-time-history"]', title: "Gebuchte Zeiten nachvollziehen", text: "Die Historie zeigt abgeschlossene und laufende Einträge mit Tätigkeit und Dauer für dieses Projekt." }
    ]
  },
  {
    id: "project-purchasing-functions",
    label: "Projekteinkauf bedienen",
    description: "Bedarf, Preise, Freigabe und Einkaufsstand",
    requiredFeature: "shop",
    match: pathname => /^\/Projects\/Purchasing\/[^/]+$/.test(pathname),
    steps: [
      { id: "overview", target: '[data-tour="project-purchasing-overview"]', title: "Projektbedarf zusammenführen", text: "Nesting-Material, Kanten, Beschläge, Shop-Artikel und manuelle Positionen werden mit ihren aktuellen Preisen in einem Einkaufswagen gesammelt." },
      { id: "actions", target: '[data-tour="project-purchasing-actions"]', title: "Speichern oder gesammelt freigeben", text: "Speichere manuelle Änderungen oder gib alle bepreisten Positionen frei. Eine Freigabe schreibt Menge und Preis für den zentralen Einkauf fest." },
      { id: "items", target: '[data-tour="project-purchasing-items"]', title: "Positionen kontrollieren", text: "Prüfe Mengen, Lieferanten und Nettopreise nach Herkunft. Einzelne Positionen lassen sich anpassen, entfernen oder gezielt freigeben." }
    ]
  },
  {
    id: "project-calculation-functions",
    label: "Projektkalkulation bedienen",
    description: "Vor-, Nachkalkulation und Stundenschätzung",
    requiredFeature: "calculation",
    match: pathname => /^\/Projects\/Calculation\/[^/]+$/.test(pathname),
    steps: [
      { id: "summary", target: '[data-tour="project-calculation-summary"]', title: "Materialbasis und Kalkulationsstand", text: "Die Materialbasis kommt aus dem Projekteinkauf; gespeicherte Stunden, Zuschläge und Kostenstellen ergänzen die Projektkalkulation." },
      { id: "tabs", target: '[data-tour="project-calculation-tabs"]', title: "Kalkulationsart wählen", text: "Wechsle zwischen Vor- und Nachkalkulation sowie Stundenschätzung. Für die Vorkalkulation stehen Schnell- und Vollmodus, für die Schätzung ein Assistent bereit." },
      { id: "content", target: '[data-tour="project-calculation-content"]', title: "Werte bearbeiten und übernehmen", text: "Bearbeite die Werte der gewählten Kalkulationsart und übernimm geschätzte Stunden bei Bedarf direkt in die Vor- oder Vollkalkulation." },
      { id: "save", target: '[data-tour="project-calculation-save"]', title: "Kalkulation speichern", text: "Speichere den aktuellen Kalkulationsstand, damit Material-, Stunden- und Kostendaten am Projekt erhalten bleiben." }
    ]
  },
  {
    id: "project-attachments-functions",
    label: "Projektanlagen bedienen",
    description: "Pläne, Reihenfolge, Fokus und Paperless",
    requiredFeature: "work-preparation",
    match: pathname => /^\/Projects\/Attachments\/[^/]+$/.test(pathname),
    steps: [
      { id: "actions", target: '[data-tour="project-attachments-actions"]', title: "Darstellung und Bearbeitung", text: "Bestimme die Anzahl der Rasterspalten oder öffne den Bearbeitungsmodus, um Anlagen hochzuladen und zu entfernen." },
      { id: "library", target: '[data-tour="project-attachments-library"]', title: "Fertigungsunterlagen verwenden", text: "Ordne Pläne und Bilder in der gewünschten Reihenfolge an und öffne wichtige Unterlagen in einer ablenkungsfreien Fokusansicht." },
      { id: "paperless", target: '[data-tour="project-attachments-library"]', title: "Verknüpfte Paperless-Dokumente", text: "Projektbezogene Paperless-Dokumente erscheinen unter den Anlagen, bleiben extern gespeichert und können von hier direkt geladen werden." }
    ]
  },
  {
    id: "project-settings-functions",
    label: "Projekteinstellungen bedienen",
    description: "Status, Stammdaten, Dateien, Export und Löschen",
    requiredFeature: "work-preparation",
    match: pathname => /^\/Projects\/Settings\/[^/]+$/.test(pathname),
    steps: [
      { id: "status", target: '[data-tour="project-settings-status"]', title: "Projektstatus festlegen", text: "Kennzeichne ein Projekt als aktiv, vorübergehend inaktiv oder abgeschlossen im Archiv." },
      { id: "details", target: '[data-tour="project-settings-details"]', title: "Stammdaten und Dateien pflegen", text: "Ändere Name, Kunde und Beschreibung, verwalte Projektdateien und lade ein zunächst lokales Projekt zum Server hoch." },
      { id: "export", target: '[data-tour="project-settings-export"]', title: "Projekt vollständig exportieren", text: "Lade Projektdaten und Dateien als importierbares Archiv herunter, beispielsweise für Übergabe oder Sicherung." },
      { id: "danger", target: '[data-tour="project-settings-danger"]', title: "Projekt löschen", text: "Die Löschfunktion entfernt das Projekt und seine zugehörigen Daten. Verwende sie nur, wenn das Projekt wirklich nicht mehr benötigt wird." }
    ]
  },
  {
    id: "documents",
    label: "Dokumente erklären",
    description: "Eingang, Paperless und Carpenters-Ablage",
    requiredFeature: "business-management",
    requiredRole: "admin",
    match: pathname => pathname === "/Documents",
    steps: [
      { id: "tabs", target: '[data-tour="documents-tabs"]', title: "Dokumentbereiche", text: "Wechsle zwischen Eingang, externer Bibliothek und lokaler Carpenters-Ablage." },
      { id: "inbox", activate: '[data-tour="documents-tab-inbox"]', target: '[data-tour="documents-inbox"]', title: "Dokumenteingang", text: "Neue Belege hochladen, synchronisieren, ansehen und zuordnen." },
      { id: "actions", target: '[data-tour="documents-inbox-actions"]', title: "Eingangsaktionen", text: "Lade Belege hoch oder synchronisiere Paperless manuell." },
      { id: "library", activate: '[data-tour="documents-tab-library"]', target: '[data-tour="documents-library"]', title: "Paperless-Bibliothek", text: "Durchsuche die externe Dokumentbibliothek und verknüpfe vorhandene Belege mit Carpenters." },
      { id: "local", activate: '[data-tour="documents-tab-local"]', target: '[data-tour="documents-local"]', title: "Carpenters-Dateien", text: "Aufmaß-Scans, manuelle Ordner und die Garage-Suche stehen auch ohne Paperless zur Verfügung." }
    ]
  },
  {
    id: "contacts",
    label: "Kontakte erklären",
    description: "Suche, Kundenstamm und neue Kontakte",
    requiredFeature: "crm",
    requiredRole: "admin",
    match: pathname => pathname === "/Kontakte",
    steps: [
      { id: "search", target: '[data-tour="contacts-search"]', title: "Kontakt suchen", text: "Die Suche berücksichtigt Namen und Firmendaten." },
      { id: "new", target: '[data-tour="contacts-new"]', title: "Neuer Kontakt", text: "Erfasse Privat- oder Firmenkunden einschließlich Adresse, Kontaktweg und CRM-Angaben." },
      { id: "list", target: '[data-tour="contacts-list"]', title: "Kundenliste", text: "Ein Klick öffnet Stammdaten, Projekte, Dokumente und die CRM-Ansicht." }
    ]
  },
  {
    id: "contact-form",
    label: "Kontaktformular erklären",
    description: "Stammdaten, Kontaktwege und Adresse erfassen",
    requiredFeature: "crm",
    requiredRole: "admin",
    match: pathname => pathname === "/Kontakte/new" || /^\/Kontakte\/edit\/[^/]+$/.test(pathname),
    steps: [
      { id: "form", target: '[data-tour="contact-form"]', title: "Kontaktdaten vollständig erfassen", text: "Pflege Personen- und Firmendaten, bevorzugte Kontaktwege, Kundenbewertung sowie die erste Adresse in einem Formular." }
    ]
  },
  {
    id: "contact-details",
    label: "Kundendetails erklären",
    description: "Stammdaten, Projekte und CRM-Aktionen",
    requiredFeature: "crm",
    requiredRole: "admin",
    match: pathname => /^\/Kontakte\/info\/[^/]+$/.test(pathname),
    steps: [
      { id: "actions", target: '[data-tour="contact-detail-actions"]', title: "Kundenaktionen", text: "Öffne CRM, bearbeite Stammdaten oder starte beziehungsweise importiere ein Projekt." },
      { id: "data", target: '[data-tour="contact-detail-data"]', title: "Stammdaten", text: "Kontaktdaten, Adressen und verknüpfte Dokumente werden zusammen angezeigt." },
      { id: "projects", target: '[data-tour="contact-detail-projects"]', title: "Kundenprojekte", text: "Alle dem Kunden zugeordneten Projekte sind von hier direkt erreichbar." }
    ]
  },
  {
    id: "contact-crm",
    label: "CRM-Funktionen erklären",
    description: "Kommunikation, Termine, Projekte und Dateien",
    requiredFeature: "crm",
    requiredRole: "admin",
    match: pathname => /^\/Kontakte\/info\/[^/]+\/crm$/.test(pathname),
    steps: [
      { id: "actions", target: '[data-tour="contact-crm-actions"]', title: "CRM-Aktionen", text: "Erfasse Kontakte, Notizen und Termine oder wechsle zur Stammdatenpflege." },
      { id: "history", target: '[data-tour="contact-crm-history"]', title: "Kontaktverlauf", text: "Telefonie, E-Mail, Schriftverkehr und manuelle Notizen erscheinen chronologisch." },
      { id: "appointments", target: '[data-tour="contact-crm-appointments"]', title: "Termine und Kalender", text: "Kundentermine und projektbezogene Kalendereinträge bleiben gemeinsam sichtbar." },
      { id: "projects", target: '[data-tour="contact-crm-projects"]', title: "Projekte und Kundendaten", text: "CRM, Projekte, Kontaktdaten, Adressen und Dateien sind ohne Kontextwechsel erreichbar." }
    ]
  },
  {
    id: "shop",
    label: "Shop und Einkauf erklären",
    description: "Freigaben, Katalog, Listen und Archiv",
    requiredFeature: "shop",
    match: pathname => pathname === "/Purchasing",
    steps: [
      { id: "tabs", target: '[data-tour="shop-tabs"]', title: "Einkaufsbereiche", text: "Diese Register trennen operative Freigaben, internen Shop, Katalog, Historie, Listen und Archiv." },
      { id: "released", activate: '[data-tour="shop-tab-released"]', target: '[data-tour="shop-released-actions"]', title: "Freigegebene Artikel", text: "Bündele Projektpositionen und bearbeite mehrere Freigaben gleichzeitig." },
      { id: "shop", activate: '[data-tour="shop-tab-shop"]', target: '[data-tour="shop-controls"]', title: "Interner Shop", text: "Suche Artikel, wähle ein Zielprojekt und passe Darstellung oder Katalog im Bearbeitungsmodus an." },
      { id: "catalog", activate: '[data-tour="shop-tab-catalog"]', target: '[data-tour="shop-catalog-controls"]', title: "Lieferantenkatalog", text: "Pflege Artikelnummern und lade aktuelle Shop-Daten über konfigurierte Lieferanten." },
      { id: "fetch", target: '[data-tour="shop-fetch"]', title: "Shop-Daten abrufen", text: "Aktualisiere Artikeldaten aus den angebundenen Lieferantenshops." },
      { id: "purchased", activate: '[data-tour="shop-tab-purchased"]', target: '[data-tour="shop-purchased"]', title: "Einkaufsverlauf", text: "Bereits gekaufte Positionen bleiben nach Lieferant und Projekt nachvollziehbar." },
      { id: "lists", activate: '[data-tour="shop-tab-lists"]', target: '[data-tour="shop-lists-controls"]', title: "Wiederkehrende Listen", text: "Bestelllisten für Verbrauchsmaterial können vorbereitet und gesammelt freigegeben werden." },
      { id: "archive", activate: '[data-tour="shop-tab-archive"]', target: '[data-tour="shop-archive-controls"]', title: "Lieferantenvarianten", text: "Historische oder alternative Lieferantenvarianten bleiben nachvollziehbar und können reaktiviert werden." }
    ]
  },
  {
    id: "employees",
    label: "Mitarbeiterzeiten erklären",
    description: "Wochenkalender, offene Zeiten und Bearbeitung",
    requiredFeature: "work-preparation",
    match: pathname => pathname === "/Mitarbeiter",
    steps: [
      { id: "week", target: '[data-tour="employee-week-controls"]', title: "Kalenderwoche wechseln", text: "Blättere durch die Wochen; alle Tage verwenden die zentral hinterlegten Arbeits- und Pausenzeiten." },
      { id: "calendar", target: '[data-tour="employee-calendar-grid"]', title: "Zeiten erfassen und bearbeiten", text: "Freie Bereiche lassen sich belegen, bestehende Blöcke öffnen den Editor für Tätigkeit, Projekt und Dauer." },
      { id: "open", target: '[data-tour="employee-open-times"]', title: "Offene Zeiten", text: "Wähle erst einen offenen Eintrag und anschließend den passenden freien Bereich im Kalender." }
    ]
  }
];

const roleAllows = (userRole, requiredRole) => {
  if (!requiredRole) return true;
  if (requiredRole === "admin") return userRole === "admin";
  return true;
};

export function filterTourSteps(tour, user) {
  const features = new Set(user?.features || []);
  return tour.steps.filter(step => (
    (!step.requiredFeature || features.has(step.requiredFeature))
    && roleAllows(user?.role, step.requiredRole)
  ));
}

export function availableTours(pathname, user) {
  const features = new Set(user?.features || []);
  return GUIDED_TOURS.filter(tour => (
    tour.match(pathname)
    && (!tour.requiredFeature || features.has(tour.requiredFeature))
    && roleAllows(user?.role, tour.requiredRole)
    && filterTourSteps(tour, user).length > 0
  ));
}

export function tourById(id) {
  return GUIDED_TOURS.find(tour => tour.id === id) || null;
}

const routeDescriptions = [
  [/^\/$/, "Startseite", "Persönlicher Überblick mit aktuellen Aufgaben, Projekten und Schnellzugriffen."],
  [/^\/Management$/, "Management · Auslastung", "Zuweisungen, Mitarbeitende und betriebliche Kennzahlen im Überblick."],
  [/^\/Management\/Board$/, "Management · Projektboard", "Projekte entlang des betrieblichen Arbeitsablaufs organisieren."],
  [/^\/Management\/Timeline$/, "Management · Zeitplanung", "Projektphasen und geplante Zeiträume im Gantt planen."],
  [/^\/Management\/Goals$/, "Management · Jahresziele", "Sollwerte, Zwischenstände und Ergebnisse des Geschäftsjahres verfolgen."],
  [/^\/Management\/Rates$/, "Management · Stundensätze", "Selbstkosten- und Maschinenstundensätze nachvollziehbar kalkulieren."],
  [/^\/Projects$/, "Projekte", "Alle Projekte anlegen, importieren und für die Bearbeitung öffnen."],
  [/^\/Projects\/Aufmas\//, "Projekt · Aufmaß", "Maße, Skizzen, Fotos und 3D-Daten für das geöffnete Projekt erfassen."],
  [/^\/Projects\/Cabinet\//, "Projekt · Schrankkonfigurator", "Korpusse, Fronten, Materialien und Konstruktionsfunktionen bearbeiten."],
  [/^\/Projects\/List\//, "Projekt · Stückliste", "Erzeugte Bauteile kontrollieren, aktualisieren und ausgeben."],
  [/^\/Projects\/Nesting\//, "Projekt · Nesting", "Rohplatten belegen, Reststücke ausrichten und die Optimierung speichern."],
  [/^\/Projects\/Cut\//, "Projekt · Zuschnitt", "Zuschnittstapel durchgehen und gefertigte Bauteile zurückmelden."],
  [/^\/Projects\/Cnc\/[^/]+\/Edit\//, "Projekt · CNC-Bauteileditor", "CNC-Operationen, Werkzeugwege, Makros und Programmheader bearbeiten."],
  [/^\/Projects\/Cnc\//, "Projekt · CNC", "Bearbeitungen prüfen und Maschinenprogramme mit dem Postprozessor erzeugen."],
  [/^\/Projects\/Time\//, "Projekt · Zeiterfassung", "Tätigkeiten buchen und die Zeithistorie des Projekts prüfen."],
  [/^\/Projects\/Purchasing\//, "Projekt · Einkauf", "Projektbedarf bepreisen, speichern und für den zentralen Einkauf freigeben."],
  [/^\/Projects\/Calculation\//, "Projekt · Kalkulation", "Material, Stunden und Stundensätze vor- oder nachkalkulieren."],
  [/^\/Projects\/Attachments\//, "Projekt · Anlagen", "Fertigungspläne, Bilder und verknüpfte Dokumente verwalten."],
  [/^\/Projects\/Settings\//, "Projekt · Einstellungen", "Status, Stammdaten, Dateien, Export und Löschung verwalten."],
  [/^\/Projects\//, "Projektarbeitsplatz", "Alle Arbeitsschritte vom Aufmaß bis zur Kalkulation für ein Projekt."],
  [/^\/Documents$/, "Dokumente", "Paperless- und Carpenters-Dokumente gemeinsam prüfen und zuordnen."],
  [/^\/Kontakte$/, "Kontakte", "Kunden suchen, neu erfassen und in der Detailansicht öffnen."],
  [/^\/Kontakte\/new$/, "Kontakte · Neuer Kontakt", "Stammdaten, Kontaktwege und die erste Adresse erfassen."],
  [/^\/Kontakte\/edit\//, "Kontakte · Stammdaten bearbeiten", "Vorhandene Kunden- und Adressdaten aktualisieren."],
  [/^\/Kontakte\/info\/[^/]+\/crm$/, "Kontakte · CRM", "Kommunikation, Termine, Projekte und Kundenhistorie zusammenführen."],
  [/^\/Kontakte\/info\//, "Kontakte · Kundendetails", "Stammdaten, Dokumente und Kundenprojekte im Überblick."],
  [/^\/Purchasing$/, "Einkauf & interner Shop", "Freigaben, Katalog, Bestelllisten und Lieferantenvarianten verwalten."],
  [/^\/Mitarbeiter$/, "Mitarbeiter · Arbeitszeit", "Wochenkalender bearbeiten und offene Zeiten zuordnen."]
];

export function describeRoute(pathname) {
  const match = routeDescriptions.find(([pattern]) => pattern.test(pathname));
  return match ? { label: match[1], description: match[2] } : { label: pathname, description: "Aktuelle Carpenters-Ansicht." };
}
