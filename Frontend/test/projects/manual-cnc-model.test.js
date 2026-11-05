import { describe, expect, it } from "vitest";

import { MACHINING_INTENT_IDS, MACHINING_KINDS } from "@Engine/postprocessor/index.js";
import {
    CNC_MACRO_DEFINITIONS,
    MANUAL_TOOL_GROUPS,
    createCompensatedMillingPaths,
    createMacroOperations,
    createManualOperation,
    findPartById,
    getAvailableCncMacros,
    insertFilletAfter,
    insertOperationAfter,
    insertOperationsAfter,
    updatePartById,
    updatePartByKey
} from "../../src/features/projects/cnc/editor/manualCncModel.js";

const line = (id, start, target) => ({
    id,
    kind: MACHINING_KINDS.MILL_PATH,
    intentId: MACHINING_INTENT_IDS.MANUAL_MILLING,
    face: "A",
    motion: "linear",
    start: { ...start, z: 8 },
    target: { ...target, z: 8 },
    compensation: "left",
    toolId: "router-8"
});

describe("manual CNC model", () => {
    it("finds and immutably updates a nested part", () => {
        const list = [{ PID: "cabinet", Children: [{ PID: "part-1", Objektname: "Seite" }] }];
        expect(findPartById(list, "part-1")?.Objektname).toBe("Seite");

        const updated = updatePartById(list, "part-1", part => ({ ...part, manual: true }));
        expect(findPartById(updated, "part-1")?.manual).toBe(true);
        expect(findPartById(list, "part-1")?.manual).toBeUndefined();
    });

    it("updates duplicate PIDs through the cabinet-independent part key", () => {
        const list = [
            { PID: "1", _cabinetId: "cabinet-a", _generatedId: "cabinet-a:part:3" },
            { PID: "1", _cabinetId: "cabinet-b", _generatedId: "cabinet-b:part:3" }
        ];
        const updated = updatePartByKey(list, "part:3", "cabinet-b", part => ({ ...part, changed: true }));
        expect(updated[0].changed).toBeUndefined();
        expect(updated[1].changed).toBe(true);
    });

    it("inserts a new operation after the persistent selection", () => {
        expect(insertOperationAfter([{ id: "a" }, { id: "b" }], "a", { id: "new" }).map(item => item.id)).toEqual(["a", "new", "b"]);
        expect(insertOperationsAfter([{ id: "a" }, { id: "b" }], "a", [{ id: "first" }, { id: "second" }]).map(item => item.id)).toEqual(["a", "first", "second", "b"]);
    });

    it("offers only macros supported by the active postprocessor assignment", () => {
        const macros = getAvailableCncMacros({
            descriptor: { supportedMachiningStrategies: [{ id: "connector.drill" }] },
            assignments: { [MACHINING_INTENT_IDS.JOINT_CONNECTOR]: { strategyId: "connector.drill" } }
        });
        expect(macros.map(macro => macro.id)).toEqual(["macro.connectorRow", "macro.connectorEdge"]);
        expect(CNC_MACRO_DEFINITIONS.length).toBeGreaterThan(macros.length);
    });

    it("creates parameter-driven VB and Legrabox macro groups", () => {
        const part = { L: 700, B: 560, T: 19 };
        const tools = [{ id: "drill-5", category: "drilling", diameter: 5 }];
        const connector = createMacroOperations({ macroId: "macro.connectorRow", values: { x: 210 }, part, tools });
        expect(connector[0]).toMatchObject({
            intentId: MACHINING_INTENT_IDS.JOINT_CONNECTOR,
            x: 210,
            positions: [50, 280, 510],
            count: 3
        });

        const legrabox = createMacroOperations({ macroId: "macro.legrabox", values: { x: 125 }, part, tools });
        expect(legrabox).toHaveLength(2);
        expect(legrabox[0]).toMatchObject({ x: 125, y: 37, rows: 2, stepY: 32 });
        expect(legrabox[1]).toMatchObject({ x: 125, y: 192, rows: 3, stepY: 32 });
    });

    it("converts the Legra front input from the lowest hole to configured group offsets", () => {
        const part = { L: 600, B: 200, T: 19 };
        const base = createMacroOperations({
            macroId: "macro.frontDrawer",
            values: { firstHoleFromBottom: 72, variant: "M" },
            part
        });
        expect(base).toHaveLength(2);
        expect(base[0]).toMatchObject({ x: 33, y: 128 });
        expect(base[0].source).toMatchObject({ boxPositionFromBottom: 59, groupOffsetFromFirstHole: 0 });

        const variantC = createMacroOperations({
            macroId: "macro.frontDrawer",
            values: { firstHoleFromBottom: 72, variant: "C" },
            part
        });
        expect(variantC).toHaveLength(4);
        expect(variantC.map(operation => operation.y)).toEqual([128, 128, 36, 36]);
        expect(variantC[2].source.groupOffsetFromFirstHole).toBe(92);
    });

    it("creates a tangent radius between two adjacent milling lines", () => {
        const result = insertFilletAfter([
            line("first", { x: 0, y: 100 }, { x: 100, y: 100 }),
            line("second", { x: 100, y: 100 }, { x: 100, y: 200 })
        ], "first", 10);

        expect(result.operations).toHaveLength(3);
        expect(result.operations[0].target).toMatchObject({ x: 90, y: 100, z: 8 });
        expect(result.operation).toMatchObject({
            kind: MACHINING_KINDS.MILL_PATH,
            motion: "arc",
            radius: 10,
            direction: "clockwise",
            start: { x: 90, y: 100, z: 8 },
            target: { x: 100, y: 110, z: 8 },
            center: { x: 90, y: 110, z: 8 },
            compensation: "left",
            toolId: "router-8"
        });
        expect(result.operations[2].start).toMatchObject({ x: 100, y: 110, z: 8 });
    });

    it("rejects a radius without two connected straight paths", () => {
        expect(() => insertFilletAfter([line("first", { x: 0, y: 0 }, { x: 100, y: 0 })], "first", 10)).toThrow(/direkt folgende Gerade/);
    });

    it("inherits cutter compensation and tool from the previous milling path", () => {
        const operation = createManualOperation({
            tool: MANUAL_TOOL_GROUPS.find(group => group.id === "milling").tools.find(tool => tool.id === "mill.line"),
            part: { L: 500, B: 300, T: 19 },
            tools: [{ id: "router-12", category: "milling", diameter: 12 }],
            previousOperation: {
                kind: MACHINING_KINDS.MILL_PATH,
                motion: "linear",
                target: { x: 100, y: 80, z: 8 },
                compensation: "right",
                toolId: "router-12"
            }
        });

        expect(operation).toMatchObject({
            start: { x: 100, y: 80, z: 8 },
            compensation: "right",
            toolId: "router-12"
        });
    });

    it("calculates the visible cutter-center path for line and arc compensation", () => {
        const paths = createCompensatedMillingPaths([
            line("line", { x: 0, y: 100 }, { x: 100, y: 100 }),
            {
                id: "arc",
                kind: MACHINING_KINDS.MILL_PATH,
                motion: "arc",
                face: "A",
                start: { x: 90, y: 100, z: 8 },
                target: { x: 100, y: 110, z: 8 },
                center: { x: 90, y: 110, z: 8 },
                radius: 10,
                direction: "clockwise",
                compensation: "left",
                toolId: "router-8"
            }
        ], [{ id: "router-8", category: "milling", diameter: 10 }]);

        expect(paths[0]).toMatchObject({ type: "line", start: { x: 0, y: 95 }, target: { x: 100, y: 95 } });
        expect(paths[1]).toMatchObject({ type: "arc", radius: 15, start: { x: 90, y: 95 }, target: { x: 105, y: 110 } });
    });
});
