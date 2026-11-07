import { isWuerthSupplier, wuerthSkuParts } from "../../datanorm/datanorm-sku.js";

const articleKey = value => String(value || "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLocaleLowerCase("de");

export const datanormPlugin = {
    async fetchArticles({ supplier, entries }) {
        const records = Array.isArray(supplier.datanormArticles) ? supplier.datanormArticles : [];
        const bySku = new Map(records.map(article => [articleKey(article.sku), article]));
        const byWuerthBaseSku = new Map();
        if (isWuerthSupplier(supplier)) {
            for (const article of records) {
                const parts = wuerthSkuParts(article.sku);
                if (!parts) continue;
                const key = articleKey(parts.baseSku);
                const current = byWuerthBaseSku.get(key);
                if (!current || parts.packageQuantity < current.packageQuantity) {
                    byWuerthBaseSku.set(key, { article, packageQuantity: parts.packageQuantity });
                }
            }
        }
        return entries.map(entry => {
            const key = articleKey(entry.sku);
            const article = bySku.get(key) || byWuerthBaseSku.get(key)?.article;
            if (!article) {
                return { entryId: entry.id, sku: entry.sku, ok: false, error: "Artikelnummer ist im DATANORM-Import nicht enthalten" };
            }
            return {
                entryId: entry.id,
                sku: entry.sku,
                ok: true,
                data: {
                    sku: article.sku,
                    name: article.name,
                    description: article.description,
                    unit: article.unit,
                    netPrice: article.netPrice === null ? null : Number(article.netPrice),
                    imageUrl: article.imageUrl
                }
            };
        });
    }
};
