import { describe, expect, it } from "vitest";
import {
    addArticleToProcurement,
    applyEdgeQuantityMode,
    buildEdgeItems,
    buildHardwareItems,
    buildPlateItems,
    createManualProcurementItem,
    mergeGeneratedItems,
    normalizeCatalog
} from "@Engine/procurement/procurement.js";

describe("procurement data", () => {
    it("keeps old catalogs compatible and accepts article groups", () => {
        expect(normalizeCatalog({ articles: [{ id: "a" }] })).toMatchObject({ groups: [] });
        expect(normalizeCatalog({ articles: [], groups: [{ id: "g", name: "Legrabox M" }] }).groups).toHaveLength(1);
    });

    it("groups used nesting sheets by material and size", () => {
        const items = buildPlateItems([{
            MID: "W1000",
            T: 19,
            settings: { defaultSheet: { width: 2800, height: 2070 } },
            nestingPlates: [
                { placedWidth: 2800, placedHeight: 2070, strips: [{}] },
                { placedWidth: 2800, placedHeight: 2070, plates: [{}] },
                { placedWidth: 2800, placedHeight: 2070, strips: [], plates: [] }
            ]
        }]);

        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({
            source: "nesting",
            sku: "W1000",
            quantity: 2,
            description: "2800 × 2070 × 19 mm"
        });
    });

    it("prefills the sheet price from the storage square-meter price", () => {
        const items = buildPlateItems([{
            MID: "W1000",
            T: 19,
            nestingPlates: [{ placedWidth: 2800, placedHeight: 2070, strips: [{}] }]
        }], [{
            materialNumber: "W1000",
            thickness: 19,
            width: 2800,
            height: 2070,
            pricePerSquareMeter: "10.00"
        }]);

        expect(items[0].netPrice).toBe(57.96);
    });

    it("creates edge purchases with waste, article data and meter pricing", () => {
        const items = buildEdgeItems([
            {
                MID: "W1000",
                T: 19,
                plates: [{
                    width: 1000,
                    height: 500,
                    EdgeT: "6f41a980-74bf-4e5e-b622-5f04767d8080",
                    EdgeR: "W1000"
                }]
            },
            {
                MID: "W1000",
                T: 25,
                plates: [{ width: 500, height: 800, EdgeB: "W1000" }]
            }
        ], [{
            id: "6f41a980-74bf-4e5e-b622-5f04767d8080",
            materialNumber: "W1000",
            name: "Premiumweiß",
            edgeArticleNumber: "K-W1000",
            edgePricePerMeter: "0.80",
            edgePurchaseLength: 75,
            supplierId: "supplier-1"
        }], {
            edgeWastePercentage: 10,
            suppliers: [{ id: "supplier-1", name: "Kanten GmbH" }]
        });

        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({
            sourceKey: "nesting-edge:k-w1000",
            category: "Kanten",
            sku: "K-W1000",
            baseRequiredMeters: 2,
            requiredMeters: 2.2,
            quantity: 2.2,
            quantityMode: "meter",
            unit: "m",
            netPrice: 0.8,
            supplierName: "Kanten GmbH"
        });
    });

    it("rounds edge purchases up to complete standard rolls in piece mode", () => {
        const item = {
            category: "Kanten",
            requiredMeters: 76,
            purchaseLength: 75,
            pricePerMeter: 0.8,
            quantity: 76,
            unit: "m"
        };

        expect(applyEdgeQuantityMode(item, "piece")).toMatchObject({
            quantityMode: "piece",
            quantity: 2,
            unit: "Stk.",
            netPrice: 60
        });
    });

    it("keeps the selected edge unit while refreshing an open purchase", () => {
        const generated = [{
            sourceKey: "nesting-edge:w1000",
            source: "nesting",
            category: "Kanten",
            requiredMeters: 80,
            purchaseLength: 75,
            pricePerMeter: 1,
            quantityMode: "meter",
            quantity: 80,
            unit: "m",
            netPrice: 1,
            released: false
        }];
        const saved = [{
            ...generated[0],
            quantityMode: "piece",
            quantity: 1,
            unit: "Stk.",
            netPrice: 75
        }];

        expect(mergeGeneratedItems(generated, saved)[0]).toMatchObject({
            quantityMode: "piece",
            quantity: 2,
            unit: "Stk.",
            netPrice: 75
        });
    });

    it("collects hardware and respects the cabinet quantity", () => {
        const items = buildHardwareItems([
            { Anzahl: 2, Hardware: [{ type: "legrabox", name: "Legrabox 1", variant: "M", drawerDepth: 500 }] },
            { Anzahl: 1, Hardware: [{ type: "legrabox", name: "Legrabox 1", variant: "M", drawerDepth: 500 }] }
        ]);

        expect(items).toHaveLength(1);
        expect(items[0].quantity).toBe(3);
    });

    it("maps Legrabox color and variant to a catalog article", () => {
        const items = buildHardwareItems(
            [{ Anzahl: 1, Hardware: [{ type: "legrabox", variant: "K", materialColor: "gray", drawerDepth: 500 }] }],
            { legraboxArticleIds: { K: { gray: "article-k-gray" } } },
            [{ id: "article-k-gray", name: "Legrabox K grau", sku: "BL-4711", netPrice: 82.5 }]
        );

        expect(items[0]).toMatchObject({
            articleId: "article-k-gray",
            sku: "BL-4711",
            netPrice: 82.5,
            description: "K · Grau · 500 mm"
        });
    });

    it("reads the color from cabinet data for older part lists", () => {
        const items = buildHardwareItems(
            [{ Hardware: [{ id: "drawer-1", type: "legrabox", variant: "M", drawerDepth: 500 }] }],
            { legraboxArticleIds: { M: { gray: "article-m-gray" } } },
            [{ id: "article-m-gray", sku: "GRAY-M", netPrice: 90 }],
            [{ sections: [{ functionConfig: [{ id: "drawer-1", type: "legrabox", materialColor: "gray" }] }] }]
        );

        expect(items[0]).toMatchObject({ sku: "GRAY-M", description: "M · Grau · 500 mm" });
    });

    it("freezes price and quantity after release", () => {
        const generated = [{ sourceKey: "nesting:a", source: "nesting", quantity: 3, netPrice: 55, released: false }];
        const saved = [
            { sourceKey: "nesting:a", source: "nesting", quantity: 1, netPrice: 42, released: true },
            { sourceKey: "shop:x", source: "shop", quantity: 4, released: false }
        ];

        expect(mergeGeneratedItems(generated, saved)).toEqual([
            { sourceKey: "nesting:a", source: "nesting", quantity: 1, netPrice: 42, pricePerMeter: undefined, purchased: false, purchasedAt: null, released: true },
            { sourceKey: "shop:x", source: "shop", quantity: 4, released: false }
        ]);
    });

    it("uses live prices before release and keeps explicit manual prices", () => {
        const generated = [{ sourceKey: "nesting:a", source: "nesting", quantity: 3, netPrice: 55, released: false }];

        expect(mergeGeneratedItems(generated, [{
            sourceKey: "nesting:a", source: "nesting", quantity: 1, netPrice: 42, released: false
        }])[0]).toMatchObject({ quantity: 3, netPrice: 55, released: false });

        expect(mergeGeneratedItems(generated, [{
            sourceKey: "nesting:a", source: "nesting", quantity: 1, netPrice: 42,
            priceManuallyEdited: true, released: false
        }])[0]).toMatchObject({ quantity: 3, netPrice: 42, released: false });
    });

    it("retains a released position when its generating source changes", () => {
        const released = {
            sourceKey: "nesting:old", source: "nesting", quantity: 1,
            netPrice: 42, released: true, purchased: false
        };

        expect(mergeGeneratedItems([], [released])).toEqual([released]);
    });

    it("keeps a missing released price empty instead of taking a later catalog price", () => {
        const generated = [{
            sourceKey: "nesting:a", source: "nesting", quantity: 2,
            netPrice: 55, released: false
        }];
        const released = [{
            sourceKey: "nesting:a", source: "nesting", quantity: 1,
            netPrice: null, released: true
        }];

        expect(mergeGeneratedItems(generated, released)[0]).toMatchObject({
            quantity: 1,
            netPrice: null,
            released: true
        });
    });

    it("adds a shop article once and increments its quantity", () => {
        const article = { id: "x", name: "Schraube", unit: "Stk.", netPrice: 0.25 };
        const first = addArticleToProcurement([], article, 5);
        const second = addArticleToProcurement(first, article, 3);

        expect(second).toHaveLength(1);
        expect(second[0]).toMatchObject({ sourceKey: "shop:x", quantity: 8, netPrice: 0.25 });
    });

    it("creates a one-time manual project article without a shop reference", () => {
        const item = createManualProcurementItem({
            name: "  Sonderbeschlag  ",
            sku: " SB-42 ",
            quantity: "3",
            netPrice: "12.50",
            released: true
        });

        expect(item).toMatchObject({
            source: "manual",
            category: "Manuell",
            name: "Sonderbeschlag",
            sku: "SB-42",
            quantity: 3,
            netPrice: 12.5,
            released: true
        });
        expect(item.sourceKey).toMatch(/^manual:/);
        expect(item).not.toHaveProperty("articleId");
    });

    it("retains an unreleased manual article when generated project data is refreshed", () => {
        const manual = createManualProcurementItem({
            name: "Einmalartikel",
            quantity: 1,
            netPrice: 5,
            released: false
        });

        expect(mergeGeneratedItems([], [manual])).toEqual([manual]);
    });

    it("assigns configured suppliers to storage sheets and shop hardware", () => {
        const settings = {
            suppliers: [{ id: "supplier-1", name: "Häfele" }],
            legraboxArticleIds: { M: { white: "article-m" } }
        };
        const plates = buildPlateItems(
            [{ MID: "W1000", T: 19, nestingPlates: [{ placedWidth: 2800, placedHeight: 2070, strips: [{}] }] }],
            [{ materialNumber: "W1000", thickness: 19, width: 2800, height: 2070, supplierId: "supplier-1" }],
            settings
        );
        const hardware = buildHardwareItems(
            [{ Hardware: [{ type: "legrabox", variant: "M", materialColor: "white" }] }],
            settings,
            [{ id: "article-m", name: "Legrabox M", supplierId: "supplier-1" }]
        );

        expect(plates[0]).toMatchObject({ supplierId: "supplier-1", supplierName: "Häfele" });
        expect(hardware[0]).toMatchObject({ supplierId: "supplier-1", supplierName: "Häfele" });
    });

    it("keeps purchased items locked and creates a new line when reordered", () => {
        const purchased = [{
            sourceKey: "shop:x",
            source: "shop",
            articleId: "x",
            name: "Schraube",
            quantity: 2,
            purchased: true,
            purchasedAt: "2026-10-11T10:00:00.000Z",
            released: false
        }];
        const result = addArticleToProcurement(purchased, { id: "x", name: "Schraube" }, 3);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(purchased[0]);
        expect(result[1]).toMatchObject({ quantity: 3, purchased: false, released: false });
        expect(result[1].sourceKey).toMatch(/^shop:x:/);
    });

    it("retains purchased generated positions when their source list changes", () => {
        const purchasedPlate = {
            sourceKey: "nesting:old",
            source: "nesting",
            name: "Alte Platte",
            quantity: 1,
            purchased: true,
            released: false
        };

        expect(mergeGeneratedItems([], [purchasedPlate])).toEqual([purchasedPlate]);
    });
});
