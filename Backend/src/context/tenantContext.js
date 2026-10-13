import { AsyncLocalStorage } from "node:async_hooks";

const tenantStorage = new AsyncLocalStorage();

export function runWithTenant(context, operation) {
    if (!context?.tenantId) {
        throw new Error("A tenantId is required to enter the tenant context");
    }

    return tenantStorage.run(Object.freeze({ ...context }), operation);
}

export function getTenantContext() {
    return tenantStorage.getStore() ?? null;
}

export function requireTenantContext() {
    const context = getTenantContext();

    if (!context?.tenantId) {
        throw new Error("Tenant context is missing");
    }

    return context;
}

export function getTenantId() {
    return requireTenantContext().tenantId;
}
