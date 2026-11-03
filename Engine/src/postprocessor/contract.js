import { MACHINING_KINDS } from "./machiningModel.js";

export const POSTPROCESSOR_API_VERSION = 2;

export const POSTPROCESSOR_CAPABILITIES = Object.freeze({
    VIEWER: "viewer",
    MACHINE_CODE: "machineCode",
    MACHINING_RESOLUTION: "machiningResolution"
});

export class PostprocessorContractError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = "PostprocessorContractError";
        this.details = details;
    }
}

const requiredMethods = ["translateForViewer", "generateMachineCode", "resolveMachining"];

export const validatePostprocessorPlugin = plugin => {
    if (!plugin?.manifest?.id || !plugin?.manifest?.name) {
        throw new PostprocessorContractError("Postprozessor benötigt manifest.id und manifest.name.");
    }
    if (plugin.manifest.apiVersion !== POSTPROCESSOR_API_VERSION) {
        throw new PostprocessorContractError(`Nicht unterstützte Postprozessor-API: ${plugin.manifest.apiVersion}.`, {
            pluginId: plugin.manifest.id,
            expected: POSTPROCESSOR_API_VERSION
        });
    }
    requiredMethods.forEach(method => {
        if (typeof plugin[method] !== "function") {
            throw new PostprocessorContractError(`Postprozessor ${plugin.manifest.id} implementiert ${method} nicht.`);
        }
    });
    const strategies = plugin.manifest.supportedMachiningStrategies ?? [];
    const strategyIds = new Set();
    const supportedKinds = new Set(Object.values(MACHINING_KINDS));
    strategies.forEach(strategy => {
        if (!strategy?.id || strategyIds.has(strategy.id)) {
            throw new PostprocessorContractError(`Postprozessor ${plugin.manifest.id} enthält eine fehlende oder doppelte Strategie-ID.`);
        }
        strategyIds.add(strategy.id);
        (strategy.operationKinds ?? []).forEach(kind => {
            if (!supportedKinds.has(kind)) {
                throw new PostprocessorContractError(`Strategie ${strategy.id} verwendet die unbekannte Bearbeitungsart ${kind}.`);
            }
        });
    });
    return plugin;
};

export const createPluginConfiguration = plugin => Object.fromEntries(
    (plugin.manifest.configuration ?? []).map(field => [field.key, structuredClone(field.defaultValue)])
);

export const getPostprocessorDescriptor = plugin => ({
    ...plugin.manifest,
    configuration: plugin.manifest.configuration ?? [],
    supportedMachiningStrategies: plugin.manifest.supportedMachiningStrategies ?? []
});
