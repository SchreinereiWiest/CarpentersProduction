const articleKey = value => String(value || "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLocaleLowerCase("de");

export const datanormPlugin = {
    async fetchArticles({ supplier, entries }) {
        const records = Array.isArray(supplier.datanormArticles) ? supplier.datanormArticles : [];
        const bySku = new Map(records.map(article => [articleKey(article.sku), article]));
        return entries.map(entry => {
            const article = bySku.get(articleKey(entry.sku));
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
