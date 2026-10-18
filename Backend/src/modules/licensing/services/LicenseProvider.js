/**
 * Stabiler Vertrag zwischen Anwendung und Lizenzquelle.
 *
 * Controller kennen nur diese drei Operationen. Ein späterer HTTP-Provider
 * kann daher den lokalen Datenbankprovider ersetzen, ohne Authentifizierung
 * oder Fachmodule umzubauen. Provider geben ausschließlich normalisierte,
 * nicht geheime Lizenzinformationen zurück.
 */
export class LicenseProvider {
    /** Liest und validiert die Lizenz des angegebenen Mandanten. */
    async getLicense(_tenant) {
        throw new Error("LicenseProvider.getLicense is not implemented");
    }

    /** Prüft eine Modulfreigabe auf Basis derselben normalisierten Lizenz. */
    async hasFeature(tenant, feature) {
        const license = await this.getLicense(tenant);
        return license.status === "active" && license.features.includes(feature);
    }

    /**
     * Optionaler Aktivierungspunkt für Provider mit signierten Zertifikaten.
     * Reine Remote-Provider dürfen diese Operation weiterhin ablehnen.
     */
    async activateLicense(_tenant, _licenseKey) {
        throw new Error("This license provider does not support local activation");
    }
}

/** Fachlicher Fehler mit stabilem API-Code und geeignetem HTTP-Status. */
export class LicenseError extends Error {
    constructor(message, code = "LICENSE_INVALID", statusCode = 403) {
        super(message);
        this.name = "LicenseError";
        this.code = code;
        this.statusCode = statusCode;
    }
}
