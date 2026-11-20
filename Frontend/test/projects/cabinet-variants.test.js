import { describe, expect, it } from "vitest";
import { DEFAULT_CABINET } from "@Engine/cabinet/cabinetDefaults.js";
import { buildPartList } from "@Engine/cabinet/partList/buildPartList.js";
import {
    compactCabinetVariantsForSave,
    expandCabinetVariants,
    getCabinetVariantCount,
    resizeCabinetVariantGroup
} from "../../src/features/projects/cabinet/workspace/cabinetVariants.js";

const baseCabinet = {
    ...DEFAULT_CABINET,
    id: "cabinet-1",
    name: "Unterschrank",
    materialId: "material-1"
};

describe("linked cabinet variants", () => {
    it("spawns real linked cabinets when the quantity is increased", () => {
        const result = resizeCabinetVariantGroup([baseCabinet], baseCabinet.id, 3);

        expect(result.cabinets).toHaveLength(3);
        expect(new Set(result.cabinets.map(cabinet => cabinet.id)).size).toBe(3);
        expect(new Set(result.cabinets.map(cabinet => cabinet.linkedCabinetGroupId)).size).toBe(1);
        expect(result.cabinets.every(cabinet => cabinet.quantity === 1)).toBe(true);
        expect(getCabinetVariantCount(result.cabinets[1], result.cabinets)).toBe(3);
    });

    it("compacts identical variants and keeps differing variants as linked records", () => {
        const spawned = resizeCabinetVariantGroup([baseCabinet], baseCabinet.id, 3).cabinets;
        const identical = compactCabinetVariantsForSave(spawned);

        expect(identical).toHaveLength(1);
        expect(identical[0].quantity).toBe(3);
        const reExpanded = expandCabinetVariants(identical);
        expect(reExpanded).toHaveLength(3);
        expect(reExpanded.map(cabinet => cabinet.id)).toEqual(spawned.map(cabinet => cabinet.id));

        const different = spawned.map((cabinet, index) => index === 1
            ? { ...cabinet, fronts: [{ id: "different-front", width: 480, height: 700 }] }
            : cabinet);
        const compacted = compactCabinetVariantsForSave(different);

        expect(compacted).toHaveLength(2);
        expect(compacted.map(cabinet => cabinet.quantity).sort()).toEqual([1, 2]);
        expect(compacted.every(cabinet => cabinet.linkedCabinetIds.length === 1)).toBe(true);
    });

    it("keeps variant parts in one cabinet group while separating different geometry", async () => {
        const variants = resizeCabinetVariantGroup([baseCabinet], baseCabinet.id, 3).cabinets
            .map((cabinet, index) => index === 2 ? { ...cabinet, width: 700 } : cabinet);
        const partList = await buildPartList(variants, []);

        expect(partList).toHaveLength(1);
        expect(partList[0].Objektname).toBe("Unterschrank");
        expect(partList[0].Anzahl).toBe(3);
        expect(partList[0].Children.some(part => Number(part.L) === 562 && Number(part.Anzahl) === 4)).toBe(true);
        expect(partList[0].Children.some(part => Number(part.L) === 662 && Number(part.Anzahl) === 2)).toBe(true);
    });
});
