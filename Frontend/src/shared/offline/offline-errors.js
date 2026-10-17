export class OfflineResourceUnavailableError extends Error {
    constructor(resource) {
        super("Diese Ressource ist offline nicht verfügbar.");
        this.name = "OfflineResourceUnavailableError";
        this.code = "OFFLINE_RESOURCE_UNAVAILABLE";
        this.resource = resource;
    }
}
