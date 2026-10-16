import { describe, expect, it } from "vitest";
import { clampCanvasPan, getPlacedObjectSnapPoints, panForPinchAnchor, rectangleFromPoints } from "../../src/pages/projects/aufmas/aufmasGeometry.project.js";

describe("Aufmaß object geometry", () => {
    it("creates a normalised cabinet selection rectangle from opposite corners", () => {
        expect(rectangleFromPoints({ x: 180, y: 120 }, { x: 40, y: 260 })).toEqual({
            x: 40,
            y: 120,
            width: 140,
            height: 140
        });
    });

    it("uses placed installation points as snap points", () => {
        const points = getPlacedObjectSnapPoints([
            { id: "point-1", kind: "point", points: [{ x: 120, y: 240 }] },
            { id: "measure-1", kind: "measurement", points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] },
            { id: "invalid", kind: "point", points: [] }
        ]);

        expect(points).toEqual([{ x: 120, y: 240, source: "placed-point", sourceObjectId: "point-1" }]);
    });

    it("turns all four cabinet rectangle corners into snap points", () => {
        const points = getPlacedObjectSnapPoints([{
            id: "cabinet-link-1",
            kind: "cabinet",
            points: [{ x: 80, y: 40 }, { x: 20, y: 100 }]
        }]);

        expect(points.map(({ x, y }) => [x, y])).toEqual([
            [20, 40], [80, 40], [80, 100], [20, 100]
        ]);
        expect(points.every(point => point.source === "cabinet-corner")).toBe(true);
    });

    it("limits panning to the visible canvas bounds", () => {
        expect(clampCanvasPan({ x: 900, y: -900 }, 2, 1000, 650)).toEqual({ x: 250, y: -162.5 });
        expect(clampCanvasPan({ x: 100, y: 100 }, 1, 1000, 650)).toEqual({ x: 0, y: 0 });
    });

    it("keeps the touched drawing position below the moving pinch midpoint", () => {
        expect(panForPinchAnchor({
            anchor: { x: 500, y: 325 },
            clientPoint: { x: 600, y: 325 },
            rect: { left: 0, top: 0, width: 1000, height: 650 },
            zoom: 2,
            canvasWidth: 1000,
            canvasHeight: 650
        })).toEqual({ x: -50, y: 0 });
    });
});
