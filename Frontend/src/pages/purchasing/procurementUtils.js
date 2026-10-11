const toPositiveNumber = (value, fallback = 1) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const keyPart = value => encodeURIComponent(String(value ?? "").trim().toLowerCase());
const createUuid = () => {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
        const random = Math.floor(Math.random() * 16);
        const value = character === "x" ? random : (random & 0x3) | 0x8;
        return value.toString(16);
    });
};

export const LEGRABOX_VARIANTS = ["M", "K", "C", "L"];
export const LEGRABOX_COLORS = ["white", "gray"];

export const DEFAULT_SHOP_SETTINGS = {
    version: 1,
    suppliers: [],
    legraboxArticleIds: Object.fromEntries(
        LEGRABOX_VARIANTS.map(variant => [variant, { white: "", gray: "" }])
    )
};

export const normalizeShopSettings = data => {
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

export const mergeGeneratedItems = (generatedItems, savedItems = []) => {
    const savedByKey = new Map(
        (Array.isArray(savedItems) ? savedItems : [])
            .filter(item => item?.sourceKey)
            .map(item => [item.sourceKey, item])
    );
    const generatedKeys = new Set(generatedItems.map(item => item.sourceKey));
    const mergedGenerated = generatedItems.map(item => {
        const saved = savedByKey.get(item.sourceKey);
        return saved
            ? {
                ...item,
                netPrice: saved.netPrice ?? item.netPrice,
                quantity: saved.purchased ? saved.quantity : item.quantity,
                purchased: Boolean(saved.purchased),
                purchasedAt: saved.purchasedAt ?? null,
                released: Boolean(saved.released) && !saved.purchased
            }
            : item;
    });
    const retainedSavedItems = (Array.isArray(savedItems) ? savedItems : [])
        .filter(item => (item?.source === "shop" || item?.purchased) && !generatedKeys.has(item.sourceKey));

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
