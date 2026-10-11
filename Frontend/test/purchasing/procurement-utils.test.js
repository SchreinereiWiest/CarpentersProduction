import { describe, expect, it } from "vitest";
import {
    addArticleToProcurement,
    buildHardwareItems,
    buildPlateItems,
    mergeGeneratedItems,
    normalizeCatalog
} from "../../src/pages/purchasing/procurementUtils.js";

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

    it("keeps release and price while refreshing generated quantities", () => {
        const generated = [{ sourceKey: "nesting:a", source: "nesting", quantity: 3, netPrice: null, released: false }];
        const saved = [
            { sourceKey: "nesting:a", source: "nesting", quantity: 1, netPrice: 42, released: true },
            { sourceKey: "shop:x", source: "shop", quantity: 4, released: false }
        ];

        expect(mergeGeneratedItems(generated, saved)).toEqual([
            { sourceKey: "nesting:a", source: "nesting", quantity: 3, netPrice: 42, released: true },
            { sourceKey: "shop:x", source: "shop", quantity: 4, released: false }
        ]);
    });

    it("adds a shop article once and increments its quantity", () => {
        const article = { id: "x", name: "Schraube", unit: "Stk.", netPrice: 0.25 };
        const first = addArticleToProcurement([], article, 5);
        const second = addArticleToProcurement(first, article, 3);

        expect(second).toHaveLength(1);
        expect(second[0]).toMatchObject({ sourceKey: "shop:x", quantity: 8, netPrice: 0.25 });
    });
});
