const compareArticleNumber = (left, right) => String(left || "").localeCompare(
    String(right || ""),
    "de",
    { numeric: true, sensitivity: "base" }
);

const normalizePluginType = value => String(value || "").trim().toLocaleLowerCase("de");

/**
 * Sortiert den schlanken Artikelkatalog zuerst nach Lieferant und danach nach
 * Artikelnummer. Die Engine kennt dabei weder HTTP noch Browser-Automation.
 */
export const groupCatalogEntriesBySupplier = (entries = [], suppliers = []) => {
    const suppliersById = new Map(
        (Array.isArray(suppliers) ? suppliers : []).map(supplier => [supplier.id, supplier])
    );
    const groups = new Map();

    for (const entry of Array.isArray(entries) ? entries : []) {
        const supplier = suppliersById.get(entry?.supplierId) || null;
        const key = supplier?.id || "__without_supplier__";
        if (!groups.has(key)) {
            groups.set(key, {
                supplier,
                entries: []
            });
        }
        groups.get(key).entries.push(entry);
    }

    return [...groups.values()]
        .map(group => ({
            ...group,
            entries: [...group.entries].sort((left, right) => (
                compareArticleNumber(left?.sku, right?.sku) ||
                String(left?.name || "").localeCompare(String(right?.name || ""), "de")
            ))
        }))
        .sort((left, right) => {
            if (!left.supplier) return 1;
            if (!right.supplier) return -1;
            return String(left.supplier.name || "").localeCompare(String(right.supplier.name || ""), "de");
        });
};

const failedResult = (entry, supplier, error) => ({
    entryId: entry.id,
    sku: entry.sku || "",
    supplierId: supplier?.id || entry.supplierId || null,
    ok: false,
    error: error instanceof Error ? error.message : String(error || "Unbekannter Fehler")
});

/**
 * Führt die Händlerblöcke nacheinander aus. Ein Plugin implementiert
 * `fetchArticles({ supplier, entries })` und gibt pro Eintrag ein Ergebnis
 * zurück. Händlerfehler bleiben dadurch auf die jeweilige Gruppe begrenzt.
 */
export const runShopDataFetch = async ({ entries = [], suppliers = [], plugins = {} } = {}) => {
    const groups = groupCatalogEntriesBySupplier(entries, suppliers);
    const results = [];

    for (const group of groups) {
        if (!group.supplier) {
            results.push(...group.entries.map(entry => failedResult(
                entry,
                null,
                "Kein Lieferant zugeordnet"
            )));
            continue;
        }

        const pluginType = normalizePluginType(group.supplier.procurementType);
        const plugin = plugins[pluginType];
        if (!plugin || typeof plugin.fetchArticles !== "function") {
            results.push(...group.entries.map(entry => failedResult(
                entry,
                group.supplier,
                pluginType
                    ? `Kein Plugin für „${group.supplier.procurementType}“ registriert`
                    : "Für den Lieferanten ist kein Fetch-Plugin eingestellt"
            )));
            continue;
        }

        try {
            const pluginResults = await plugin.fetchArticles({
                supplier: group.supplier,
                entries: group.entries
            });
            const byEntryId = new Map(
                (Array.isArray(pluginResults) ? pluginResults : [])
                    .filter(result => result?.entryId)
                    .map(result => [result.entryId, result])
            );
            results.push(...group.entries.map(entry => {
                const result = byEntryId.get(entry.id);
                return result
                    ? {
                        ...result,
                        entryId: entry.id,
                        sku: result.sku || entry.sku || "",
                        supplierId: group.supplier.id,
                        ok: Boolean(result.ok)
                    }
                    : failedResult(entry, group.supplier, "Das Händler-Plugin lieferte kein Ergebnis");
            }));
        } catch (error) {
            results.push(...group.entries.map(entry => failedResult(entry, group.supplier, error)));
        }
    }

    return {
        groups: groups.map(group => ({
            supplierId: group.supplier?.id || null,
            supplierName: group.supplier?.name || "Ohne Lieferant",
            pluginType: group.supplier?.procurementType || null,
            articleNumbers: group.entries.map(entry => entry.sku || "")
        })),
        results
    };
};

