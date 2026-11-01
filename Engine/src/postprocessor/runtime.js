import { getPostprocessorPlugin } from "./availablePostprocessors.js";
import { PostprocessorContractError } from "./contract.js";

const load = instance => {
    const plugin = getPostprocessorPlugin(instance?.pluginId);
    if (!plugin) {
        throw new PostprocessorContractError(`Postprozessor ${instance?.pluginId ?? "unbekannt"} ist nicht registriert.`);
    }
    return plugin;
};

const context = (instance, payload) => ({
    ...payload,
    postprocessor: {
        instanceId: instance.id,
        pluginId: instance.pluginId,
        name: instance.name,
        configuration: instance.configuration ?? {}
    }
});

// Diese API bildet die späteren Endpunkte für Partlist, Viewer und Export.
// Noch kein bestehender Partlist-Aufruf wird automatisch umgeleitet.
export const translatePartForCncViewer = (instance, payload) =>
    load(instance).translateForViewer(context(instance, payload));

export const generateCncMachineCode = (instance, payload) =>
    load(instance).generateMachineCode(context(instance, payload));

export const resolveCncMachining = (instance, payload) =>
    load(instance).resolveMachining(context(instance, payload));
