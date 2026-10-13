export class LicenseProvider {
    async getLicense(_tenant) {
        throw new Error("LicenseProvider.getLicense is not implemented");
    }

    async hasFeature(tenant, feature) {
        const license = await this.getLicense(tenant);
        return license.status === "active" && license.features.includes(feature);
    }

    async activateLicense(_tenant, _licenseKey) {
        throw new Error("This license provider does not support local activation");
    }
}

export class LicenseError extends Error {
    constructor(message, code = "LICENSE_INVALID", statusCode = 403) {
        super(message);
        this.name = "LicenseError";
        this.code = code;
        this.statusCode = statusCode;
    }
}
