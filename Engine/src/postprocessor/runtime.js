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

// Diese API bildet die Endpunkte für Partlist, Viewer und Export.
// Der CNC-Editor nutzt generateCncMachineCode für konfigurierte Maschinenexporte.
export const translatePartForCncViewer = (instance, payload) =>
    load(instance).translateForViewer(context(instance, payload));

export const generateCncMachineCode = (instance, payload) =>
    load(instance).generateMachineCode(context(instance, payload));

export const resolveCncMachining = (instance, payload) =>
    load(instance).resolveMachining(context(instance, payload));
