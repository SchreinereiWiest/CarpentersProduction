import { POSTPROCESSOR_API_VERSION } from "../contract.js";

const strategy = (id, label, operationTypes, description) => ({ id, label, operationTypes, description });

export const legacyViewerBridge = {
    manifest: {
        id: "legacy-viewer-bridge",
        name: "CNC Viewer · Legacy Bridge",
        version: "1.0.0",
        apiVersion: POSTPROCESSOR_API_VERSION,
        description: "Bindet die vorhandenen CNC-Operationen an das neue Postprozessor-System an.",
        vendor: "CarpentersProduction",
        capabilities: {
            viewer: true,
            machineCode: false,
            machiningResolution: true
        },
        supportedMachiningStrategies: [
            strategy("connector.drill", "Bohrverbinder", ["BO", "VB", "VBH"], "Klassische horizontale und vertikale Verbinderbohrungen."),
            strategy("connector.clamex", "Clamex", ["CLAMEX"], "Semantischer Endpunkt; benötigt einen Maschinenadapter mit Clamex-Unterstützung."),
            strategy("connector.screw", "Spax", ["BO"], "Bohrbild für geschraubte Korpusverbindungen."),
            strategy("shelf.row", "Fachboden-Lochreihe", ["BO"], "Bohrungen oder Lochreihen für Fachböden."),
            strategy("drawer.legrabox", "Legrabox", ["BO", "VBH"], "Bearbeitungen für Legrabox-Auszüge."),
            strategy("back.groove", "Rückwandnut", ["RNT", "NUT8"], "Nutbearbeitung für Rückwände."),
            strategy("back.rabbet", "Rückwandfalz", ["XG0", "XL2P"], "Falzbearbeitung für Rückwände.")
        ],
        configuration: [
            { key: "machineName", label: "Maschinenname", type: "text", defaultValue: "CNC 1", required: true },
            { key: "coordinateOrigin", label: "Werkstücknullpunkt", type: "select", defaultValue: "bottom-left", options: [
                { value: "bottom-left", label: "Unten links" },
                { value: "top-left", label: "Oben links" },
                { value: "center", label: "Mitte" }
            ] },
            { key: "flipYAxis", label: "Y-Achse spiegeln", type: "boolean", defaultValue: false },
            { key: "safeHeight", label: "Sicherheitshöhe", type: "number", unit: "mm", min: 0, defaultValue: 20 },
            { key: "operationAliases", label: "Operations-Aliase", type: "json", defaultValue: {} }
        ]
    },

    translateForViewer({ part }) {
        return {
            operations: Array.isArray(part?.CNC?.operations) ? part.CNC.operations : [],
            diagnostics: []
        };
    },

    generateMachineCode() {
        return {
            supported: false,
            code: null,
            diagnostics: [{
                level: "warning",
                code: "MACHINE_ADAPTER_REQUIRED",
                message: "Der Legacy Bridge erzeugt keinen ausführbaren Maschinencode. Dafür muss ein maschinenspezifisches Plugin registriert werden."
            }]
        };
    },

    resolveMachining({ intent, assignments = {} }) {
        const assignment = assignments[intent];
        const supported = this.manifest.supportedMachiningStrategies.some(item => item.id === assignment?.strategyId);
        return {
            intent,
            supported,
            assignment: supported ? assignment : null,
            diagnostics: supported ? [] : [{
                level: "error",
                code: "UNSUPPORTED_MACHINING_STRATEGY",
                message: `Die Bearbeitung ${assignment?.strategyId ?? intent} wird von diesem Postprozessor nicht unterstützt.`
            }]
        };
    }
};
