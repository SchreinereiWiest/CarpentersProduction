import {
    fetchArticleCatalogData,
    persistBrowserArticleCatalogResults,
    readArticleCatalog,
    saveArticleCatalogEntries
} from "./article-catalog.service.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateEntries = value => {
    if (!Array.isArray(value) || value.length > 10000) return null;
    const entries = value.map(entry => ({
        id: String(entry?.id || ""),
        sku: String(entry?.sku || "").trim(),
        name: String(entry?.name || "").trim(),
        supplierId: entry?.supplierId ? String(entry.supplierId) : null
    }));
    if (entries.some(entry => (
        !UUID_PATTERN.test(entry.id) ||
        !entry.sku || entry.sku.length > 120 ||
        !entry.name || entry.name.length > 500 ||
        entry.supplierId && !UUID_PATTERN.test(entry.supplierId)
    ))) return null;
    return entries;
};

export const getArticleCatalog = async (_req, res) => {
    try {
        res.json(await readArticleCatalog());
    } catch (error) {
        console.error("Artikelkatalog konnte nicht geladen werden:", error);
        res.status(500).json({ error: "Article catalog could not be loaded" });
    }
};

export const saveArticleCatalog = async (req, res) => {
    const entries = validateEntries(req.body?.entries);
    if (!entries) return res.status(400).json({ error: "Invalid article catalog entries" });
    try {
        res.json(await saveArticleCatalogEntries(entries));
    } catch (error) {
        console.error("Artikelkatalog konnte nicht gespeichert werden:", error);
        res.status(400).json({ error: "Article catalog could not be saved" });
    }
};

const validateIdSelection = value => {
    if (value === undefined || value === null) return null;
    if (!Array.isArray(value) || value.length > 10000 || value.some(id => !UUID_PATTERN.test(String(id)))) return false;
    return [...new Set(value.map(String))];
};

export const fetchArticleCatalog = async (req, res) => {
    const supplierIds = validateIdSelection(req.body?.supplierIds);
    const entryIds = validateIdSelection(req.body?.entryIds);
    if (supplierIds === false || entryIds === false) return res.status(400).json({ error: "Invalid shop fetch selection" });
    try {
        res.json(await fetchArticleCatalogData({ supplierIds, entryIds }));
    } catch (error) {
        console.error("Shop-Daten konnten nicht geladen werden:", error);
        res.status(502).json({ error: "Supplier shop data could not be fetched" });
    }
};

const validateBrowserResults = value => {
    if (!Array.isArray(value) || value.length > 10000) return null;
    const results = value.map(result => ({
        entryId: String(result?.entryId || ""),
        supplierId: result?.supplierId ? String(result.supplierId) : null,
        sku: String(result?.sku || "").slice(0, 120),
        newEntry: Boolean(result?.newEntry),
        ok: Boolean(result?.ok),
        error: result?.error ? String(result.error).slice(0, 1000) : null,
        data: result?.ok ? {
            name: String(result?.data?.name || "").trim().slice(0, 500),
            description: String(result?.data?.description || "").trim().slice(0, 20000),
            unit: String(result?.data?.unit || "Stk.").trim().slice(0, 50),
            imageUrl: String(result?.data?.imageUrl || "").trim().slice(0, 2048),
            netPrice: result?.data?.netPrice === null || result?.data?.netPrice === undefined
                ? null
                : Number(result.data.netPrice)
        } : null
    }));
    if (results.some(result => (
        !UUID_PATTERN.test(result.entryId) ||
        result.newEntry && (!UUID_PATTERN.test(result.supplierId || "") || !result.sku) ||
        result.ok && (!result.data.name || (
            result.data.netPrice !== null && (!Number.isFinite(result.data.netPrice) || result.data.netPrice < 0)
        ))
    ))) return null;
    return results;
};

export const saveBrowserArticleCatalogResults = async (req, res) => {
    const results = validateBrowserResults(req.body?.results);
    if (!results) return res.status(400).json({ error: "Invalid browser extension results" });
    try {
        res.json(await persistBrowserArticleCatalogResults(results));
    } catch (error) {
        console.error("Browser-Ergebnisse konnten nicht gespeichert werden:", error);
        res.status(400).json({ error: "Browser extension results could not be saved" });
    }
};

