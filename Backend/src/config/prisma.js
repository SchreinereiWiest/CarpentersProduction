import { PrismaClient } from "@prisma/client";
import { requireTenantContext } from "../context/tenantContext.js";

export const systemPrisma = new PrismaClient();

// Every delegate in this set contains business data and may only be queried
// inside a tenant context. Queries run in a short transaction so PostgreSQL
// RLS receives a connection-local tenant id without leaking it through the
// connection pool.
const TENANT_DELEGATES = new Set([
    "auditLog",
    "storageDeletionJob",
    "customer",
    "customerAddress",
    "project",
    "communication",
    "appointment",
    "s3Object",
    "file",
    "projectStorage",
    "material",
    "supplier",
    "shopArticleGroup",
    "shopArticle",
    "shopHardwareMapping",
    "timeEntry",
    "managementPeriod",
    "managementTransaction",
    "managementPayment",
    "managementAsset",
    "managementLoan",
    "managementRepayment"
]);

const READ_WITH_WHERE = new Set([
    "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow",
    "findMany", "count", "aggregate", "groupBy"
]);
const WRITE_WITH_WHERE = new Set([
    "update", "updateMany", "updateManyAndReturn", "delete", "deleteMany"
]);

function tenantArgs(method, input, tenantId) {
    const args = input ? { ...input } : {};

    if (READ_WITH_WHERE.has(method) || WRITE_WITH_WHERE.has(method)) {
        args.where = { ...(args.where ?? {}), tenantId };
    }

    if (method === "create") {
        args.data = { ...(args.data ?? {}), tenantId };
    }

    if (method === "createMany" || method === "createManyAndReturn") {
        const rows = Array.isArray(args.data) ? args.data : [args.data];
        args.data = rows.map(row => ({ ...(row ?? {}), tenantId }));
        if (!Array.isArray(input?.data)) args.data = args.data[0];
    }

    if (method === "upsert") {
        args.where = { ...(args.where ?? {}), tenantId };
        args.create = { ...(args.create ?? {}), tenantId };
        if (args.update) {
            const { tenantId: _ignored, ...update } = args.update;
            args.update = update;
        }
    }

    if (args.data && WRITE_WITH_WHERE.has(method)) {
        const { tenantId: _ignored, ...data } = args.data;
        args.data = data;
    }

    return args;
}

async function setRlsTenant(transaction, tenantId) {
    // A PostgreSQL superuser bypasses RLS even on FORCE-enabled tables. The
    // migration creates this fixed NOLOGIN/NOBYPASSRLS role specifically for
    // tenant-scoped transactions. SET LOCAL is reset automatically on commit.
    await transaction.$executeRawUnsafe("SET LOCAL ROLE carpenters_tenant_app");
    await transaction.$executeRaw`
        SELECT set_config('app.tenant_id', ${tenantId}, true)
    `;
}

function createTenantClient(database = systemPrisma, insideTransaction = false) {
    return new Proxy(database, {
        get(target, property) {
            if (property === "$transaction") {
                return async (operation, options) => {
                    const { tenantId } = requireTenantContext();

                    if (insideTransaction) {
                        if (typeof operation !== "function") {
                            throw new Error("Nested batch transactions are not supported");
                        }
                        return operation(createTenantClient(target, true));
                    }

                    if (typeof operation !== "function") {
                        throw new Error("Use an interactive transaction for tenant-scoped work");
                    }

                    return systemPrisma.$transaction(async transaction => {
                        await setRlsTenant(transaction, tenantId);
                        return operation(createTenantClient(transaction, true));
                    }, options);
                };
            }

            if (property === "$disconnect" || property === "$connect") {
                return target[property].bind(target);
            }

            if (!TENANT_DELEGATES.has(property)) {
                const value = target[property];
                return typeof value === "function" ? value.bind(target) : value;
            }

            return new Proxy(target[property], {
                get(delegate, method) {
                    if (typeof delegate[method] !== "function") return delegate[method];

                    return async input => {
                        const { tenantId } = requireTenantContext();
                        const args = tenantArgs(method, input, tenantId);

                        if (insideTransaction) {
                            return delegate[method](args);
                        }

                        return systemPrisma.$transaction(async transaction => {
                            await setRlsTenant(transaction, tenantId);
                            return transaction[property][method](args);
                        });
                    };
                }
            });
        }
    });
}

const prisma = createTenantClient();

export default prisma;
