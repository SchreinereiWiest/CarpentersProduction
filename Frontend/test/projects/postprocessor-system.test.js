import { describe, expect, it } from "vitest";
import {
    AVAILABLE_POSTPROCESSORS,
    createPluginConfiguration,
    generateCncMachineCode,
    getUsedMachiningStrategies,
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
            apiVersion: 1,
            capabilities: {
                viewer: true,
                machineCode: false,
                machiningResolution: true
            }
        });
        expect(instance.configuration).toMatchObject({
            machineName: "CNC 1",
            coordinateOrigin: "bottom-left",
            safeHeight: 20
        });
    });

    it("exposes the existing viewer operations through the new endpoint", () => {
        const operations = [{ id: "op-1", type: "BO", x: 20, y: 40 }];
        expect(translatePartForCncViewer(instance, {
            part: { CNC: { operations } }
        })).toEqual({ operations, diagnostics: [] });
    });

    it("does not claim to create executable code without a machine adapter", () => {
        const result = generateCncMachineCode(instance, { part: {} });
        expect(result.supported).toBe(false);
        expect(result.code).toBeNull();
        expect(result.diagnostics[0].code).toBe("MACHINE_ADAPTER_REQUIRED");
    });

    it("validates machining assignments against plugin capabilities", () => {
        expect(resolveCncMachining(instance, {
            intent: "cornerJoint",
            assignments: { cornerJoint: { strategyId: "connector.clamex" } }
        })).toMatchObject({ supported: true, assignment: { strategyId: "connector.clamex" } });

        expect(resolveCncMachining(instance, {
            intent: "cornerJoint",
            assignments: { cornerJoint: { strategyId: "proprietary.unknown" } }
        })).toMatchObject({ supported: false, assignment: null });
    });

    it("shows only supported strategies that are actually assigned", () => {
        expect(getUsedMachiningStrategies({
            cornerJoint: { strategyId: "connector.clamex" },
            shelfSupport: { strategyId: "shelf.row" },
            unused: { strategyId: "not.available" }
        }, descriptor.supportedMachiningStrategies).map(strategy => strategy.id)).toEqual([
            "connector.clamex",
            "shelf.row"
        ]);
    });

    it("rejects incomplete plugins at registration time", () => {
        expect(() => validatePostprocessorPlugin({
            manifest: { id: "broken", name: "Broken", apiVersion: 1 }
        })).toThrow(/translateForViewer/);
    });
});
