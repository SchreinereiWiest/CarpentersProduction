import { describe, expect, it } from "vitest";
import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";
import { compileShelf } from "@Engine/cabinet/cnc/compiler/sections/operations/compileShelf.js";

const compile = centered => {
    const part = {
        L: 720,
        B: 535,
        T: 19,
        CNC: { operations: [] }
    };

    compileShelf({
        section: {
            id: "section-1",
            y: 20,
            height: 500
        },
        func: {
            id: "shelf-1",
            type: "shelf",
            compartmentCount: 2,
            holeRow: {
                spacing: 32,
                startFromBottom: 44,
                endFromTop: 53,
                centered
            }
        },
        boundary: { part, face: "A" },
        config: DEFAULT_CNC
    });

    return part.CNC.operations[0];
};

describe("mittige Lochreihe", () => {
    it("verteilt den Rasterrest gleichmäßig auf Anfang und Ende", () => {
        const operation = compile(true);
        const requestedStart = 20 + 53;
        const requestedEnd = 20 + 500 - 44;

        expect(operation.start).toBe(82.5);
        expect(operation.end).toBe(466.5);
        expect(operation.start - requestedStart).toBe(requestedEnd - operation.end);
        expect((operation.end - operation.start) / operation.spacing).toBe(12);
        expect(operation.source.centered).toBe(true);
    });

    it("verwendet ohne aktivierte Checkbox unverändert die angegebenen Grenzen", () => {
        const operation = compile(false);

        expect(operation.start).toBe(73);
        expect(operation.end).toBe(476);
        expect(operation.source.centered).toBe(false);
    });
});
