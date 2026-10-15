import { describe, expect, it } from "vitest";
import { calculateEdgeRequirements } from "../../src/pages/projects/nesting/edgeRequirements.js";

describe("Kantenbedarf im Nesting", () => {
    it("summiert ein Plattenmaterial unabhaengig von seiner Staerke", () => {
        const sheets = [
            {
                MID: "PL-01",
                T: 19,
                plates: [{
                    width: 600,
                    height: 800,
                    EdgeT: "K-1",
                    EdgeB: "K-1",
                    EdgeL: "K-2",
                    EdgeR: ""
                }]
            },
            {
                MID: "pl-01",
                T: 25,
                plates: [{
                    originalWidth: 1000,
                    originalHeight: 500,
                    width: 1004,
                    height: 504,
                    EdgeT: "K-1",
                    EdgeR: "K-2"
                }]
            },
            {
                MID: "PL-02",
                T: 19,
                plates: [{ width: 2000, height: 1000, EdgeT: "K-1" }]
            }
        ];

        expect(calculateEdgeRequirements(sheets, "PL-01")).toEqual({
            totalMeters: 3.5,
            byEdgeMaterial: [
                { materialNumber: "K-1", meters: 2.2 },
                { materialNumber: "K-2", meters: 1.3 }
            ]
        });
    });

    it("ignoriert leere und als Standardmaterial markierte Kanten", () => {
        const result = calculateEdgeRequirements([{
            MID: "PL-01",
            plates: [{
                original: { B: "600,5", L: 800, ETID: "K-1", ERID: "Standardmaterial" },
                EdgeT: undefined,
                EdgeR: undefined
            }]
        }], "PL-01");

        expect(result.totalMeters).toBeCloseTo(0.6005);
        expect(result.byEdgeMaterial).toEqual([
            { materialNumber: "K-1", meters: 0.6005 }
        ]);
    });

    it("kann den Kantenbedarf aller Plattenmaterialien gemeinsam liefern", () => {
        const result = calculateEdgeRequirements([
            { MID: "A", plates: [{ width: 1000, height: 500, EdgeT: "K-1" }] },
            { MID: "B", plates: [{ width: 600, height: 700, EdgeB: "K-1", EdgeR: "K-2" }] }
        ]);

        expect(result).toEqual({
            totalMeters: 2.3,
            byEdgeMaterial: [
                { materialNumber: "K-1", meters: 1.6 },
                { materialNumber: "K-2", meters: 0.7 }
            ]
        });
    });

    it("loest Material-IDs zur Kantennummer auf und fasst gleiche Nummern zusammen", () => {
        const result = calculateEdgeRequirements([{
            MID: "A",
            plates: [
                { width: 1000, height: 500, EdgeT: "6f41a980-74bf-4e5e-b622-5f04767d8080" },
                { width: 600, height: 700, EdgeB: "K-100" }
            ]
        }], undefined, [{
            id: "6f41a980-74bf-4e5e-b622-5f04767d8080",
            materialNumber: "K-100",
            edgeArticleNumber: "K-EDGE-100"
        }]);

        expect(result.byEdgeMaterial).toEqual([
            { materialNumber: "K-EDGE-100", meters: 1.6 }
        ]);
    });
});
