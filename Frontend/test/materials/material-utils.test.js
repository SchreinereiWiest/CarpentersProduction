import { describe, expect, it } from "vitest";
import {
    getEdgeMaterials,
    hasEdgeMaterialData
} from "../../src/shared/materials/material-utils.js";


describe("edge material filtering", () => {
    it("does not treat the default roll length as an edge entry", () => {
        expect(hasEdgeMaterialData({ edgePurchaseLength: 75 })).toBe(false);
    });

    it("accepts every explicit kind of edge purchasing data", () => {
        expect(hasEdgeMaterialData({ edgeArticleNumber: "K-W1000" })).toBe(true);
        expect(hasEdgeMaterialData({ edgePricePerMeter: 0 })).toBe(true);
        expect(hasEdgeMaterialData({ edgePurchaseLength: 100 })).toBe(true);
        expect(hasEdgeMaterialData({ edgeSupplierId: "supplier-1" })).toBe(false);
    });

    it("returns only materials with edge data", () => {
        const materials = [
            { id: "plate-only", edgePurchaseLength: 75 },
            { id: "with-edge", edgeArticleNumber: "K-1", edgePurchaseLength: 75 }
        ];

        expect(getEdgeMaterials(materials).map(material => material.id)).toEqual(["with-edge"]);
    });
});
