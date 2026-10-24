import crypto from "crypto";

export const FULL_BACKUP = "full";
export const DATABASE_BACKUP = "database";
export const SHOP_DATABASE_BACKUP = "shop-database";
export const BACKUP_TYPES = new Set([FULL_BACKUP, DATABASE_BACKUP, SHOP_DATABASE_BACKUP]);

// Authentifizierungs-, Mitgliedschafts- und Lizenzdaten bleiben bewusst außerhalb
// eines Betriebsdaten-Restores, damit ein Backup keinen Tenant aussperren kann.
export const BACKUP_TABLES = Object.freeze([
    "tenant_secrets",
    "customers",
    "customer_addresses",
    "projects",
    "communications",
    "appointments",
    "s3_objects",
    "files",
    "project_storage",
    "suppliers",
    "materials",
    "shop_configurations",
    "shop_article_groups",
    "shop_articles",
    "shop_hardware_mappings",
    "time_entries",
    "calculation_snapshots",
    "management_periods",
    "management_transactions",
    "management_payments",
    "management_assets",
    "management_loans",
    "management_repayments",
    "audit_logs"
]);

// Shop-Backups sind absichtlich auf Stammdaten begrenzt. Insbesondere dürfen
// Kunden, Projekte, Bestellungen und ihre Dateien nicht Teil eines portablen
// Katalog-Archivs werden.
export const SHOP_BACKUP_TABLES = Object.freeze([
    "shop_configurations",
    "suppliers",
    "shop_article_groups",
    "shop_articles",
    "shop_hardware_mappings"
]);

export const backupTables = backupType => backupType === SHOP_DATABASE_BACKUP
    ? SHOP_BACKUP_TABLES
    : BACKUP_TABLES;

export function prepareShopRestore(database, tenantId) {
    const preserveIds = database.tenantId === tenantId;
    const source = database.tables;
    const idMap = rows => new Map(rows.map(row => [
        row.id,
        preserveIds ? row.id : crypto.randomUUID()
    ]));
    const supplierIds = idMap(source.suppliers);
    const groupIds = idMap(source.shop_article_groups);
    const articleIds = idMap(source.shop_articles);
    const mappingIds = idMap(source.shop_hardware_mappings);

    return {
        shop_configurations: source.shop_configurations.map(row => ({ ...row, tenant_id: tenantId })),
        suppliers: source.suppliers.map(row => ({
            ...row,
            id: supplierIds.get(row.id),
            tenant_id: tenantId
        })),
        shop_article_groups: source.shop_article_groups.map(row => ({
            ...row,
            id: groupIds.get(row.id),
            tenant_id: tenantId
        })),
        shop_articles: source.shop_articles.map(row => ({
            ...row,
            id: articleIds.get(row.id),
            tenant_id: tenantId,
            supplier_id: row.supplier_id ? supplierIds.get(row.supplier_id) || null : null,
            group_id: row.group_id ? groupIds.get(row.group_id) || null : null,
            // Ein Shop-Datenbank-Backup enthält bewusst keine Dateien. Im
            // Ursprungstenant können vorhandene Bilder erneut verknüpft werden;
            // in einem anderen Tenant wäre dieselbe ID dagegen verwaist.
            image_file_id: preserveIds ? row.image_file_id || null : null
        })),
        shop_hardware_mappings: source.shop_hardware_mappings.map(row => ({
            ...row,
            id: mappingIds.get(row.id),
            tenant_id: tenantId,
            article_id: row.article_id ? articleIds.get(row.article_id) || null : null
        }))
    };
}
