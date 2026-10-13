import prisma from "../config/prisma.js";
import { getTenantId } from "../context/tenantContext.js";

const LEGRABOX_VARIANTS = ["M", "K", "C", "L"];
const LEGRABOX_COLORS = ["white", "gray"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const cleanOptionalString = value => {
    const text = String(value ?? "").trim();
    return text || null;
};

const isUuidOrEmpty = value => !value || UUID_PATTERN.test(value);

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
    imageFileId: article.imageFileId
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
            description: group.description || ""
        }))
    };
};

const readSettings = async () => {
    const [suppliers, mappings] = await Promise.all([
        prisma.supplier.findMany({ orderBy: { name: "asc" } }),
        prisma.shopHardwareMapping.findMany()
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

    if (groups.some(group => !UUID_PATTERN.test(group?.id || "") || !String(group?.name || "").trim())) {
        return res.status(400).json({ error: "Every group needs a UUID and a name" });
    }

    if (articles.some(article => (
        !UUID_PATTERN.test(article?.id || "") ||
        !String(article?.name || "").trim() ||
        !isUuidOrEmpty(article?.supplierId) ||
        !isUuidOrEmpty(article?.groupId) ||
        !isUuidOrEmpty(article?.imageFileId) ||
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
                    description: cleanOptionalString(group.description)
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
                    category: cleanOptionalString(article.category),
                    description: cleanOptionalString(article.description),
                    unit: cleanOptionalString(article.unit) || "Stk.",
                    netPrice: Number(article.netPrice),
                    supplierId: article.supplierId || null,
                    groupId: article.groupId || null,
                    imageFileId: article.imageFileId || null
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

    if (!suppliers || !mappings || typeof mappings !== "object") {
        return res.status(400).json({ error: "Suppliers and Legrabox mappings are required" });
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
