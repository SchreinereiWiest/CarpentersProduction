export const primarySettingsTabs = [
    { id: "userInterface", label: "Benutzeroberfläche" },
    { id: "users", label: "Benutzer", requiredRole: "adminOnly" },
    { id: "cache", label: "Cache", requiredRole: "adminOnly" },
    { id: "storage", label: "Storage", requiredRole: "adminOnly", requiredFeature: "work-preparation" },
    { id: "project", label: "Projekt", requiredRole: "adminOnly", requiredFeature: "work-preparation" },
    { id: "cnc", label: "CNC", requiredRole: "adminOnly", requiredFeature: "work-preparation" },
    { id: "programSettings", label: "Programmeinstellungen", requiredRole: "adminOnly" },
    { id: "advanced", label: "Advanced", requiredRole: "adminOnly" }
];
