import { runShopDataFetch } from "../../../../Engine/src/procurement/shop-data-fetch.js";
import prisma from "../../infrastructure/database/prisma.js";
import { shopFetchPlugins } from "./shop-fetch/plugins/index.js";

const normalizeKeyPart = value => String(value || "").trim().toLocaleLowerCase("de");
const normalizeSku = value => String(value || "").replace(/[^\p{L}\p{N}]/gu, "").toLocaleLowerCase("de");
const catalogKey = (supplierId, sku) => `${supplierId || ""}:${normalizeKeyPart(sku)}`;

const serializeEntry = entry => ({
    id: entry.id,
    sku: entry.sku || "",
    name: entry.name || "",
    supplierId: entry.supplierId,
    shopArticleId: entry.shopArticleId,
    origin: entry.origin || "manual"
});

const serializeSupplier = supplier => ({
    id: supplier.id,
    name: supplier.name,
    externalId: supplier.externalId || "",
    procurementType: supplier.procurementType || null
});

const syncInternalShopArticles = async transaction => {
    const [articles, entries] = await Promise.all([
        transaction.shopArticle.findMany({
            select: { id: true, sku: true, name: true, supplierId: true },
            orderBy: { createdAt: "asc" }
        }),
        transaction.shopCatalogEntry.findMany({
            select: { id: true, sku: true, supplierId: true, shopArticleId: true },
            orderBy: { createdAt: "asc" }
        })
    ]);
    const linkedArticleIds = new Set(entries.map(entry => entry.shopArticleId).filter(Boolean));
    const unlinkedByKey = new Map(
        entries
            .filter(entry => !entry.shopArticleId)
            .map(entry => [catalogKey(entry.supplierId, entry.sku), entry])
    );

    for (const article of articles) {
        if (linkedArticleIds.has(article.id)) continue;
        const matchingEntry = unlinkedByKey.get(catalogKey(article.supplierId, article.sku));
        if (matchingEntry) {
            await transaction.shopCatalogEntry.update({
                where: { id: matchingEntry.id },
                data: { shopArticleId: article.id }
            });
            linkedArticleIds.add(article.id);
            unlinkedByKey.delete(catalogKey(article.supplierId, article.sku));
            continue;
        }
        await transaction.shopCatalogEntry.create({
            data: {
                sku: article.sku || "",
                name: article.name,
                supplierId: article.supplierId,
                shopArticleId: article.id,
                origin: "shop"
            }
        });
        linkedArticleIds.add(article.id);
    }
};

const readEntries = transaction => transaction.shopCatalogEntry.findMany({
    orderBy: [{ name: "asc" }, { sku: "asc" }]
});

export const readArticleCatalog = async () => prisma.$transaction(async transaction => {
    await syncInternalShopArticles(transaction);
    const entries = await readEntries(transaction);
    return { version: 1, entries: entries.map(serializeEntry) };
});

export const saveArticleCatalogEntries = async entries => prisma.$transaction(async transaction => {
    await syncInternalShopArticles(transaction);
    const existing = await transaction.shopCatalogEntry.findMany();
    const existingById = new Map(existing.map(entry => [entry.id, entry]));

    for (const entry of entries) {
        const current = existingById.get(entry.id);
        const data = {
            sku: String(entry.sku || "").trim(),
            name: String(entry.name || "").trim(),
            supplierId: entry.supplierId || null
        };
        if (current) {
            await transaction.shopCatalogEntry.update({ where: { id: entry.id }, data });
        } else {
            await transaction.shopCatalogEntry.create({
                data: { id: entry.id, ...data, origin: "manual" }
            });
        }
    }

    const retainedIds = entries.map(entry => entry.id);
    await transaction.shopCatalogEntry.deleteMany({
        where: {
            shopArticleId: null,
            ...(retainedIds.length > 0 ? { id: { notIn: retainedIds } } : {})
        }
    });
    const saved = await readEntries(transaction);
    return { version: 1, entries: saved.map(serializeEntry) };
});

const validHttpUrl = value => {
    if (!value) return "";
    try {
        const url = new URL(String(value));
        return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
    } catch {
        return "";
    }
};

const fetchedArticleData = (entry, data, currentArticle) => {
    const price = Number(data?.netPrice);
    const hasPrice = data?.netPrice !== null && data?.netPrice !== undefined && Number.isFinite(price) && price >= 0;
    return {
        name: String(data?.name || currentArticle?.name || entry.name || entry.sku).trim(),
        sku: String(entry.sku).trim(),
        description: data?.description
            ? String(data.description).trim()
            : currentArticle?.description || null,
        unit: String(data?.unit || currentArticle?.unit || "Stk.").trim() || "Stk.",
        netPrice: hasPrice ? price : Number(currentArticle?.netPrice || 0),
        supplierId: entry.supplierId,
        imageUrl: validHttpUrl(data?.imageUrl) || currentArticle?.imageUrl || null
    };
};

const findShopArticle = async (transaction, entry) => {
    if (entry.shopArticleId) {
        const linked = await transaction.shopArticle.findFirst({ where: { id: entry.shopArticleId } });
        if (linked) return linked;
    }
    return transaction.shopArticle.findFirst({
        where: {
            supplierId: entry.supplierId,
            sku: { equals: entry.sku, mode: "insensitive" }
        }
    });
};

const persistFetchResults = async (results, requiredProcurementType = null) => {
    const completed = [];
    for (const result of results) {
        if (!result.ok) {
            completed.push(result);
            continue;
        }
        try {
            const persisted = await prisma.$transaction(async transaction => {
                const entry = await transaction.shopCatalogEntry.findFirst({
                    where: { id: result.entryId },
                    include: { supplier: true }
                });
                if (!entry) throw new Error("Katalogeintrag wurde während des Fetches entfernt");
                if (requiredProcurementType && entry.supplier?.procurementType !== requiredProcurementType) {
                    throw new Error("Katalogeintrag gehört nicht zum erwarteten Händler-Plugin");
                }
                const currentArticle = await findShopArticle(transaction, entry);
                const data = fetchedArticleData(entry, result.data, currentArticle);
                const article = currentArticle
                    ? await transaction.shopArticle.update({ where: { id: currentArticle.id }, data })
                    : await transaction.shopArticle.create({ data: { ...data, category: "Import" } });
                await transaction.shopCatalogEntry.update({
                    where: { id: entry.id },
                    data: { name: data.name, sku: data.sku, shopArticleId: article.id }
                });
                return { articleId: article.id, created: !currentArticle };
            });
            completed.push({ ...result, ...persisted });
        } catch (error) {
            completed.push({ ...result, ok: false, error: error.message });
        }
    }
    return completed;
};

const summarizeResults = (completed, groups = []) => ({
    groups,
    total: completed.length,
    updated: completed.filter(result => result.ok && !result.created).length,
    created: completed.filter(result => result.ok && result.created).length,
    failed: completed.filter(result => !result.ok).length,
    results: completed
});

export const persistBrowserArticleCatalogResults = async results => {
    const entries = await prisma.shopCatalogEntry.findMany({
        where: { id: { in: results.map(result => result.entryId) } },
        include: { supplier: true }
    });
    const byId = new Map(entries.map(entry => [entry.id, entry]));
    const verified = results.map(result => {
        const entry = byId.get(result.entryId);
        if (!entry || entry.supplier?.procurementType !== "haefele-browser-extension") {
            return { ...result, ok: false, error: "Katalogeintrag gehört nicht zur Häfele-Erweiterung" };
        }
        return { ...result, supplierId: entry.supplierId, sku: entry.sku };
    });
    return summarizeResults(await persistFetchResults(verified, "haefele-browser-extension"));
};

export const fetchArticleCatalogData = async () => {
    const { entries, suppliers } = await prisma.$transaction(async transaction => {
        await syncInternalShopArticles(transaction);
        const [catalogEntries, configuredSuppliers] = await Promise.all([
            readEntries(transaction),
            transaction.supplier.findMany({ orderBy: { name: "asc" } })
        ]);
        return {
            entries: catalogEntries.map(serializeEntry),
            suppliers: configuredSuppliers.map(serializeSupplier)
        };
    });
    const browserSupplierIds = new Set(
        suppliers.filter(supplier => supplier.procurementType === "haefele-browser-extension").map(supplier => supplier.id)
    );
    const serverEntries = entries.filter(entry => !browserSupplierIds.has(entry.supplierId));
    const datanormSuppliers = suppliers.filter(supplier => supplier.procurementType === "datanorm");
    const datanormArticles = datanormSuppliers.length === 0 ? [] : await prisma.supplierCatalogArticle.findMany({
        where: {
            OR: datanormSuppliers.map(supplier => ({
                supplierId: supplier.id,
                normalizedSku: {
                    in: serverEntries
                        .filter(entry => entry.supplierId === supplier.id)
                        .map(entry => normalizeSku(entry.sku))
                }
            }))
        }
    });
    const suppliersWithCatalog = suppliers.map(supplier => ({
        ...supplier,
        datanormArticles: datanormArticles.filter(article => article.supplierId === supplier.id)
    }));
    const execution = await runShopDataFetch({ entries: serverEntries, suppliers: suppliersWithCatalog, plugins: shopFetchPlugins });
    const completed = await persistFetchResults(execution.results);
    return {
        ...summarizeResults(completed, execution.groups),
        browserExtensionEntries: entries.filter(entry => browserSupplierIds.has(entry.supplierId)).length
    };
};

