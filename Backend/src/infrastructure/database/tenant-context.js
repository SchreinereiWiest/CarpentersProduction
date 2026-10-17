import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request-lokaler Speicher für die aktuelle Mandantenidentität.
 *
 * AsyncLocalStorage hält den Kontext über Promises, Controller und Services
 * hinweg, ohne dass `tenantId` durch jede Funktionssignatur gereicht werden
 * muss. Der Speicher enthält niemals einen globalen Default: Fehlt der Kontext,
 * wird eine Datenbankoperation bewusst abgebrochen, statt versehentlich Daten
 * eines beliebigen Unternehmens zu verwenden.
 */
const tenantStorage = new AsyncLocalStorage();

/** Startet eine asynchrone Ausführung im unveränderlichen Mandantenkontext. */
export function runWithTenant(context, operation) {
    if (!context?.tenantId) {
        throw new Error("A tenantId is required to enter the tenant context");
    }

    // Die Kopie verhindert, dass Middleware den aktiven Kontext nachträglich
    // mutiert und dadurch bereits laufende Abfragen den Mandanten wechseln.
    return tenantStorage.run(Object.freeze({ ...context }), operation);
}

/** Liefert den Kontext für optionale Infrastrukturaufgaben, sonst `null`. */
export function getTenantContext() {
    return tenantStorage.getStore() ?? null;
}

/**
 * Liefert den Kontext für mandantenpflichtige Geschäftslogik.
 * Ein harter Fehler ist hier sicherer als ein impliziter Entwicklungsmandant.
 */
export function requireTenantContext() {
    const context = getTenantContext();

    if (!context?.tenantId) {
        throw new Error("Tenant context is missing");
    }

    return context;
}

/** Komfortzugriff für S3-Pfade und zusammengesetzte Prisma-Schlüssel. */
export function getTenantId() {
    return requireTenantContext().tenantId;
}
