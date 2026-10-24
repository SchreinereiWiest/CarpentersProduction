import { createUuid } from "../shared/id.js";
import { calculateEdgeRequirements } from "../nesting/edge-requirements.js";

const toPositiveNumber = (value, fallback = 1) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const keyPart = value => encodeURIComponent(String(value ?? "").trim().toLowerCase());
export const LEGRABOX_VARIANTS = ["M", "K", "C", "L"];
export const LEGRABOX_COLORS = ["white", "gray"];

export const DEFAULT_SHOP_SETTINGS = {
    version: 1,
    edgeWastePercentage: 10,
    suppliers: [],
    legraboxArticleIds: Object.fromEntries(
        LEGRABOX_VARIANTS.map(variant => [variant, { white: "", gray: "" }])
    )
};

export const normalizeShopSettings = data => {
    const configuredEdgeWaste = Number(data?.edgeWastePercentage);
    const suppliers = (Array.isArray(data?.suppliers) ? data.suppliers : [])
        .filter(supplier => supplier?.id && supplier?.name)
        .map(supplier => ({
            id: String(supplier.id),
            name: String(supplier.name),
            externalId: String(supplier.externalId || ""),
            procurementType: supplier.procurementType || null,
            procurementConfig: supplier.procurementConfig || null
        }));

    return {
        ...DEFAULT_SHOP_SETTINGS,
        ...(data && typeof data === "object" ? data : {}),
        edgeWastePercentage: Number.isFinite(configuredEdgeWaste) && configuredEdgeWaste >= 0
            ? configuredEdgeWaste
            : DEFAULT_SHOP_SETTINGS.edgeWastePercentage,
        suppliers,
        legraboxArticleIds: Object.fromEntries(
            LEGRABOX_VARIANTS.map(variant => [variant, {
                ...DEFAULT_SHOP_SETTINGS.legraboxArticleIds[variant],
                ...(data?.legraboxArticleIds?.[variant] ?? {})
            }])
        )
    };
};

export const createArticleId = () => {
    return createUuid();
};

export const createSupplierId = () => {
    return createUuid();
};

export const resolveSupplier = (supplierId, shopSettings = DEFAULT_SHOP_SETTINGS) => {
    const normalizedId = String(supplierId || "");
    const supplier = normalizeShopSettings(shopSettings).suppliers.find(item => item.id === normalizedId);
    return supplier || (normalizedId ? { id: normalizedId, name: normalizedId, externalId: "" } : null);
};

export const normalizeProcurementDocument = data => ({
    version: 1,
    updatedAt: data?.updatedAt ?? null,
    items: Array.isArray(data?.items) ? data.items : []
});

export const normalizeCatalog = data => ({
    version: 1,
    updatedAt: data?.updatedAt ?? null,
    articles: Array.isArray(data?.articles) ? data.articles : [],
    groups: Array.isArray(data?.groups) ? data.groups : []
});

export const buildPlateItems = (nestingData = [], storageMaterials = [], shopSettings = DEFAULT_SHOP_SETTINGS) => {
    const grouped = new Map();

    for (const sheet of Array.isArray(nestingData) ? nestingData : []) {
        const material = sheet?.storageMaterialName || sheet?.MID || sheet?.settings?.defaultSheet?.material || "Ohne Material";
        const materialNumber = sheet?.MID || sheet?.settings?.defaultSheet?.material || "";
        const thickness = Number(sheet?.T) || 0;
        const matchingStorageMaterials = materialNumber
            ? (Array.isArray(storageMaterials) ? storageMaterials : []).filter(candidate => (
            String(candidate?.materialNumber ?? "").trim().toLocaleLowerCase("de") === String(materialNumber).trim().toLocaleLowerCase("de") &&
            Number(candidate?.width) > 0 &&
            Number(candidate?.height) > 0
            ))
            : [];
        const storageMaterial = matchingStorageMaterials.find(candidate => (
            candidate?.thickness !== null &&
            candidate?.thickness !== "" &&
            Number.isFinite(Number(candidate?.thickness)) &&
            Math.abs(Number(candidate.thickness) - thickness) < 0.001
        )) ?? (matchingStorageMaterials.length === 1 ? matchingStorageMaterials[0] : null);
        const supplier = resolveSupplier(storageMaterial?.supplierId, shopSettings);

        for (const plate of Array.isArray(sheet?.nestingPlates) ? sheet.nestingPlates : []) {
            if (!(plate?.strips?.length || plate?.plates?.length)) continue;

            const width = Number(plate.placedWidth ?? plate.width ?? sheet?.settings?.defaultSheet?.width) || 0;
            const height = Number(plate.placedHeight ?? plate.height ?? sheet?.settings?.defaultSheet?.height) || 0;
            const storedSquareMeterPrice = storageMaterial?.pricePerSquareMeter;
            const squareMeterPrice = storedSquareMeterPrice === null || storedSquareMeterPrice === "" || storedSquareMeterPrice === undefined
                ? Number.NaN
                : Number(storedSquareMeterPrice);
            const platePrice = Number.isFinite(squareMeterPrice)
                ? Math.round(squareMeterPrice * (width / 1000) * (height / 1000) * 100) / 100
                : null;
            const sourceKey = `nesting:${keyPart(materialNumber)}:${thickness}:${width}:${height}`;
            const current = grouped.get(sourceKey);

            if (current) {
                current.quantity += 1;
                continue;
            }

            grouped.set(sourceKey, {
                id: sourceKey,
                sourceKey,
                source: "nesting",
                category: "Platten",
                name: material,
                sku: materialNumber,
                description: `${width} × ${height} × ${thickness} mm`,
                quantity: 1,
                unit: "Stk.",
                netPrice: platePrice,
                supplierId: supplier?.id || null,
                supplierName: supplier?.name || "",
                purchased: false,
                purchasedAt: null,
                released: false
            });
        }
    }

    return [...grouped.values()];
};

const roundUpToCentimeter = meters => Math.ceil((meters - 1e-9) * 100) / 100;

export const applyEdgeQuantityMode = (item, quantityMode = "meter") => {
    if (item?.category !== "Kanten") return item;

    const requiredMeters = toPositiveNumber(item.requiredMeters, 0);
    const purchaseLength = toPositiveNumber(item.purchaseLength, 75);
    const pricePerMeter = item.pricePerMeter === null || item.pricePerMeter === undefined || item.pricePerMeter === ""
        ? null
        : Number(item.pricePerMeter);

    if (quantityMode === "piece") {
        return {
            ...item,
            quantityMode: "piece",
            quantity: Math.max(1, Math.ceil(requiredMeters / purchaseLength)),
            unit: "Stk.",
            netPrice: Number.isFinite(pricePerMeter)
                ? Math.round(pricePerMeter * purchaseLength * 100) / 100
                : null
        };
    }

    return {
        ...item,
        quantityMode: "meter",
        quantity: roundUpToCentimeter(requiredMeters),
        unit: "m",
        netPrice: Number.isFinite(pricePerMeter) ? pricePerMeter : null
    };
};

export const buildEdgeItems = (nestingData = [], storageMaterials = [], shopSettings = DEFAULT_SHOP_SETTINGS) => {
    const normalizedSettings = normalizeShopSettings(shopSettings);
    const storage = Array.isArray(storageMaterials) ? storageMaterials : [];
    const requirements = calculateEdgeRequirements(nestingData, undefined, storage);
    const wastePercentage = normalizedSettings.edgeWastePercentage;

    return requirements.byEdgeMaterial.map(requirement => {
        const matchingMaterials = storage.filter(material => (
            [material?.materialNumber, material?.edgeArticleNumber].some(reference => (
                String(reference ?? "").trim().toLocaleLowerCase("de") ===
                String(requirement.materialNumber).trim().toLocaleLowerCase("de")
            ))
        ));
        const material = matchingMaterials.find(candidate => (
            candidate?.edgeArticleNumber ||
            candidate?.edgePricePerMeter !== null && candidate?.edgePricePerMeter !== undefined
        )) ?? matchingMaterials[0] ?? null;
        const supplier = resolveSupplier(material?.supplierId, normalizedSettings);
        const baseRequiredMeters = requirement.meters;
        const requiredMeters = baseRequiredMeters * (1 + wastePercentage / 100);
        const purchaseLength = toPositiveNumber(material?.edgePurchaseLength, 75);
        const storedPrice = material?.edgePricePerMeter;
        const pricePerMeter = storedPrice === null || storedPrice === undefined || storedPrice === ""
            ? null
            : Number(storedPrice);
        const sourceKey = `nesting-edge:${keyPart(requirement.materialNumber)}`;
        const item = {
            id: sourceKey,
            sourceKey,
            source: "nesting",
            category: "Kanten",
            name: `Kante ${material?.name || requirement.materialNumber}`,
            sku: material?.edgeArticleNumber || "",
            description: [
                `Material ${requirement.materialNumber}`,
                `Grundbedarf ${roundUpToCentimeter(baseRequiredMeters)} m`,
                `${wastePercentage} % Verschnitt`,
                `Standardmenge ${purchaseLength} m`
            ].join(" · "),
            baseRequiredMeters,
            requiredMeters,
            wastePercentage,
            purchaseLength,
            pricePerMeter: Number.isFinite(pricePerMeter) ? pricePerMeter : null,
            quantityMode: "meter",
            quantity: 0,
            unit: "m",
            netPrice: null,
            supplierId: supplier?.id || null,
            supplierName: supplier?.name || "",
            purchased: false,
            purchasedAt: null,
            released: false
        };

        return applyEdgeQuantityMode(item, "meter");
    });
};

const collectLegraboxColors = cabinetData => {
    const colorsById = new Map();
    const stack = Array.isArray(cabinetData) ? [...cabinetData] : [];

    while (stack.length > 0) {
        const value = stack.pop();
        if (!value || typeof value !== "object") continue;

        if (value.type === "legrabox" && value.id) {
            colorsById.set(value.id, value.materialColor === "gray" ? "gray" : "white");
        }

        for (const child of Object.values(value)) {
            if (child && typeof child === "object") stack.push(child);
        }
    }

    return colorsById;
};

export const buildHardwareItems = (partList = [], shopSettings = DEFAULT_SHOP_SETTINGS, catalogArticles = [], cabinetData = []) => {
    const grouped = new Map();
    const normalizedSettings = normalizeShopSettings(shopSettings);
    const cabinetColorsById = collectLegraboxColors(cabinetData);
    const articlesById = new Map(
        (Array.isArray(catalogArticles) ? catalogArticles : []).map(article => [article.id, article])
    );

    for (const group of Array.isArray(partList) ? partList : []) {
        const cabinetQuantity = toPositiveNumber(group?.Anzahl);

        for (const hardware of Array.isArray(group?.Hardware) ? group.Hardware : []) {
            const name = hardware?.name || hardware?.type || "Beschlag";
            const variant = String(hardware?.variant || "M").toUpperCase();
            const materialColor = (hardware?.materialColor ?? cabinetColorsById.get(hardware?.id)) === "gray" ? "gray" : "white";
            const mappedArticleId = normalizedSettings.legraboxArticleIds?.[variant]?.[materialColor] || "";
            const mappedArticle = articlesById.get(mappedArticleId);
            const supplier = resolveSupplier(mappedArticle?.supplierId, normalizedSettings);
            const detailParts = [
                variant,
                materialColor === "gray" ? "Grau" : "Weiß",
                hardware?.drawerDepth ? `${hardware.drawerDepth} mm` : null
            ].filter(Boolean);
            const sourceKey = [
                "hardware",
                keyPart(hardware?.type || name),
                keyPart(variant),
                keyPart(materialColor),
                keyPart(hardware?.drawerDepth)
            ].join(":");
            const quantity = toPositiveNumber(hardware?.Anzahl, cabinetQuantity);
            const current = grouped.get(sourceKey);

            if (current) {
                current.quantity += quantity;
                continue;
            }

            grouped.set(sourceKey, {
                id: sourceKey,
                sourceKey,
                source: "hardware",
                category: "Hardware",
                name,
                sku: mappedArticle?.sku || "",
                articleId: mappedArticleId || null,
                description: detailParts.join(" · "),
                quantity,
                unit: "Stk.",
                netPrice: mappedArticle?.netPrice !== null && mappedArticle?.netPrice !== "" && mappedArticle?.netPrice !== undefined && Number.isFinite(Number(mappedArticle.netPrice))
                    ? Number(mappedArticle.netPrice)
                    : null,
                supplierId: supplier?.id || null,
                supplierName: supplier?.name || "",
                purchased: false,
                purchasedAt: null,
                released: false
            });
        }
    }

    return [...grouped.values()];
};

/** Baut den aktuellen Procurement-Entwurf aus allen Projektquellen auf. */
export const buildGeneratedProcurementItems = ({
    nesting = [],
    partList = [],
    cabinetData = [],
    storageMaterials = [],
    shopSettings = DEFAULT_SHOP_SETTINGS,
    catalogArticles = []
} = {}) => [
    ...buildPlateItems(nesting, storageMaterials, shopSettings),
    ...buildEdgeItems(nesting, storageMaterials, shopSettings),
    ...buildHardwareItems(partList, shopSettings, catalogArticles, cabinetData)
];

export const mergeGeneratedItems = (generatedItems, savedItems = []) => {
    const savedByKey = new Map(
        (Array.isArray(savedItems) ? savedItems : [])
            .filter(item => item?.sourceKey)
            .map(item => [item.sourceKey, item])
    );
    const generatedKeys = new Set(generatedItems.map(item => item.sourceKey));
    const mergedGenerated = generatedItems.map(item => {
        const saved = savedByKey.get(item.sourceKey);
        const locked = Boolean(saved?.released || saved?.purchased);
        const merged = saved
            ? {
                ...item,
                netPrice: locked || saved.priceManuallyEdited
                    ? saved.netPrice
                    : item.netPrice ?? saved.netPrice,
                pricePerMeter: locked || saved.priceManuallyEdited
                    ? saved.pricePerMeter
                    : item.pricePerMeter ?? saved.pricePerMeter,
                quantity: locked || saved.quantityManuallyEdited
                    ? saved.quantity
                    : item.quantity,
                purchased: Boolean(saved.purchased),
                purchasedAt: saved.purchasedAt ?? null,
                released: Boolean(saved.released) && !saved.purchased
            }
            : item;

        if (item.category === "Kanten" && saved?.quantityMode) {
            if (locked) {
                return {
                    ...merged,
                    quantityMode: saved.quantityMode,
                    quantity: saved.quantity,
                    unit: saved.unit ?? merged.unit,
                    netPrice: saved.netPrice,
                    pricePerMeter: saved.pricePerMeter
                };
            }

            const converted = applyEdgeQuantityMode(merged, saved.quantityMode);
            return {
                ...converted,
                quantity: saved.quantityManuallyEdited
                    ? saved.quantity
                    : converted.quantity,
                netPrice: saved.priceManuallyEdited
                    ? saved.netPrice
                    : converted.netPrice ?? saved.netPrice
            };
        }

        return merged;
    });
    const retainedSavedItems = (Array.isArray(savedItems) ? savedItems : [])
        .filter(item => (
            item?.source === "shop"
            || item?.source === "manual"
            || item?.purchased
            || item?.released
        ) && !generatedKeys.has(item.sourceKey));

    return [...mergedGenerated, ...retainedSavedItems];
};

export const addArticleToProcurement = (items, article, quantity = 1) => {
    const amount = toPositiveNumber(quantity);
    const baseSourceKey = `shop:${article.id}`;
    const existing = items.find(item => item.sourceKey === baseSourceKey && !item.purchased);

    if (existing) {
        return items.map(item => item.sourceKey === baseSourceKey
            ? { ...item, quantity: toPositiveNumber(item.quantity) + amount }
            : item);
    }

    const sourceKey = items.some(item => item.sourceKey === baseSourceKey)
        ? `${baseSourceKey}:${Date.now()}`
        : baseSourceKey;

    return [...items, {
        id: sourceKey,
        sourceKey,
        articleId: article.id,
        source: "shop",
        category: article.category || "Sonstiges",
        name: article.name,
        sku: article.sku || "",
        description: article.description || "",
        quantity: amount,
        unit: article.unit || "Stk.",
        netPrice: Number.isFinite(Number(article.netPrice)) ? Number(article.netPrice) : null,
        supplierId: article.supplierId || null,
        supplierName: article.supplierName || "",
        purchased: false,
        purchasedAt: null,
        released: false
    }];
};

export const createManualProcurementItem = values => {
    const id = createUuid();
    const sourceKey = `manual:${id}`;
    const rawPrice = values?.netPrice;
    const parsedPrice = rawPrice === "" || rawPrice === null || rawPrice === undefined
        ? null
        : Number(rawPrice);
    const netPrice = Number.isFinite(parsedPrice) ? Math.max(0, parsedPrice) : null;

    return {
        id: sourceKey,
        sourceKey,
        source: "manual",
        category: "Manuell",
        name: String(values?.name || "").trim(),
        sku: String(values?.sku || "").trim(),
        description: "Einmaliger Projektartikel",
        quantity: toPositiveNumber(values?.quantity),
        quantityMode: "piece",
        unit: "Stk.",
        netPrice,
        supplierId: null,
        supplierName: "",
        quantityManuallyEdited: true,
        priceManuallyEdited: true,
        purchased: false,
        purchasedAt: null,
        released: Boolean(values?.released) && netPrice !== null
    };
};

export const createProcurementPayload = items => ({
    version: 1,
    updatedAt: new Date().toISOString(),
    items
});

export const createCatalogPayload = (articles, groups = []) => ({
    version: 1,
    updatedAt: new Date().toISOString(),
    articles,
    groups
});
