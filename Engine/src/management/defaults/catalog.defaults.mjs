export const SETUP_STEPS = [
  [
    "Business",
    "Betrieb & Geschäftsjahr",
    "Abrechnungszeitraum, Betriebsstruktur, Kostenstellen"
  ],
  [
    "Assets",
    "Vermögen & Finanzierung",
    "Anlagen, Bestände, Darlehen und Abschreibungen"
  ],
  [
    "AnnualCosts",
    "Jährliche Betriebskosten",
    "Personal, Räume, Energie und Verwaltung"
  ],
  [
    "Hours",
    "Mitarbeiter & Arbeitsstunden",
    "Produktive Stunden je Tätigkeitsbereich"
  ],
  [
    "Distribution",
    "Kostenstellenverteilung",
    "Direkte Kosten, Umlagen und Schlüssel"
  ],
  [
    "Machines",
    "Maschinenkostenrechnung",
    "Standardmaschinen, CNC und Laufzeiten"
  ],
  ["Bab", "BAB & Vollkostenkalkulation", "Stellenkosten und Verrechnungssätze"],
  ["Review", "Prüfung & Freigabe", "Prüfung, Simulation und Versionierung"]
];

export const ANNUAL_COST_CATALOG = [
  ["personnel", "Personal inklusive Arbeitgeberanteile", "hours"],
  ["space", "Miete und Gebäude", "area"],
  ["energy", "Strom und Energie", "consumption"],
  ["insurance", "Versicherungen und Beiträge", "hours"],
  ["vehicles", "Fahrzeuge und Transport", "usage"],
  ["maintenance", "Wartung und Reparaturen", "hours"],
  ["administration", "Büro, IT und Software", "hours"],
  ["other", "Sonstige Gemeinkosten", "hours"]
];

/** Vorbelegte Tätigkeitsgruppen; nur tatsächlich vorhandene Tätigkeiten werden übernommen. */
export const SUGGESTED_CENTERS = [
  ['bankroom', 'Bankraum', 'production', ['assembly', 'finishing']],
  ['machines', 'Standardmaschinen / Zuschnitt & Bekantung', 'production', ['cutting', 'edging']],
  ['cnc', 'CNC', 'machine', ['cnc']],
  ['installation', 'Montage', 'production', ['installation']],
  ['office', 'Verwaltung', 'support', []],
];
export const EXTRA_DISTRIBUTION_KEYS = [
  { id: 'consumption', name: 'Energieverbrauch / Messwerte', metric: 'custom', weights: {} },
  { id: 'usage', name: 'Fahrzeugnutzung', metric: 'custom', weights: {} },
];
export const STAFF_CAPACITY_FIELDS = [
  ['workDays', 'Arbeitstage im Jahr'], ['holidays', 'Feiertage an Arbeitstagen'],
  ['vacation', 'Urlaubstage'], ['sickDays', 'Krankheitstage'],
  ['trainingDays', 'Schulung / sonstige Ausfälle'], ['hoursPerDay', 'Arbeitsstunden pro Tag'],
  ['productivity', 'Produktiver Anteil (%)'],
];
export const ACTUAL_ASSET_INPUTS = [
  ['actualMaintenance', 'Wartung'], ['actualEnergy', 'Energie'],
  ['actualSpace', 'Raumkosten'], ['actualOperating', 'Sonstiges'],
];
export const MACHINE_COST_LABELS = {
  Abschreibung: 'depreciation', Zinsansatz: 'interest', 'Wartung / Reparatur': 'maintenance',
  'Strom / Betriebsmittel': 'energy', Raumkosten: 'space', 'Sonstige Maschinenkosten': 'operating',
};
