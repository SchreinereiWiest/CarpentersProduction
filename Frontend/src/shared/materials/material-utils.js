const hasValue = value => value !== null && value !== undefined && value !== "";


export function hasEdgeMaterialData(material) {
    const articleNumber = String(material?.edgeArticleNumber ?? "").trim();
    const purchaseLength = material?.edgePurchaseLength;
    const hasCustomPurchaseLength = hasValue(purchaseLength) && Number(purchaseLength) !== 75;

    return Boolean(articleNumber) ||
        hasValue(material?.edgePricePerMeter) ||
        hasCustomPurchaseLength;
}


export function getEdgeMaterials(materials = []) {
    return materials.filter(hasEdgeMaterialData);
}
