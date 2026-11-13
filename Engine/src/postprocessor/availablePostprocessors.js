import { getPostprocessorDescriptor, validatePostprocessorPlugin } from "./contract.js";
import { legacyViewerBridge } from "./plugins/legacyViewerBridge.js";
import { xilog3Routolink } from "./plugins/xilog3Routolink.js";

// Neue Postprozessoren werden als eigenständige Plugins importiert und nur hier registriert.
const plugins = [legacyViewerBridge, xilog3Routolink].map(validatePostprocessorPlugin);

const byId = new Map(plugins.map(plugin => [plugin.manifest.id, plugin]));

export const AVAILABLE_POSTPROCESSORS = Object.freeze(plugins.map(getPostprocessorDescriptor));

export const getPostprocessorPlugin = pluginId => byId.get(pluginId) ?? null;
