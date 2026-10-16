import { describe, expect, it } from "vitest";
import { applyDxfTransform, createDxfTransform } from "../../src/pages/projects/aufmas/aufmasAlignment.project.js";

describe("DXF/PDF alignment", () => {
    it("maps both DXF calibration points exactly onto their PDF partners", () => {
        const dxfFirst = { x: 100, y: 100 };
        const dxfSecond = { x: 300, y: 100 };
        const pdfFirst = { x: 250, y: 180 };
        const pdfSecond = { x: 250, y: 580 };
        const transform = createDxfTransform(pdfFirst, pdfSecond, dxfFirst, dxfSecond);

        expect(transform.scale).toBeCloseTo(2);
        expect(transform.rotation).toBeCloseTo(90);
        const mappedFirst = applyDxfTransform(dxfFirst, transform);
        const mappedSecond = applyDxfTransform(dxfSecond, transform);
        expect(mappedFirst.x).toBeCloseTo(pdfFirst.x);
        expect(mappedFirst.y).toBeCloseTo(pdfFirst.y);
        expect(mappedSecond.x).toBeCloseTo(pdfSecond.x);
        expect(mappedSecond.y).toBeCloseTo(pdfSecond.y);
    });

    it("rejects identical calibration points", () => {
        expect(createDxfTransform({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 5 }, { x: 5, y: 5 })).toBeNull();
    });
});
