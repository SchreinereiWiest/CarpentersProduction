import prisma from "../../infrastructure/database/prisma.js";
import { getTenantId } from "../../infrastructure/database/tenant-context.js";

const LEGRABOX_VARIANTS = ["M", "K", "C", "L"];
const LEGRABOX_COLORS = ["white", "gray"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const cleanOptionalString = value => {
    const text = String(value ?? "").trim();
    return text || null;
};

const isUuidOrEmpty = value => !value || UUID_PATTERN.test(value);

const normalizeCategoryList = value => {
    const seen = new Set();
    const categories = String(value ?? "")
        .split(",")
        .map(category => category.trim())
        .filter(category => {
            if (!category) return false;
            const normalized = category.toLocaleLowerCase("de");
            if (seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
    return categories.length > 0 ? categories.join(", ") : null;
};

const isHttpUrlOrEmpty = value => {
    const text = String(value ?? "").trim();
    if (!text) return true;
    if (text.length > 2048) return false;

    try {
        const url = new URL(text);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
};

const serializeArticle = article => ({
    id: article.id,
    name: article.name,
    sku: article.sku || "",
    category: article.category || "",
    description: article.description || "",
    unit: article.unit,
    netPrice: Number(article.netPrice),
    supplierId: article.supplierId,
    groupId: article.groupId,
    imageFileId: article.imageFileId,
    imageUrl: article.imageUrl || ""
});

const serializeList = list => ({
    id: list.id,
    name: list.name,
    description: list.description || "",
    category: list.category || "Sonstiges",
    items: (list.items || []).map(item => ({
        id: item.id,
        articleId: item.articleId,
        quantity: Number(item.quantity),
        article: item.article ? serializeArticle(item.article) : null
    })).filter(item => item.article)
});

const serializeArchiveEntry = entry => ({
    id: entry.id,
    articleId: entry.articleId,
    article: entry.article ? serializeArticle(entry.article) : null,
    supplierId: entry.supplierId,
    supplierName: entry.supplier?.name || entry.supplierName || "Ohne Lieferant",
    sku: entry.sku || "",
    netPrice: Number(entry.netPrice),
    unit: entry.unit,
    createdAt: entry.createdAt
});

const serializeNonProjectPurchase = item => ({
    id: item.id,
    sourceKey: `non-project:${item.id}`,
    source: "purchase-list",
    listId: item.listId,
    listName: item.listName,
    articleId: item.articleId,
    name: item.name,
    sku: item.sku || "",
    category: item.category || "Sonstiges",
    description: item.description || "",
    quantity: Number(item.quantity),
    unit: item.unit,
    netPrice: item.netPrice === null ? null : Number(item.netPrice),
    supplierId: item.supplierId,
    supplierName: item.supplier?.name || item.supplierName || "",
    purchased: item.status === "purchased",
    purchasedAt: item.purchasedAt,
    released: item.status === "released",
    createdAt: item.createdAt
});

const readCatalog = async () => {
    const [articles, groups] = await Promise.all([
        prisma.shopArticle.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
        prisma.shopArticleGroup.findMany({ orderBy: { name: "asc" } })
    ]);

    return {
        version: 1,
        articles: articles.map(serializeArticle),
        groups: groups.map(group => ({
            id: group.id,
            name: group.name,
            description: group.description || "",
            imageUrl: group.imageUrl || ""
        }))
    };
};

const readSettings = async () => {
    const [suppliers, mappings, configuration] = await Promise.all([
        prisma.supplier.findMany({ orderBy: { name: "asc" } }),
        prisma.shopHardwareMapping.findMany(),
        prisma.shopConfiguration.findFirst()
    ]);
    const legraboxArticleIds = Object.fromEntries(
        LEGRABOX_VARIANTS.map(variant => [variant, { white: "", gray: "" }])
    );

    for (const mapping of mappings) {
        if (legraboxArticleIds[mapping.variant]?.[mapping.color] !== undefined) {
            legraboxArticleIds[mapping.variant][mapping.color] = mapping.articleId || "";
        }
    }

    return {
        version: 1,
        edgeWastePercentage: configuration
            ? Number(configuration.edgeWastePercentage)
            : 10,
        suppliers: suppliers.map(supplier => ({
            id: supplier.id,
            name: supplier.name,
            externalId: supplier.externalId || "",
            procurementType: supplier.procurementType || null,
            procurementConfig: supplier.procurementConfig || null
        })),
        legraboxArticleIds
    };
};

const readLists = async () => prisma.purchaseList.findMany({
    include: {
        items: {
            include: { article: true },
            orderBy: { createdAt: "asc" }
        }
    },
    orderBy: [{ category: "asc" }, { name: "asc" }]
});

const readArchive = async () => prisma.shopArticleArchive.findMany({
    include: { article: true, supplier: true },
    orderBy: [{ supplierName: "asc" }, { createdAt: "desc" }]
});

export const getShopCatalog = async (_req, res) => {
    try {
        res.json(await readCatalog());
    } catch (error) {
        console.error("Shop-Katalog konnte nicht geladen werden:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const saveShopCatalog = async (req, res) => {
    const articles = Array.isArray(req.body?.articles) ? req.body.articles : null;
    const groups = Array.isArray(req.body?.groups) ? req.body.groups : null;

    if (!articles || !groups) {
        return res.status(400).json({ error: "Articles and groups must be arrays" });
    }

    if (groups.some(group => (
        !UUID_PATTERN.test(group?.id || "") ||
        !String(group?.name || "").trim() ||
        !isHttpUrlOrEmpty(group?.imageUrl)
    ))) {
        return res.status(400).json({ error: "Invalid group data" });
    }

    if (articles.some(article => (
        !UUID_PATTERN.test(article?.id || "") ||
        !String(article?.name || "").trim() ||
        !isUuidOrEmpty(article?.supplierId) ||
        !isUuidOrEmpty(article?.groupId) ||
        !isUuidOrEmpty(article?.imageFileId) ||
        !isHttpUrlOrEmpty(article?.imageUrl) ||
        !Number.isFinite(Number(article?.netPrice)) ||
        Number(article.netPrice) < 0
    ))) {
        return res.status(400).json({ error: "Invalid article data" });
    }

    try {
        await prisma.$transaction(async transaction => {
            for (const group of groups) {
                const data = {
                    name: String(group.name).trim(),
                    description: cleanOptionalString(group.description),
                    imageUrl: cleanOptionalString(group.imageUrl)
                };
                await transaction.shopArticleGroup.upsert({
                    where: { id: group.id },
                    create: { id: group.id, ...data },
                    update: data
                });
            }

            for (const article of articles) {
                const data = {
                    name: String(article.name).trim(),
                    sku: cleanOptionalString(article.sku),
                    category: normalizeCategoryList(article.category),
                    description: cleanOptionalString(article.description),
                    unit: cleanOptionalString(article.unit) || "Stk.",
                    netPrice: Number(article.netPrice),
                    supplierId: article.supplierId || null,
                    groupId: article.groupId || null,
                    imageFileId: article.imageFileId || null,
                    imageUrl: cleanOptionalString(article.imageUrl)
                };
                await transaction.shopArticle.upsert({
                    where: { id: article.id },
                    create: { id: article.id, ...data },
                    update: data
                });
            }

            const articleIds = articles.map(article => article.id);
            const groupIds = groups.map(group => group.id);
            await transaction.shopArticle.deleteMany({
                where: articleIds.length > 0 ? { id: { notIn: articleIds } } : {}
            });
            await transaction.shopArticleGroup.deleteMany({
                where: groupIds.length > 0 ? { id: { notIn: groupIds } } : {}
            });
        });

        res.json(await readCatalog());
    } catch (error) {
        console.error("Shop-Katalog konnte nicht gespeichert werden:", error);
        res.status(400).json({ error: "Shop catalog could not be saved" });
    }
};

export const getShopSettings = async (_req, res) => {
    try {
        res.json(await readSettings());
    } catch (error) {
        console.error("Shop-Einstellungen konnten nicht geladen werden:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const saveShopSettings = async (req, res) => {
    const suppliers = Array.isArray(req.body?.suppliers) ? req.body.suppliers : null;
    const mappings = req.body?.legraboxArticleIds;
    const edgeWastePercentage = Number(req.body?.edgeWastePercentage ?? 10);

    if (!suppliers || !mappings || typeof mappings !== "object") {
        return res.status(400).json({ error: "Suppliers and Legrabox mappings are required" });
    }

    if (!Number.isFinite(edgeWastePercentage) || edgeWastePercentage < 0 || edgeWastePercentage > 1000) {
        return res.status(400).json({ error: "Edge waste percentage must be between 0 and 1000" });
    }

    if (suppliers.some(supplier => !UUID_PATTERN.test(supplier?.id || "") || !String(supplier?.name || "").trim())) {
        return res.status(400).json({ error: "Every supplier needs a UUID and a name" });
    }

    const mappingEntries = LEGRABOX_VARIANTS.flatMap(variant => (
        LEGRABOX_COLORS.map(color => ({
            variant,
            color,
            articleId: mappings?.[variant]?.[color] || null
        }))
    ));
    if (mappingEntries.some(mapping => !isUuidOrEmpty(mapping.articleId))) {
        return res.status(400).json({ error: "Invalid Legrabox article mapping" });
    }

    try {
        await prisma.$transaction(async transaction => {
            await transaction.shopConfiguration.upsert({
                where: { tenantId: getTenantId() },
                create: { edgeWastePercentage },
                update: { edgeWastePercentage }
            });

            for (const supplier of suppliers) {
                const data = {
                    name: String(supplier.name).trim(),
                    externalId: cleanOptionalString(supplier.externalId),
                    procurementType: cleanOptionalString(supplier.procurementType),
                    procurementConfig: supplier.procurementConfig ?? undefined
                };
                await transaction.supplier.upsert({
                    where: { id: supplier.id },
                    create: { id: supplier.id, ...data },
                    update: data
                });
            }

            const supplierIds = suppliers.map(supplier => supplier.id);
            await transaction.supplier.deleteMany({
                where: supplierIds.length > 0 ? { id: { notIn: supplierIds } } : {}
            });

            for (const mapping of mappingEntries) {
                await transaction.shopHardwareMapping.upsert({
                    where: {
                        tenantId_variant_color: {
                            tenantId: getTenantId(),
                            variant: mapping.variant,
                            color: mapping.color
                        }
                    },
                    create: mapping,
                    update: { articleId: mapping.articleId }
                });
            }
        });

        res.json(await readSettings());
    } catch (error) {
        console.error("Shop-Einstellungen konnten nicht gespeichert werden:", error);
        res.status(400).json({ error: "Shop settings could not be saved" });
    }
};

export const getPurchaseLists = async (_req, res) => {
    try {
        const lists = await readLists();
        res.json({ version: 1, lists: lists.map(serializeList) });
    } catch (error) {
        console.error("Bestelllisten konnten nicht geladen werden:", error);
        res.status(500).json({ error: "Purchase lists could not be loaded" });
    }
};

const validateListPayload = body => {
    const items = Array.isArray(body?.items) ? body.items : null;
    if (!String(body?.name || "").trim() || !items || items.length === 0) return null;
    if (items.some(item => (
        !UUID_PATTERN.test(item?.articleId || "") ||
        !Number.isFinite(Number(item?.quantity)) ||
        Number(item.quantity) <= 0
    ))) return null;
    return {
        name: String(body.name).trim(),
        description: cleanOptionalString(body.description),
        category: cleanOptionalString(body.category) || "Sonstiges",
        items: [...new Map(items.map(item => [item.articleId, {
            articleId: item.articleId,
            quantity: Number(item.quantity)
        }])).values()]
    };
};

const savePurchaseList = async (req, res) => {
    const payload = validateListPayload(req.body);
    const id = req.params.id || req.body?.id;
    if (!payload || (id && !UUID_PATTERN.test(id))) {
        return res.status(400).json({ error: "Name and at least one valid article are required" });
    }

    try {
        const articleIds = payload.items.map(item => item.articleId);
        const articleCount = await prisma.shopArticle.count({ where: { id: { in: articleIds } } });
        if (articleCount !== articleIds.length) {
            return res.status(400).json({ error: "One or more articles do not exist" });
        }

        await prisma.$transaction(async transaction => {
            const list = id
                ? await transaction.purchaseList.update({
                    where: { id },
                    data: { name: payload.name, description: payload.description, category: payload.category }
                })
                : await transaction.purchaseList.create({
                    data: { name: payload.name, description: payload.description, category: payload.category }
                });
            await transaction.purchaseListItem.deleteMany({ where: { listId: list.id } });
            await transaction.purchaseListItem.createMany({
                data: payload.items.map(item => ({ ...item, listId: list.id }))
            });
        });

        const lists = await readLists();
        res.status(id ? 200 : 201).json({ version: 1, lists: lists.map(serializeList) });
    } catch (error) {
        console.error("Bestellliste konnte nicht gespeichert werden:", error);
        res.status(400).json({ error: "Purchase list could not be saved" });
    }
};

export const createPurchaseList = savePurchaseList;
export const updatePurchaseList = savePurchaseList;

export const deletePurchaseList = async (req, res) => {
    if (!UUID_PATTERN.test(req.params.id || "")) return res.status(400).json({ error: "Invalid list id" });
    try {
        await prisma.purchaseList.delete({ where: { id: req.params.id } });
        res.status(204).end();
    } catch (error) {
        console.error("Bestellliste konnte nicht gelöscht werden:", error);
        res.status(404).json({ error: "Purchase list not found" });
    }
};

export const releasePurchaseList = async (req, res) => {
    if (!UUID_PATTERN.test(req.params.id || "")) return res.status(400).json({ error: "Invalid list id" });
    try {
        const list = await prisma.purchaseList.findFirst({
            where: { id: req.params.id },
            include: { items: { include: { article: { include: { supplier: true } } } } }
        });
        if (!list) return res.status(404).json({ error: "Purchase list not found" });
        if (list.items.length === 0) return res.status(400).json({ error: "Purchase list is empty" });

        await prisma.nonProjectPurchase.createMany({
            data: list.items.map(({ article, quantity }) => ({
                listId: list.id,
                listName: list.name,
                articleId: article.id,
                name: article.name,
                sku: article.sku,
                category: article.category,
                description: article.description,
                quantity: Number(quantity),
                unit: article.unit,
                netPrice: article.netPrice,
                supplierId: article.supplierId,
                supplierName: article.supplier?.name || null,
                status: "released"
            }))
        });
        res.status(201).json({ released: list.items.length });
    } catch (error) {
        console.error("Bestellliste konnte nicht freigegeben werden:", error);
        res.status(400).json({ error: "Purchase list could not be released" });
    }
};

export const getNonProjectPurchases = async (req, res) => {
    const requestedStatus = String(req.query.status || "");
    const status = ["released", "purchased", "rejected"].includes(requestedStatus) ? requestedStatus : undefined;
    try {
        const items = await prisma.nonProjectPurchase.findMany({
            where: status ? { status } : {},
            include: { supplier: true },
            orderBy: { createdAt: "desc" }
        });
        res.json({ version: 1, items: items.map(serializeNonProjectPurchase) });
    } catch (error) {
        console.error("Projektfreie Bestellungen konnten nicht geladen werden:", error);
        res.status(500).json({ error: "Non-project purchases could not be loaded" });
    }
};

export const processNonProjectPurchases = async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids)] : [];
    const action = req.body?.action;
    if (ids.length === 0 || ids.some(id => !UUID_PATTERN.test(id)) || !["purchased", "rejected"].includes(action)) {
        return res.status(400).json({ error: "Valid ids and action are required" });
    }
    const timestamp = new Date();
    try {
        const result = await prisma.nonProjectPurchase.updateMany({
            where: { id: { in: ids }, status: "released" },
            data: {
                status: action,
                purchasedAt: action === "purchased" ? timestamp : null,
                rejectedAt: action === "rejected" ? timestamp : null
            }
        });
        res.json({ updated: result.count });
    } catch (error) {
        console.error("Projektfreie Bestellungen konnten nicht verarbeitet werden:", error);
        res.status(400).json({ error: "Non-project purchases could not be processed" });
    }
};

export const getArticleArchive = async (_req, res) => {
    try {
        const entries = await readArchive();
        res.json({ version: 1, entries: entries.map(serializeArchiveEntry) });
    } catch (error) {
        console.error("Artikelarchiv konnte nicht geladen werden:", error);
        res.status(500).json({ error: "Article archive could not be loaded" });
    }
};

const validateArchivePayload = body => {
    const netPrice = Number(body?.netPrice);
    if (
        !UUID_PATTERN.test(body?.articleId || "") ||
        !UUID_PATTERN.test(body?.supplierId || "") ||
        !Number.isFinite(netPrice) || netPrice < 0 ||
        !String(body?.unit || "").trim()
    ) return null;
    return {
        articleId: body.articleId,
        supplierId: body.supplierId,
        sku: cleanOptionalString(body.sku),
        netPrice,
        unit: String(body.unit).trim()
    };
};

const saveArchiveEntry = async (req, res) => {
    const payload = validateArchivePayload(req.body);
    const id = req.params.id;
    if (!payload || (id && !UUID_PATTERN.test(id))) return res.status(400).json({ error: "Invalid archive entry" });
    try {
        const [article, supplier] = await Promise.all([
            prisma.shopArticle.findFirst({ where: { id: payload.articleId } }),
            prisma.supplier.findFirst({ where: { id: payload.supplierId } })
        ]);
        if (!article || !supplier) return res.status(400).json({ error: "Article or supplier not found" });
        const data = { ...payload, supplierName: supplier.name };
        if (id) await prisma.shopArticleArchive.update({ where: { id }, data });
        else await prisma.shopArticleArchive.create({ data });
        const entries = await readArchive();
        res.status(id ? 200 : 201).json({ version: 1, entries: entries.map(serializeArchiveEntry) });
    } catch (error) {
        console.error("Archiveintrag konnte nicht gespeichert werden:", error);
        res.status(400).json({ error: "Archive entry could not be saved" });
    }
};

export const createArticleArchiveEntry = saveArchiveEntry;
export const updateArticleArchiveEntry = saveArchiveEntry;

export const deleteArticleArchiveEntry = async (req, res) => {
    if (!UUID_PATTERN.test(req.params.id || "")) return res.status(400).json({ error: "Invalid archive id" });
    try {
        await prisma.shopArticleArchive.delete({ where: { id: req.params.id } });
        res.status(204).end();
    } catch (error) {
        console.error("Archiveintrag konnte nicht gelöscht werden:", error);
        res.status(404).json({ error: "Archive entry not found" });
    }
};

export const activateArticleArchiveEntry = async (req, res) => {
    if (!UUID_PATTERN.test(req.params.id || "")) return res.status(400).json({ error: "Invalid archive id" });
    try {
        await prisma.$transaction(async transaction => {
            const archived = await transaction.shopArticleArchive.findFirst({
                where: { id: req.params.id },
                include: { supplier: true }
            });
            if (!archived) throw new Error("Archive entry not found");
            const current = await transaction.shopArticle.findFirst({
                where: { id: archived.articleId },
                include: { supplier: true }
            });
            if (!current) throw new Error("Shop article not found");

            await transaction.shopArticleArchive.create({
                data: {
                    articleId: current.id,
                    supplierId: current.supplierId,
                    supplierName: current.supplier?.name || "Ohne Lieferant",
                    sku: current.sku,
                    netPrice: current.netPrice,
                    unit: current.unit
                }
            });
            await transaction.shopArticle.update({
                where: { id: current.id },
                data: {
                    supplierId: archived.supplierId,
                    sku: archived.sku,
                    netPrice: archived.netPrice,
                    unit: archived.unit
                }
            });
            await transaction.shopArticleArchive.delete({ where: { id: archived.id } });
        });

        const [catalog, entries] = await Promise.all([readCatalog(), readArchive()]);
        res.json({ catalog, archive: { version: 1, entries: entries.map(serializeArchiveEntry) } });
    } catch (error) {
        console.error("Archivlieferant konnte nicht aktiviert werden:", error);
        res.status(400).json({ error: "Archived supplier could not be activated" });
    }
};
