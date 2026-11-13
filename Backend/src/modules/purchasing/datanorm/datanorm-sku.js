const normalizedSupplierText = supplier => `${supplier?.name || ""} ${supplier?.shopUrl || ""}`.toLocaleLowerCase("de");

export const isWuerthSupplier = supplier => /w(?:ü|ue|u)rth/.test(normalizedSupplierText(supplier));

export const wuerthSkuParts = value => {
    const rawSku = String(value || "");
    if (rawSku.length !== 15) return null;
    const packageText = rawSku.slice(10).trim();
    const baseSku = rawSku.slice(0, 10).trim();
    if (!baseSku || !/^\d+$/.test(packageText)) return null;
    return {
        baseSku,
        packageQuantity: Number(packageText)
    };
};
