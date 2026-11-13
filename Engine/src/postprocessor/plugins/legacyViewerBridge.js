import { POSTPROCESSOR_API_VERSION } from "../contract.js";
import { MACHINING_KINDS, translateNeutralPartForViewer } from "../machiningModel.js";
import { DEFAULT_MACHINING_LOCATIONS, resolveProgramHeader } from "../programHeader.js";

const strategy = (id, label, operationKinds, description) => ({ id, label, operationKinds, description });

export const legacyViewerBridge = {
    manifest: {
        id: "legacy-viewer-bridge",
        name: "CNC Viewer · Legacy Bridge",
        version: "2.0.0",
        apiVersion: POSTPROCESSOR_API_VERSION,
        description: "Bindet die vorhandenen CNC-Operationen an das neue Postprozessor-System an.",
        vendor: "CarpentersProduction",
        capabilities: {
            viewer: true,
            machineCode: false,
            machiningResolution: true
        },
        machiningLocations: DEFAULT_MACHINING_LOCATIONS,
        supportedMachiningStrategies: [
            strategy("connector.drill", "Bohrverbinder", [MACHINING_KINDS.DRILL_POINT, MACHINING_KINDS.DRILL_PATTERN, MACHINING_KINDS.DRILL_LINEAR_PATTERN, MACHINING_KINDS.DRILL_EDGE_PATTERN], "Klassische horizontale und vertikale Verbinderbohrungen."),
            strategy("connector.clamex", "Clamex", [MACHINING_KINDS.MILL_PATH], "Semantischer Endpunkt; benötigt einen Maschinenadapter mit Clamex-Unterstützung."),
            strategy("connector.screw", "Spax", [MACHINING_KINDS.DRILL_POINT, MACHINING_KINDS.DRILL_LINEAR_PATTERN], "Bohrbild für geschraubte Korpusverbindungen."),
            strategy("shelf.row", "Fachboden-Lochreihe", [MACHINING_KINDS.DRILL_ROW], "Bohrungen oder Lochreihen für Fachböden."),
            strategy("drawer.legrabox", "Legrabox", [MACHINING_KINDS.DRILL_POINT, MACHINING_KINDS.DRILL_PATTERN], "Bearbeitungen für Legrabox-Auszüge."),
            strategy("front.drawerMount", "Schubkastenfront", [MACHINING_KINDS.DRILL_POINT], "Befestigungsbohrungen an Schubkastenfronten."),
            strategy("front.hingeCup", "Topfband", [MACHINING_KINDS.DRILL_POINT], "Topfbohrungen in Türfronten."),
            strategy("front.hingeAuxiliary", "Topfband-Nebenbohrung", [MACHINING_KINDS.DRILL_POINT], "Nebenbohrungen in Türfronten."),
            strategy("cabinet.hingePlate", "Topfband-Montageplatte", [MACHINING_KINDS.DRILL_POINT], "Montageplattenbohrungen im Korpus."),
            strategy("back.groove", "Rückwandnut", [MACHINING_KINDS.MILL_GROOVE], "Nutbearbeitung für Rückwände."),
            strategy("back.rabbet", "Rückwandfalz", [MACHINING_KINDS.MILL_PATH], "Falzbearbeitung für Rückwände."),
            strategy("manual.drilling", "Manuelles Bohren", [MACHINING_KINDS.DRILL_POINT, MACHINING_KINDS.DRILL_PATTERN, MACHINING_KINDS.DRILL_LINEAR_PATTERN, MACHINING_KINDS.DRILL_EDGE_PATTERN, MACHINING_KINDS.DRILL_ROW], "Manuell eingefügte Bohrbearbeitungen."),
            strategy("manual.groove", "Manuelle Nut", [MACHINING_KINDS.MILL_GROOVE], "Manuell eingefügte Nutbearbeitungen."),
            strategy("manual.milling", "Manuelles Fräsen", [MACHINING_KINDS.MILL_PATH], "Manuell eingefügte Fräsbewegungen.")
        ],
        configuration: []
    },

    translateForViewer({ part }) {
        return translateNeutralPartForViewer(part);
    },

    resolveProgramHeader({ part }) {
        return resolveProgramHeader({ manifest: this.manifest, part, defaultStopId: "A" });
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
