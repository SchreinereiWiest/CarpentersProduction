import { LicenseProvider } from "./LicenseProvider.js";

const DEVELOPMENT_FEATURES = [
    "crm",
    "cabinet",
    "nesting",
    "management",
    "storage",
    "time",
    "purchasing"
];

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
