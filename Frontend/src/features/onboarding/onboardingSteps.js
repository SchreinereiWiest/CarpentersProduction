export const ONBOARDING_STEP_META = {
  welcome: { number: "01", label: "Willkommen", group: "Start", description: "Einrichtung vorbereiten" },
  company: { number: "02", label: "Unternehmen", group: "System", description: "Arbeitszeiten und Tätigkeiten" },
  team: { number: "03", label: "Benutzer", group: "System", description: "Team und Rollen" },
  workspace: { number: "04", label: "Arbeitsplatz", group: "System", description: "Oberfläche, Lizenz und Speicher" },
  production: { number: "05", label: "Fertigung", group: "System", description: "Projekt-, Möbel- und CNC-Defaults" },
  calculation: { number: "06", label: "Kalkulation", group: "System", description: "Schätzlogik und Stundensätze" },
  integrations: { number: "07", label: "Integrationen", group: "System", description: "Dokumente, KI und Kontaktverlauf" },
  "shop-settings": { number: "08", label: "Shop & Lieferanten", group: "System", description: "Beschaffung anbinden" },
  articles: { number: "09", label: "Artikellisten", group: "Daten", description: "Vorhandene Artikel übernehmen" },
  customers: { number: "10", label: "Kontakte", group: "Daten", description: "Kunden aus CSV importieren" },
  management: { number: "11", label: "Management", group: "Betrieb", description: "Kosten, Personal und Sätze" },
  tour: { number: "12", label: "Rundgang", group: "Abschluss", description: "Das System kennenlernen" }
};

export const metaForStep = id => ONBOARDING_STEP_META[id] || { number: "–", label: id, group: "", description: "" };
