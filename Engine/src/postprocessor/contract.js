export const POSTPROCESSOR_API_VERSION = 1;

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
