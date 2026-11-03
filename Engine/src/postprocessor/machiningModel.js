export const MACHINING_SCHEMA_VERSION = 2;

export const MACHINING_KINDS = Object.freeze({
    DRILL_POINT: "drill.point",
    DRILL_PATTERN: "drill.pattern",
    DRILL_LINEAR_PATTERN: "drill.linearPattern",
    DRILL_EDGE_PATTERN: "drill.edgePattern",
    DRILL_ROW: "drill.row",
    MILL_GROOVE: "mill.groove",
    MILL_PATH: "mill.path"
});

export const MACHINING_INTENT_IDS = Object.freeze({
    JOINT_CONNECTOR: "joint.connector",
    JOINT_SCREW: "joint.screw",
    SHELF_PIN_ROW: "shelf.pinRow",
    DRAWER_LEGRABOX: "drawer.legrabox",
    FRONT_DRAWER_MOUNT: "front.drawerMount",
    FRONT_HINGE_CUP: "front.hingeCup",
    FRONT_HINGE_AUXILIARY: "front.hingeAuxiliary",
    CABINET_HINGE_PLATE: "cabinet.hingePlate",
    BACK_GROOVE: "back.groove",
    BACK_RABBET: "back.rabbet"
});

const kinds = new Set(Object.values(MACHINING_KINDS));
const intents = new Set(Object.values(MACHINING_INTENT_IDS));

export const assertNeutralMachiningOperation = operation => {
    if (!kinds.has(operation?.kind)) {
        throw new TypeError(`Unbekannte neutrale Bearbeitungsart: ${operation?.kind ?? "nicht gesetzt"}`);
    }
    if (!intents.has(operation?.intentId)) {
        throw new TypeError(`Unbekannter Bearbeitungsendpunkt: ${operation?.intentId ?? "nicht gesetzt"}`);
    }
    if (operation.type !== undefined) {
        throw new TypeError("Neutrale Bearbeitungen dürfen keinen proprietären type-Code enthalten.");
    }
    return operation;
};

export const assertNeutralPartCnc = part => {
    const cnc = part?.CNC;
    if (cnc?.version !== MACHINING_SCHEMA_VERSION) {
        throw new TypeError(`Nicht unterstützte CNC-Schemaversion: ${cnc?.version ?? "nicht gesetzt"}`);
    }
    if (
        cnc.coordinateSystem?.unit !== "mm" ||
        cnc.coordinateSystem?.origin !== "top-left" ||
        cnc.coordinateSystem?.xAxis !== "right" ||
        cnc.coordinateSystem?.yAxis !== "down" ||
        cnc.coordinateSystem?.depthDirection !== "into-material"
    ) {
        throw new TypeError("Das CNC-Koordinatensystem entspricht nicht dem neutralen Schema.");
    }
    (cnc.operations ?? []).forEach(assertNeutralMachiningOperation);
    return cnc;
};

const viewerType = operation => {
    switch (operation.kind) {
        case MACHINING_KINDS.DRILL_POINT:
        case MACHINING_KINDS.DRILL_PATTERN:
            return "BO";
        case MACHINING_KINDS.DRILL_LINEAR_PATTERN:
            return "VB";
        case MACHINING_KINDS.DRILL_EDGE_PATTERN:
            return "VBH";
        case MACHINING_KINDS.DRILL_ROW:
            return "LR";
        case MACHINING_KINDS.MILL_GROOVE:
            return "RNT";
        case MACHINING_KINDS.MILL_PATH:
            return operation.motion === "rapid" ? "XG0" : "XL2P";
        default:
            return null;
    }
};

// Viewer-Operationen sind ein reines Darstellungsformat. Diese Übersetzung
// hält die alten React-Zeichenkomponenten von der neutralen Fertigungsstruktur fern.
export const neutralOperationToViewer = operation => {
    assertNeutralMachiningOperation(operation);
    const type = viewerType(operation);
    if (!type) return null;

    if (operation.kind === MACHINING_KINDS.DRILL_PATTERN) {
        return {
            ...operation,
            type,
            R: operation.count,
            XOffset: operation.stepX,
            YOffset: operation.stepY
        };
    }

    if (operation.kind === MACHINING_KINDS.DRILL_LINEAR_PATTERN) {
        return {
            ...operation,
            type,
            position: operation.x,
            rowStart: operation.y
        };
    }

    if (operation.kind === MACHINING_KINDS.DRILL_EDGE_PATTERN) {
        return {
            ...operation,
            type,
            side: operation.edge
        };
    }

    if (operation.kind === MACHINING_KINDS.DRILL_ROW) {
        return {
            ...operation,
            type,
            frontOffset: operation.crossPositions?.[0],
            backOffset: operation.crossPositions?.[1] ?? operation.crossPositions?.[0]
        };
    }

    if (operation.kind === MACHINING_KINDS.MILL_GROOVE) {
        return {
            ...operation,
            type,
            x: operation.start?.x,
            y: operation.start?.y,
            z: operation.start?.z,
            endX: operation.end?.x
        };
    }

    if (operation.kind === MACHINING_KINDS.MILL_PATH) {
        return operation.motion === "rapid"
            ? {
                ...operation,
                type,
                x: operation.target?.x,
                y: operation.target?.y,
                z: operation.target?.z
            }
            : {
                ...operation,
                type,
                startX: operation.start?.x,
                startY: operation.start?.y,
                endX: operation.target?.x,
                endY: operation.target?.y,
                z: operation.target?.z
            };
    }

    return { ...operation, type };
};

export const translateNeutralPartForViewer = part => ({
    operations: assertNeutralPartCnc(part).operations
        .map(neutralOperationToViewer)
        .filter(Boolean),
    diagnostics: []
});
