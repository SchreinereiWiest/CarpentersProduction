import { describe, expect, it } from "vitest";
import { normaliseDxf, parseDxf } from "../../src/pages/projects/aufmas/import/dxf.js";

const dxf = `0
SECTION
2
ENTITIES
0
LINE
10
0
20
0
11
1000
21
0
0
LWPOLYLINE
70
1
10
0
20
0
10
0
20
500
10
1000
20
500
0
ENDSEC
0
EOF`;

describe("Aufmaß DXF parser", () => {
    it("liefert nur Knoten mit mindestens drei verbundenen Linien", () => {
        const result = parseDxf(dxf);

        expect(result.shapes).toHaveLength(4);
        expect(result.snapPoints).toHaveLength(1);
        expect(result.snapPoints[0].connections).toBe(3);
        expect(result.snapStats).toMatchObject({ candidates: 4, eligible: 1, rendered: 1, minConnections: 3, truncated: false });
        expect(result.bounds).toMatchObject({ minX: 0, maxX: 1000, minY: 0, maxY: 500 });
        expect(result.snapPoints.every(point => point.x >= 0 && point.x <= 1000)).toBe(true);
        expect(result.snapPoints.every(point => point.y >= 0 && point.y <= 650)).toBe(true);
    });

    it("lässt den Mindestgrad gezielt absenken", () => {
        const result = parseDxf(dxf, { minConnections: 2 });

        expect(result.snapPoints).toHaveLength(3);
        expect(result.snapPoints.every(point => point.connections >= 2)).toBe(true);
    });

    it("begrenzt sehr große Fangpunktmengen", () => {
        const shapes = Array.from({ length: 620 }, (_, index) => {
            const x = index * 10;
            return [
                { type: "line", x1: x, y1: 0, x2: x - 2, y2: 4 },
                { type: "line", x1: x, y1: 0, x2: x + 2, y2: 4 },
                { type: "line", x1: x, y1: 0, x2: x, y2: -4 }
            ];
        }).flat();
        const result = normaliseDxf(shapes);

        expect(result.snapPoints).toHaveLength(500);
        expect(result.snapStats).toMatchObject({ eligible: 620, rendered: 500, truncated: true });
    });
});
