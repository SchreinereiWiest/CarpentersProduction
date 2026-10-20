import { describe, expect, it } from "vitest";
import {
    filterPartListByMaterial,
    replaceNestingMaterial
} from "../../src/features/projects/nesting/recalculateMaterial.js";

describe("materialbezogene Nesting-Neuberechnung", () => {
    it("filtert Einzelteile und Baugruppen nach Materialnummer und Stärke", () => {
        const partList = [
            { PID: "single-a", MID: "A", T: 19, Children: [] },
            { PID: "single-b", MID: "B", T: 19, Children: [] },
            {
                PID: "assembly",
                Children: [
                    { PID: "child-a", MID: "A", T: "19" },
                    { PID: "child-b", MID: "B", T: 19 }
                ]
            }
        ];

        expect(filterPartListByMaterial(partList, { MID: "A", T: 19 })).toEqual([
            { PID: "single-a", MID: "A", T: 19, Children: [] },
            {
                PID: "assembly",
                Children: [{ PID: "child-a", MID: "A", T: "19" }]
            }
        ]);
    });

    it("ersetzt nur das aktuell ausgewählte Material", () => {
        const first = { MID: "A", T: 19, nestingPlates: [{ id: "kept" }] };
        const second = { MID: "B", T: 25, nestingPlates: [{ id: "old" }] };
        const replacement = { MID: "B", T: 25, nestingPlates: [{ id: "new" }] };

        const result = replaceNestingMaterial([first, second], 1, replacement);

        expect(result).toEqual([first, replacement]);
        expect(result[0]).toBe(first);
    });
});
