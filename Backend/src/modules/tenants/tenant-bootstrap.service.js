import { systemPrisma } from "../../infrastructure/database/prisma.js";
import { hashPassword } from "../../shared/security/passwords.js";
import { activateLicense } from "../licensing/services/index.js";

const DEVELOPMENT_TENANT_ID = "00000000-0000-4000-8000-000000000001";

export class TenantBootstrapError extends Error {
    constructor(message, code, statusCode = 400) {
        super(message);
        this.name = "TenantBootstrapError";
        this.code = code;
        this.statusCode = statusCode;
    }
}

const requiredText = (value, label, maxLength = 200) => {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) {
        throw new TenantBootstrapError(`${label} ist erforderlich`, "BOOTSTRAP_VALIDATION");
    }
    if (normalized.length > maxLength) {
        throw new TenantBootstrapError(`${label} ist zu lang`, "BOOTSTRAP_VALIDATION");
    }
    return normalized;
};

export function parseTenantBootstrapInput(body = {}) {
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 12 || password.length > 200) {
        throw new TenantBootstrapError(
            "Das Passwort muss zwischen 12 und 200 Zeichen lang sein",
            "BOOTSTRAP_PASSWORD_INVALID"
        );
    }

    const email = requiredText(body.email, "E-Mail-Adresse").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new TenantBootstrapError("E-Mail-Adresse ist ungültig", "BOOTSTRAP_EMAIL_INVALID");
    }

    return {
        firstName: typeof body.firstName === "string" ? body.firstName.trim().slice(0, 100) || null : null,
        lastName: typeof body.lastName === "string" ? body.lastName.trim().slice(0, 100) || null : null,
        email,
        login: requiredText(body.login, "Login", 100),
        password,
        licenseKey: requiredText(body.licenseKey, "Lizenzschlüssel", 16_384)
    };
}

export async function tenantNeedsBootstrap(tenantId, database = systemPrisma) {
    return (await database.tenantMembership.count({ where: { tenantId } })) === 0;
}

/**
 * Legt genau den ersten Administrator eines leeren Mandanten an. Der
 * Lizenzschlüssel dient nur als einmaliger Besitznachweis und wird weder als
 * Benutzerpasswort noch in der Carpenters-Datenbank gespeichert.
 */
export async function bootstrapTenantAdmin(tenant, body, database = systemPrisma) {
    const input = parseTenantBootstrapInput(body);

    if (!(await tenantNeedsBootstrap(tenant.id, database))) {
        throw new TenantBootstrapError(
            "Die Ersteinrichtung dieses Unternehmens ist bereits abgeschlossen",
            "TENANT_SETUP_ALREADY_COMPLETED",
            409
        );
    }

    const license = await activateLicense(tenant, input.licenseKey);
    if (license.status !== "active") {
        throw new TenantBootstrapError("Die Lizenz ist nicht aktiv", "LICENSE_INACTIVE", 403);
    }

    const passwordHash = await hashPassword(input.password);

    try {
        return await database.$transaction(async transaction => {
            // Serialisiert konkurrierende Einrichtungsversuche je Tenant. Die
            // erneute Prüfung innerhalb der Transaktion schließt Doppel-Admins aus.
            await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${tenant.id}))`;
            if (!(await tenantNeedsBootstrap(tenant.id, transaction))) {
                throw new TenantBootstrapError(
                    "Die Ersteinrichtung dieses Unternehmens ist bereits abgeschlossen",
                    "TENANT_SETUP_ALREADY_COMPLETED",
                    409
                );
            }

            const identityConflict = await transaction.user.findFirst({
                where: { OR: [{ email: input.email }, { login: input.login }] },
                select: { id: true }
            });
            if (identityConflict) {
                throw new TenantBootstrapError(
                    "E-Mail-Adresse oder Login wird bereits verwendet",
                    "BOOTSTRAP_IDENTITY_CONFLICT",
                    409
                );
            }

            const user = await transaction.user.create({
                data: {
                    firstName: input.firstName,
                    lastName: input.lastName,
                    email: input.email,
                    login: input.login,
                    passwordHash,
                    role: "admin",
                    isActive: true
                }
            });
            await transaction.tenantMembership.create({
                data: { tenantId: tenant.id, userId: user.id, role: "admin", isActive: true }
            });
            await transaction.auditLog.create({
                data: {
                    tenantId: tenant.id,
                    actorUserId: user.id,
                    action: "tenant.bootstrap_admin_created",
                    entityType: "User",
                    entityId: user.id,
                    metadata: { method: "license_key" }
                }
            });

            return { id: user.id, email: user.email, login: user.login, role: "admin" };
        });
    } catch (error) {
        if (error?.code === "P2002") {
            throw new TenantBootstrapError(
                "E-Mail-Adresse oder Login wird bereits verwendet",
                "BOOTSTRAP_IDENTITY_CONFLICT",
                409
            );
        }
        throw error;
    }
}

/**
 * Hält den einzelnen Entwicklungsmandanten nach der Migration betriebsbereit.
 *
 * Die feste UUID entspricht der Backfill-Migration, sodass vorhandene Daten und
 * neue Starts garantiert dieselbe Firma verwenden. Mit Database- oder Remote-
 * Provider verändert diese Funktion bewusst keine Mandanten oder Lizenzen.
 */
export async function ensureDevelopmentTenant() {
    const provider = process.env.LICENSE_PROVIDER
        ?? (process.env.NODE_ENV === "production" ? "database" : "development");
    if (provider !== "development") return;

    // Der sichtbare Loginname kann lokal konfiguriert werden. Lizenzdatensatz
    // und Tenant werden gemeinsam auf denselben Namen gebracht.
    const name = process.env.DEVELOPMENT_TENANT_NAME?.trim() || "Development Company";
    const tenant = await systemPrisma.tenant.upsert({
        where: { id: DEVELOPMENT_TENANT_ID },
        create: { id: DEVELOPMENT_TENANT_ID, name, slug: "development", status: "active" },
        update: { name, status: "active" }
    });

    // Der Datensatz dokumentiert den Entwicklungszustand in den Settings. Die
    // eigentliche Freigabe liefert DevelopmentLicenseProvider ohne Abhängigkeit
    // von einem zweiten Server.
    await systemPrisma.tenantLicense.upsert({
        where: { tenantId: tenant.id },
        create: {
            tenantId: tenant.id,
            licenseId: "development-license",
            companyName: tenant.name,
            plan: "development",
            features: ["crm", "work-preparation", "calculation", "shop", "business-management"],
            status: "active"
        },
        update: {
            companyName: tenant.name,
            features: ["crm", "work-preparation", "calculation", "shop", "business-management"]
        }
    });
}
