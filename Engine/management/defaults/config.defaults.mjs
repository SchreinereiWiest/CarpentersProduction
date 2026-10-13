/** Erstellt eine unabhängige, noch nicht eingerichtete Jahresplanung mit leeren Bestands- und Freigabelisten. */
export function defaultSetup() {
  return {
    companyName: "",
    initialized: false,
    hoursMode: "manual",
    interestMode: "imputed",
    materialStock: 0,
    assets: [],
    loans: [],
    annualCosts: [],
    staff: [],
    approvals: []
  };
}

/** Erstellt ein frisches Jahresmodell mit Kostenarten und Verteilungsschlüsseln; Listen werden nicht zwischen Jahren geteilt. */
export function defaultConfig() {
  return {
    mode: "easy",
    startMonth: 1,
    openingCash: 0,
    openingOtherAssets: 0,
    openingOtherLiabilities: 0,
    profitPercent: 10,
    easyRates: [],
    costCenters: [],
    setup: defaultSetup(),
    costTypes: [
      ["material", "Material", "direct", false, "hours"],
      ["personnel", "Personal", "overhead", true, "employees"],
      ["space", "Raumkosten", "overhead", true, "area"],
      ["energy", "Energie", "overhead", true, "hours"],
      ["vehicles", "Fahrzeuge", "overhead", true, "hours"],
      ["machines", "Maschinen", "overhead", true, "hours"],
      ["administration", "Verwaltung", "overhead", true, "hours"],
      ["insurance", "Versicherungen und Beiträge", "overhead", true, "hours"],
      ["maintenance", "Wartung und Reparaturen", "overhead", true, "hours"],
      ["other", "Sonstige Gemeinkosten", "overhead", true, "hours"],
      ["depreciation", "Abschreibungen", "overhead", true, "hours"],
      ["imputed", "Kalkulatorische Kosten", "overhead", true, "hours"],
      ["interest", "Finanzierungskosten", "overhead", true, "hours"]
    ].map(([id, name, treatment, hourly, key]) => ({
      id,
      name,
      treatment,
      hourly,
      key
    })),
    distributionKeys: [
      { id: "hours", name: "Produktive Stunden", metric: "hours", weights: {} },
      { id: "area", name: "Fläche (m²)", metric: "area", weights: {} },
      {
        id: "employees",
        name: "Mitarbeitende (Vollzeitäquivalente)",
        metric: "employees",
        weights: {}
      },
      { id: "equal", name: "Gleichmäßig", metric: "equal", weights: {} }
    ]
  };
}

/** Gemeinsame Zeit-, Szenario- und Erststartvorgaben der Betriebsrechnung. */
export const DATE_DEFAULTS = { locale: 'en-CA', options: { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' } };
export const CALCULATION_DEFAULTS = { basis: 'plan', initialMode: 'full' };
