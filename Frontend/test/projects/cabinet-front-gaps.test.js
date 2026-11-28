import { describe, expect, it } from "vitest";
import { applyFrontGaps, getFrontGapContext } from "@Engine/cabinet/sektions/front/frontGaps.js";

describe("individual front gaps", () => {
    const cabinet = {
        width: 600,
        height: 720,
        fronts: [{
            id: "parent",
            x: 0,
            y: 0,
            width: 600,
            height: 720,
            children: [
                { id: "left", x: 0, y: 0, width: 298.5, height: 720, children: [] },
                { id: "right", x: 301.5, y: 0, width: 298.5, height: 720, children: [] }
            ]
        }]
    };

    it("derives outer and neighboring gaps for nested leaf fronts", () => {
        expect(getFrontGapContext(cabinet.fronts, "left", cabinet).gaps).toEqual({
            left: 0,
            right: 3,
            top: 0,
            bottom: 0
        });
    });

    it("recalculates the selected front from its four edited gaps", () => {
        const result = applyFrontGaps({
            cabinet,
            frontId: "left",
            gaps: { left: 5, right: 10, top: 4, bottom: 6 }
        });

        expect(result.changed).toBe(true);
        expect(result.front).toMatchObject({
            x: 5,
            y: 4,
            width: 286.5,
            height: 710,
            gapLeft: 5,
            gapRight: 10,
            gapTop: 4,
            gapBottom: 6
        });
    });
});
