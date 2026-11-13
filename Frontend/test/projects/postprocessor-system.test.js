import { describe, expect, it } from "vitest";
import {
    AVAILABLE_POSTPROCESSORS,
    MACHINING_INTENT_IDS,
    MACHINING_KINDS,
    createPluginConfiguration,
    generateCncMachineCode,
    getUsedMachiningStrategies,
    resolveCncProgramHeader,
    resolveCncMachining,
    translatePartForCncViewer,
    validatePostprocessorPlugin
} from "@Engine/postprocessor/index.js";

describe("modular CNC postprocessor system", () => {
    const descriptor = AVAILABLE_POSTPROCESSORS.find(item => item.id === "legacy-viewer-bridge");
    const instance = {
        id: "machine-1",
        pluginId: descriptor.id,
        name: "Werkstatt CNC",
        configuration: createPluginConfiguration({ manifest: descriptor })
    };

    it("publishes serializable plugin metadata and default configuration", () => {
        expect(descriptor).toMatchObject({
            apiVersion: 3,
            capabilities: {
                viewer: true,
                machineCode: false,
                machiningResolution: true
            }
        });
        expect(instance.configuration).toEqual({});
        expect(descriptor.machiningLocations).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: "A", anchorCorner: "top-left", mirrorAxes: { x: false, y: false } }),
            expect.objectContaining({ id: "D", anchorCorner: "top-right", mirrorAxes: { x: true, y: false } })
        ]));
    });

    it("exposes the existing viewer operations through the new endpoint", () => {
        const operations = [{
            id: "op-1",
            kind: MACHINING_KINDS.DRILL_POINT,
            intentId: MACHINING_INTENT_IDS.JOINT_CONNECTOR,
            face: "A",
            x: 20,
            y: 40,
            diameter: 5,
            depth: 10
        }];
        expect(translatePartForCncViewer(instance, {
            part: {
                CNC: {
                    version: 2,
                    coordinateSystem: {
                        unit: "mm",
                        origin: "top-left",
                        xAxis: "right",
                        yAxis: "down",
                        depthDirection: "into-material"
                    },
                    operations
                }
            }
        })).toEqual({
            operations: [expect.objectContaining({ id: "op-1", type: "BO" })],
            diagnostics: []
        });
    });

    it("does not claim to create executable code without a machine adapter", () => {
        const result = generateCncMachineCode(instance, { part: {} });
        expect(result.supported).toBe(false);
        expect(result.code).toBeNull();
        expect(result.diagnostics[0].code).toBe("MACHINE_ADAPTER_REQUIRED");
    });

    it("resolves fixed stop mirrors separately from additional SX and SY mirrors", () => {
        expect(resolveCncProgramHeader(instance, {
            part: { CNC: { header: { stopId: "D", edgeAtStop: "back", sx: true, sy: false } } }
        })).toMatchObject({
            stopId: "D",
            anchorCorner: "top-right",
            machineMirrorX: true,
            machineMirrorY: true,
            displayMirrorX: false,
            displayMirrorY: true,
            sx: true,
            sy: false
        });
    });

    it("validates machining assignments against plugin capabilities", () => {
        expect(resolveCncMachining(instance, {
            intent: MACHINING_INTENT_IDS.JOINT_CONNECTOR,
            assignments: { [MACHINING_INTENT_IDS.JOINT_CONNECTOR]: { strategyId: "connector.clamex" } }
        })).toMatchObject({ supported: true, assignment: { strategyId: "connector.clamex" } });

        expect(resolveCncMachining(instance, {
            intent: MACHINING_INTENT_IDS.JOINT_CONNECTOR,
            assignments: { [MACHINING_INTENT_IDS.JOINT_CONNECTOR]: { strategyId: "proprietary.unknown" } }
        })).toMatchObject({ supported: false, assignment: null });
    });

    it("shows only supported strategies that are actually assigned", () => {
        expect(getUsedMachiningStrategies({
            [MACHINING_INTENT_IDS.JOINT_CONNECTOR]: { strategyId: "connector.clamex" },
            [MACHINING_INTENT_IDS.SHELF_PIN_ROW]: { strategyId: "shelf.row" },
            unused: { strategyId: "not.available" }
        }, descriptor.supportedMachiningStrategies).map(strategy => strategy.id)).toEqual([
            "connector.clamex",
            "shelf.row"
        ]);
    });

    it("rejects incomplete plugins at registration time", () => {
        expect(() => validatePostprocessorPlugin({
            manifest: { id: "broken", name: "Broken", apiVersion: 3 }
        })).toThrow(/translateForViewer/);
    });
});
