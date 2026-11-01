import assert from "node:assert/strict";
import test from "node:test";

import {
    groupCatalogEntriesBySupplier,
    runShopDataFetch
} from "../src/procurement/shop-data-fetch.js";

const suppliers = [
    { id: "wuerth", name: "Würth", procurementType: "datanorm" },
    { id: "haefele", name: "Häfele", procurementType: "av-firefox-extension" }
];

test("Katalogeinträge werden nach Lieferant und numerischer Artikelnummer gruppiert", () => {
    const groups = groupCatalogEntriesBySupplier([
        { id: "3", sku: "20", supplierId: "wuerth" },
        { id: "1", sku: "100", supplierId: "haefele" },
        { id: "2", sku: "3", supplierId: "wuerth" }
    ], suppliers);

    assert.deepEqual(groups.map(group => group.supplier.name), ["Häfele", "Würth"]);
    assert.deepEqual(groups[1].entries.map(entry => entry.sku), ["3", "20"]);
});

test("der Script-Block isoliert fehlende Plugins und behält die Sortierung", async () => {
    const calls = [];
    const result = await runShopDataFetch({
        entries: [
            { id: "2", sku: "20", supplierId: "wuerth" },
            { id: "3", sku: "1", supplierId: "wuerth" },
            { id: "1", sku: "10", supplierId: "haefele" }
        ],
        suppliers,
        plugins: {
            datanorm: {
                fetchArticles: async ({ entries }) => {
                    calls.push(entries.map(entry => entry.sku));
                    return entries.map(entry => ({ entryId: entry.id, ok: true, data: { name: entry.sku } }));
                }
            }
        }
    });

    assert.deepEqual(calls, [["1", "20"]]);
    assert.equal(result.results.filter(item => item.ok).length, 2);
    assert.match(result.results.find(item => item.entryId === "1").error, /kein Plugin/i);
});

