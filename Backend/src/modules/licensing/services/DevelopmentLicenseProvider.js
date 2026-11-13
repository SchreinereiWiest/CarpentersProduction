import { LicenseProvider } from "./LicenseProvider.js";

const DEVELOPMENT_FEATURES = [
    "crm",
    "work-preparation",
    "calculation",
    "shop",
    "business-management"
];

/**
 * Offline-fähiger Provider für die Entwicklungsphase.
 *
 * Er führt keine Netz- oder Datenbankprüfung aus und schaltet alle derzeitigen
 * Module frei. Die Rückgabe bleibt absichtlich strukturgleich zur späteren
 * Produktivlizenz, damit Frontend und Middleware unverändert weiterarbeiten.
 * In Produktion wird dieser Provider nur durch eine explizite Fehlkonfiguration
 * gewählt; standardmäßig verwendet Produktion den Datenbankprovider.
 */
export class DevelopmentLicenseProvider extends LicenseProvider {
    async getLicense(tenant) {
        return {
            licenseId: "development-license",
            tenantId: tenant.id,
            companyName: tenant.name,
            status: "active",
            plan: "development",
            features: DEVELOPMENT_FEATURES,
            maxUsers: null,
            validUntil: null,
            provider: "development",
            licenseKey: "DEVELOPMENT"
        };
    }
}
