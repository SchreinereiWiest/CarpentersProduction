import { systemPrisma } from "../config/prisma.js";

const DEVELOPMENT_TENANT_ID = "00000000-0000-4000-8000-000000000001";

/**
 * Hält den einzelnen Entwicklungsmandanten nach der Migration betriebsbereit.
 *
 * Die feste UUID entspricht der Backfill-Migration, sodass vorhandene Daten und
 * neue Starts garantiert dieselbe Firma verwenden. In Produktions-/Database-
 * Lizenzmodus verändert diese Funktion bewusst keine Mandanten oder Lizenzen.
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
            features: ["crm", "cabinet", "nesting", "management", "storage", "time", "purchasing"],
            status: "active"
        },
        update: { companyName: tenant.name }
    });
}
