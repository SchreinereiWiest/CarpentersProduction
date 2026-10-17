import { describe, expect, it } from "vitest";
import {
    evaluateMeasurementExpression,
    extractMeasurementVariables,
    resolveCabinetFunctionExpressions,
    resolveCabinetMeasurementExpressions
} from "../../src/features/projects/cabinet/measurementExpressions.js";

const variables = [
    { name: "RH", value: 2300, unit: "mm" },
    { name: "RB", value: 3100, unit: "mm" }
];

describe("cabinet measurement expressions", () => {
    it("calculates cabinet dimensions from Aufmaß variables", () => {
        expect(evaluateMeasurementExpression("RH-200", variables)).toMatchObject({ valid: true, value: 2100 });
        expect(evaluateMeasurementExpression("(RB - 100) / 2", variables)).toMatchObject({ valid: true, value: 1500 });
    });

    it("supports decimal commas and case-insensitive variable names", () => {
        expect(evaluateMeasurementExpression("rh - 12,5", variables)).toMatchObject({ valid: true, value: 2287.5 });
    });

    it("rejects unknown variables and unsafe expressions", () => {
        expect(evaluateMeasurementExpression("UNKNOWN + 10", variables).valid).toBe(false);
        expect(evaluateMeasurementExpression("window.alert(1)", variables).valid).toBe(false);
        expect(evaluateMeasurementExpression("RH / 0", variables).valid).toBe(false);
    });

    it("extracts named numeric links from aufmas.json", () => {
        const result = extractMeasurementVariables({ objects: [
            { variableName: "RH", value: "2300", unit: "mm", status: "measured", label: "Raumhöhe" },
            { variableName: "", value: "500" },
            { variableName: "BAD", value: "nicht gemessen" },
            { variableName: "WINKEL", value: "90", unit: "°" },
            { variableName: "NICHT-GÜLTIG", value: "800", unit: "mm" }
        ] });
        expect(result).toEqual([{ name: "RH", value: 2300, unit: "mm", status: "measured", label: "Raumhöhe" }]);
    });

    it("resolves persisted formulas into numeric cabinet dimensions", () => {
        expect(resolveCabinetMeasurementExpressions({
            width: 600,
            height: 720,
            measurementExpressions: { width: "RB-100", height: "RH-200" }
        }, variables)).toEqual({ width: 3000, height: 2100 });
    });

    it("resolves formulas in nested functionConfig values", () => {
        const cabinet = resolveCabinetFunctionExpressions({
            depth: 600,
            sections: [{
                id: "section-1",
                functionConfig: [{
                    id: "shelf-1",
                    type: "shelf",
                    shelfFrontOffset: 0,
                    holeRow: { spacing: 32 },
                    measurementExpressions: {
                        shelfDepth: "RH/4",
                        "holeRow.spacing": "RH/100"
                    }
                }]
            }]
        }, variables);
        expect(cabinet.sections[0].functionConfig[0]).toMatchObject({
            shelfFrontOffset: 25,
            holeRow: { spacing: 23 }
        });
    });

    it("recalculates middle wall and Legrabox function formulas", () => {
        const cabinet = resolveCabinetFunctionExpressions({
            sections: [{
                id: "section-1",
                functionConfig: [{
                    id: "wall-1",
                    type: "middleWall",
                    positionReference: "cabinetTop",
                    positionOffset: 100,
                    measurementExpressions: { "position.cabinetTop": "RH/2" }
                }],
                children: [{
                    id: "section-2",
                    functionConfig: [{
                        id: "drawer-1",
                        type: "legrabox",
                        positionFromBottom: 40,
                        doubling: { thickness: 0 },
                        measurementExpressions: {
                            positionFromBottom: "RH/10",
                            "doubling.thickness": "RB/100"
                        }
                    }]
                }]
            }]
        }, variables);
        expect(cabinet.sections[0].functionConfig[0]).toMatchObject({ positionOffset: 1150, absoluteOffset: 1150 });
        expect(cabinet.sections[0].children[0].functionConfig[0]).toMatchObject({
            positionFromBottom: 230,
            doubling: { thickness: 31 }
        });
    });
});
