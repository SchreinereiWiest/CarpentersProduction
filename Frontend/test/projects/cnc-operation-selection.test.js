import { describe, expect, it } from "vitest";

import { resolveCncOperationSelection } from "../../src/features/projects/cnc/viewer/cncOperationSelection.js";

describe("CNC viewer operation selection", () => {
    const operations = [
        { id: "drill-1", type: "BO", x: 40, y: 30 },
        { type: "RNT", x: 0, y: 12, endX: 300 }
    ];

    it("resolves an operation id emitted by the SVG to the assigned operation", () => {
        expect(resolveCncOperationSelection(operations, "drill-1")).toBe(operations[0]);
        expect(resolveCncOperationSelection(operations, "operation-1")).toBe(operations[1]);
    });

    it("keeps the operation object emitted by the properties list", () => {
        expect(resolveCncOperationSelection(operations, operations[0])).toBe(operations[0]);
    });
});
