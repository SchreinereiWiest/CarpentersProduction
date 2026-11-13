import prisma from "../../../infrastructure/database/prisma.js";
import { parseDatanormUploads } from "./datanorm-parser.js";

const INSERT_BATCH_SIZE = 1000;
const normalizedSku = value => String(value || "").replace(/[^\p{L}\p{N}]/gu, "").toLocaleLowerCase("de");

export const importSupplierDatanorm = async (supplierId, files) => {
    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId } });
    if (!supplier) throw Object.assign(new Error("Lieferant wurde nicht gefunden"), { statusCode: 404 });
    if (supplier.procurementType !== "datanorm") {
        throw Object.assign(new Error("Für diesen Lieferanten ist DATANORM nicht eingestellt"), { statusCode: 400 });
    }
    const parsed = await parseDatanormUploads(files);
    await prisma.$transaction(async transaction => {
        await transaction.supplierCatalogArticle.deleteMany({ where: { supplierId } });
        for (let offset = 0; offset < parsed.articles.length; offset += INSERT_BATCH_SIZE) {
            await transaction.supplierCatalogArticle.createMany({
                data: parsed.articles.slice(offset, offset + INSERT_BATCH_SIZE).map(article => ({
                    supplierId,
                    ...article,
                    normalizedSku: normalizedSku(article.sku)
                }))
            });
        }
    }, { timeout: 120000 });
    return {
        imported: parsed.articles.length,
        withNetPrice: parsed.articles.filter(article => article.netPrice !== null).length,
        version: parsed.version,
        files: parsed.files,
        records: parsed.records
    };
};
