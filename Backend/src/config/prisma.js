import { PrismaClient } from "@prisma/client";
import { requireTenantContext } from "../context/tenantContext.js";

/**
 * Ungefilterter Infrastruktur-Client.
 *
 * Dieser Client darf ausschließlich für globale Identitätsdaten (`User`,
 * `Tenant`, `TenantMembership`, `TenantLicense`), Migration/Bootstrap und die
 * technische Tenant-Auflösung verwendet werden. Geschäftsmodelle müssen über
 * den unten exportierten Tenant-Client laufen, weil nur dieser Filter und RLS
 * setzt.
 */
export const systemPrisma = new PrismaClient();

// Jeder Delegate in dieser Liste enthält Geschäftsdaten. Der Proxy erzwingt
// sowohl einen Prisma-Filter als auch eine kurze RLS-Transaktion. Neue
// mandantenbezogene Prisma-Modelle müssen zwingend in diese Liste aufgenommen
// werden; andernfalls schlägt die zusätzliche Datenbankschutzschicht nicht an.
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
    "syncMutation",
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

    // Die serverseitige tenantId überschreibt absichtlich einen gleichnamigen
    // Wert aus Controllerdaten. Ein Client kann den Mandanten nie auswählen.
    if (READ_WITH_WHERE.has(method) || WRITE_WITH_WHERE.has(method)) {
        args.where = { ...(args.where ?? {}), tenantId };
    }

    // Auch Schreiboperationen erhalten die ID zentral. Dadurch muss kein
    // Fachmodul daran denken und ein vergessenes Feld wird nicht zum Leck.
    if (method === "create") {
        args.data = { ...(args.data ?? {}), tenantId };
    }

    if (method === "createMany" || method === "createManyAndReturn") {
        const rows = Array.isArray(args.data) ? args.data : [args.data];
        args.data = rows.map(row => ({ ...(row ?? {}), tenantId }));
        if (!Array.isArray(input?.data)) args.data = args.data[0];
    }

    // Beim Upsert gelten Filter und Create-Zweig für denselben Mandanten. Eine
    // Änderung der tenantId im Update-Zweig wird bewusst verworfen.
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
    // Der Compose-Datenbankbesitzer ist Superuser und würde selbst FORCE RLS
    // umgehen. Die Migration legt daher eine feste NOLOGIN/NOBYPASSRLS-Rolle
    // an. SET LOCAL begrenzt Rolle und tenantId exakt auf diese Transaktion;
    // beim Zurückgeben der Verbindung an den Pool bleibt kein Kontext zurück.
    await transaction.$executeRawUnsafe("SET LOCAL ROLE carpenters_tenant_app");
    await transaction.$executeRaw`
        SELECT set_config('app.tenant_id', ${tenantId}, true)
    `;
}

function createTenantClient(database = systemPrisma, insideTransaction = false) {
    // Der Proxy behält die vertraute Prisma-API bei. Bestehende Controller
    // müssen dadurch nicht neu geschrieben werden und profitieren trotzdem
    // zentral von Filterung und RLS.
    return new Proxy(database, {
        get(target, property) {
            if (property === "$transaction") {
                return async (operation, options) => {
                    const { tenantId } = requireTenantContext();

                    // Prisma unterstützt keine verschachtelten interaktiven
                    // Transaktionen. Innerhalb einer laufenden Transaktion wird
                    // deshalb derselbe Client wiederverwendet.
                    if (insideTransaction) {
                        if (typeof operation !== "function") {
                            throw new Error("Nested batch transactions are not supported");
                        }
                        return operation(createTenantClient(target, true));
                    }

                    // Batch-Transaktionen erhalten bereits erzeugte
                    // PrismaPromises und könnten deshalb den Kontext umgehen.
                    // Interaktive Callbacks sind hier die sichere Variante.
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

            // Globale Identitätsmodelle werden nicht automatisch gefiltert.
            // Ihre Zugriffe müssen fachlich über TenantMembership begrenzt sein.
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

                        // Innerhalb eines expliziten Workflows ist RLS bereits
                        // gesetzt. Außerhalb erhält jede Einzelabfrage eine
                        // eigene kurze Transaktion, damit Pooling sicher bleibt.
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

/** Standardexport für sämtliche mandantenbezogene Anwendungslogik. */
const prisma = createTenantClient();

export default prisma;
