import { systemPrisma } from "../config/prisma.js";

const DEVELOPMENT_TENANT_ID = "00000000-0000-4000-8000-000000000001";

export async function ensureDevelopmentTenant() {
    const provider = process.env.LICENSE_PROVIDER
        ?? (process.env.NODE_ENV === "production" ? "database" : "development");
    if (provider !== "development") return;

    const name = process.env.DEVELOPMENT_TENANT_NAME?.trim() || "Development Company";
    const tenant = await systemPrisma.tenant.upsert({
        where: { id: DEVELOPMENT_TENANT_ID },
        create: { id: DEVELOPMENT_TENANT_ID, name, slug: "development", status: "active" },
        update: { name, status: "active" }
    });

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
