import { getPostprocessorPlugin } from "./availablePostprocessors.js";
import { PostprocessorContractError } from "./contract.js";
import { MACHINING_SCHEMA_VERSION } from "./machiningModel.js";

const load = instance => {
    if (instance?.enabled === false) {
        throw new PostprocessorContractError(`Postprozessor ${instance?.pluginId ?? "unbekannt"} ist deaktiviert.`);
    }
    const plugin = getPostprocessorPlugin(instance?.pluginId);
    if (!plugin) {
        throw new PostprocessorContractError(`Postprozessor ${instance?.pluginId ?? "unbekannt"} ist nicht registriert.`);
    }
    return plugin;
};

const context = (instance, payload) => ({
    ...payload,
    machiningSchemaVersion: MACHINING_SCHEMA_VERSION,
    postprocessor: {
        instanceId: instance.id,
        pluginId: instance.pluginId,
        name: instance.name,
        configuration: instance.configuration ?? {}
    }
});

// Diese API bildet die Endpunkte für Partlist, Viewer und Export.
// Der CNC-Editor nutzt generateCncMachineCode für konfigurierte Maschinenexporte.
export const translatePartForCncViewer = (instance, payload) =>
    load(instance).translateForViewer(context(instance, payload));

export const resolveCncProgramHeader = (instance, payload) =>
    load(instance).resolveProgramHeader(context(instance, payload));

export const generateCncMachineCode = (instance, payload) => {
    const plugin = load(instance);
    const pluginContext = context(instance, payload);
    const requestedFace = ["A", "B"].includes(String(payload?.face ?? "").toUpperCase())
        ? String(payload.face).toUpperCase()
        : null;
    const operationMatchesFace = operation => {
        if (!requestedFace) return true;
        const operationFace = String(operation?.face ?? "A").toUpperCase();
        return operationFace === requestedFace || operationFace === "BOTH";
    };
    const operations = (payload?.part?.CNC?.operations ?? []).filter(operationMatchesFace);
    const intents = [...new Set(
        operations
            .map(operation => operation.intentId)
            .filter(Boolean)
    )];
    const resolvedMachining = Object.fromEntries(intents.map(intent => [
        intent,
        plugin.resolveMachining({ ...pluginContext, intent })
    ]));
    const diagnostics = Object.entries(resolvedMachining)
        .flatMap(([intentId, resolution]) => {
            const affectedOperations = operations.filter(operation => operation.intentId === intentId);
            return (resolution.diagnostics ?? []).map(entry => ({
                ...entry,
                intentId,
                operationId: affectedOperations.length === 1
                    ? affectedOperations[0].id ?? null
                    : null,
                operationIds: affectedOperations.map(operation => operation.id).filter(Boolean)
            }));
        })
        .filter(entry => entry.level === "error");

    if (diagnostics.length > 0) {
        return { supported: false, code: null, diagnostics, resolvedMachining };
    }

    return plugin.generateMachineCode({
        ...pluginContext,
        resolvedMachining
    });
};

export const resolveCncMachining = (instance, payload) =>
    load(instance).resolveMachining(context(instance, payload));
