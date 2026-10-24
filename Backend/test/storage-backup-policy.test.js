import test from "node:test";
import assert from "node:assert/strict";

import {
    backupTables,
    prepareShopRestore,
    SHOP_BACKUP_TABLES,
    SHOP_DATABASE_BACKUP
} from "../src/modules/storage-admin/storage-backup.policy.js";

const shopSnapshot = tenantId => ({
    tenantId,
    tables: {
        shop_configurations: [{ tenant_id: tenantId, edge_waste_percentage: 10 }],
        suppliers: [{ id: "supplier-source", tenant_id: tenantId, name: "Beschlaghandel" }],
        shop_article_groups: [{ id: "group-source", tenant_id: tenantId, name: "Beschläge" }],
        shop_articles: [{
            id: "article-source",
            tenant_id: tenantId,
            name: "Topfband",
            supplier_id: "supplier-source",
            group_id: "group-source",
            image_file_id: "file-source"
        }],
        shop_hardware_mappings: [{
            id: "mapping-source",
            tenant_id: tenantId,
            variant: "M",
            color: "white",
            article_id: "article-source"
        }]
    }
});

test("Shop-Backups enthalten ausschließlich freigegebene Shop-Stammdatentabellen", () => {
    assert.deepEqual(backupTables(SHOP_DATABASE_BACKUP), SHOP_BACKUP_TABLES);
    for (const forbidden of ["customers", "customer_addresses", "projects", "files", "audit_logs"]) {
        assert.equal(SHOP_BACKUP_TABLES.includes(forbidden), false);
    }
});

test("Ein tenantübergreifender Shop-Import ordnet IDs und Relationen neu zu", () => {
    const restored = prepareShopRestore(shopSnapshot("tenant-source"), "tenant-target");
    const supplier = restored.suppliers[0];
    const group = restored.shop_article_groups[0];
    const article = restored.shop_articles[0];
    const mapping = restored.shop_hardware_mappings[0];

    assert.notEqual(supplier.id, "supplier-source");
    assert.notEqual(group.id, "group-source");
    assert.notEqual(article.id, "article-source");
    assert.equal(article.tenant_id, "tenant-target");
    assert.equal(article.supplier_id, supplier.id);
    assert.equal(article.group_id, group.id);
    assert.equal(article.image_file_id, null);
    assert.equal(mapping.article_id, article.id);
});

test("Beim Restore im Ursprungstenant bleiben Katalog-IDs stabil", () => {
    const restored = prepareShopRestore(shopSnapshot("tenant-source"), "tenant-source");

    assert.equal(restored.suppliers[0].id, "supplier-source");
    assert.equal(restored.shop_article_groups[0].id, "group-source");
    assert.equal(restored.shop_articles[0].id, "article-source");
    assert.equal(restored.shop_hardware_mappings[0].id, "mapping-source");
    assert.equal(restored.shop_articles[0].image_file_id, "file-source");
});
