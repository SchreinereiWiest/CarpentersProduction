export const advancedSettingsTabs = [
    { id: "estimation", label: "Stundenschätzung", requiredFeature: "calculation" },
    { id: "hourlyRates", label: "Stundensätze", requiredFeature: "calculation", excludedFeature: "business-management" },
    { id: "ai", label: "AI", requiredFeature: "work-preparation" },
    { id: "company", label: "Unternehmen" },
    { id: "documents", label: "Dokumente" },
    { id: "contactHistory", label: "Kontaktverlauf", requiredFeature: "crm" },
    { id: "shop", label: "Shop", requiredFeature: "shop" }
];
