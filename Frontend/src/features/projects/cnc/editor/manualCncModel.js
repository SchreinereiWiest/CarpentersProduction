import { createStringId } from "@Engine/shared/id.js";
import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";
import { getDrawerFrontGroups } from "@Engine/cabinet/sektions/front/frontAttachments.js";
import {
    MACHINING_INTENT_IDS,
    MACHINING_KINDS,
    MACHINING_SCHEMA_VERSION
} from "@Engine/postprocessor/index.js";
import { getCncPartKey } from "@Engine/cabinet/cnc/manualPrograms.js";

export const MANUAL_TOOL_GROUPS = [
    {
        id: "drilling",
        label: "Bohren",
        tools: [
            { id: "drill.point", label: "Einzelbohrung", kind: MACHINING_KINDS.DRILL_POINT },
            { id: "drill.pattern", label: "Rasterbohrung", kind: MACHINING_KINDS.DRILL_PATTERN },
            { id: "drill.linearPattern", label: "Reihenbohrung", kind: MACHINING_KINDS.DRILL_LINEAR_PATTERN },
            { id: "drill.row", label: "Lochreihe", kind: MACHINING_KINDS.DRILL_ROW },
            { id: "drill.edgePattern", label: "Kantenbohrung", kind: MACHINING_KINDS.DRILL_EDGE_PATTERN }
        ]
    },
    {
        id: "milling",
        label: "Fräsen",
        tools: [
            { id: "mill.groove", label: "Nut", kind: MACHINING_KINDS.MILL_GROOVE },
            { id: "mill.rapid", label: "G0 Startpunkt", kind: MACHINING_KINDS.MILL_PATH, motion: "rapid" },
            { id: "mill.line", label: "Gerade fräsen", kind: MACHINING_KINDS.MILL_PATH, motion: "linear" },
            { id: "mill.radius", label: "Radius zwischen Bahnen", special: "fillet" }
        ]
    }
];

export const CNC_MACRO_DEFINITIONS = Object.freeze([
    {
        id: "macro.connectorRow",
        label: "VB-Verbinderreihe",
        description: "Standard-Verbinderreihe aus den Bearbeitungsparametern.",
        requiredIntents: [MACHINING_INTENT_IDS.JOINT_CONNECTOR],
        fields: [{ key: "x", label: "Position X", type: "number", unit: "mm" }]
    },
    {
        id: "macro.connectorEdge",
        label: "Horizontaler Verbinder",
        description: "Kantenbohrungen mit dem horizontalen Verbinderstandard.",
        requiredIntents: [MACHINING_INTENT_IDS.JOINT_CONNECTOR],
        fields: [{ key: "edge", label: "Bauteilkante", type: "select", options: [{ value: "left", label: "Links" }, { value: "right", label: "Rechts" }] }]
    },
    {
        id: "macro.screwRow",
        label: "Spax-Reihe",
        description: "Schraubenreihe aus den hinterlegten Bohrverbinderparametern.",
        requiredIntents: [MACHINING_INTENT_IDS.JOINT_SCREW],
        fields: [{ key: "x", label: "Position X", type: "number", unit: "mm" }]
    },
    {
        id: "macro.shelfRow",
        label: "Lochreihe",
        description: "Lochreihe mit Durchmesser, Tiefe und Querabständen aus den Parametern.",
        requiredIntents: [MACHINING_INTENT_IDS.SHELF_PIN_ROW],
        fields: [
            { key: "start", label: "Start X", type: "number", unit: "mm" },
            { key: "end", label: "Ende X", type: "number", unit: "mm" }
        ]
    },
    {
        id: "macro.legrabox",
        label: "Legrabox Korpus",
        description: "Beide Legrabox-Bohrgruppen; lediglich die X-Position wird benötigt.",
        requiredIntents: [MACHINING_INTENT_IDS.DRAWER_LEGRABOX],
        fields: [{ key: "x", label: "Position X", type: "number", unit: "mm" }]
    },
    {
        id: "macro.frontDrawer",
        label: "Legra-Front",
        description: "Frontbohrprogramm relativ zum tatsächlich untersten Bohrloch.",
        requiredIntents: [MACHINING_INTENT_IDS.FRONT_DRAWER_MOUNT],
        fields: [
            { key: "firstHoleFromBottom", label: "Unterstes Bohrloch von Unterkante", type: "number", unit: "mm" },
            { key: "variant", label: "Legrabox-Variante", type: "select", options: ["N", "M", "K", "C", "L"].map(value => ({ value, label: value })) }
        ]
    },
    {
        id: "macro.frontHinge",
        label: "Topfband Front",
        description: "Topf- und konfigurierte Nebenbohrungen an einer X-Position.",
        requiredIntents: [MACHINING_INTENT_IDS.FRONT_HINGE_CUP, MACHINING_INTENT_IDS.FRONT_HINGE_AUXILIARY],
        fields: [{ key: "x", label: "Position X", type: "number", unit: "mm" }]
    },
    {
        id: "macro.cabinetHinge",
        label: "Topfband Korpus",
        description: "Montageplattenbohrungen relativ zur Bandposition.",
        requiredIntents: [MACHINING_INTENT_IDS.CABINET_HINGE_PLATE],
        fields: [{ key: "x", label: "Bandposition X", type: "number", unit: "mm" }]
    },
    {
        id: "macro.backGroove",
        label: "Rückwandnut",
        description: "Vollständige Nut mit den hinterlegten Nutparametern.",
        requiredIntents: [MACHINING_INTENT_IDS.BACK_GROOVE],
        fields: [{ key: "y", label: "Position Y", type: "number", unit: "mm" }]
    },
    {
        id: "macro.backRabbet",
        label: "Rückwandfalz",
        description: "G0-Anfahrt und Fräsgerade aus dem bekannten Falzprogramm.",
        requiredIntents: [MACHINING_INTENT_IDS.BACK_RABBET],
        fields: [{ key: "y", label: "Position Y", type: "number", unit: "mm" }]
    }
]);

export const getAvailableCncMacros = ({ descriptor, assignments = {} }) => {
    const supportedStrategies = new Set((descriptor?.supportedMachiningStrategies ?? []).map(strategy => strategy.id));
    const intentAvailable = intent => supportedStrategies.has(assignments?.[intent]?.strategyId);
    return CNC_MACRO_DEFINITIONS.filter(macro => macro.requiredIntents.every(intentAvailable));
};

export const createEmptyCnc = () => ({
    version: MACHINING_SCHEMA_VERSION,
    coordinateSystem: {
        unit: "mm",
        origin: "top-left",
        xAxis: "right",
        yAxis: "down",
        depthDirection: "into-material"
    },
    operations: []
});

const samePart = (node, partId) => String(node?.PID ?? node?._generatedId ?? "") === String(partId ?? "");

export const findPartById = (nodes, partId) => {
    for (const node of Array.isArray(nodes) ? nodes : []) {
        if (samePart(node, partId)) return node;
        const found = findPartById(node?.Children, partId);
        if (found) return found;
    }
    return null;
};

export const findPartByKey = (nodes, partKey, cabinetId = null) => {
    for (const node of Array.isArray(nodes) ? nodes : []) {
        const belongsToCabinet = cabinetId == null ||
            String(node?._cabinetId ?? "") === String(cabinetId) ||
            String(node?._generatedId ?? "").startsWith(`${cabinetId}:part:`);
        if (belongsToCabinet && getCncPartKey(node) === String(partKey)) return node;
        const found = findPartByKey(node?.Children, partKey, cabinetId);
        if (found) return found;
    }
    return null;
};

export const updatePartById = (nodes, partId, update) => (Array.isArray(nodes) ? nodes : []).map(node => {
    if (samePart(node, partId)) return update(node);
    if (!Array.isArray(node?.Children)) return node;
    return { ...node, Children: updatePartById(node.Children, partId, update) };
});

export const updatePartByKey = (nodes, partKey, cabinetId, update) => (Array.isArray(nodes) ? nodes : []).map(node => {
    const belongsToCabinet = cabinetId == null ||
        String(node?._cabinetId ?? "") === String(cabinetId) ||
        String(node?._generatedId ?? "").startsWith(`${cabinetId}:part:`);
    if (belongsToCabinet && getCncPartKey(node) === String(partKey)) return update(node);
    if (!Array.isArray(node?.Children)) return node;
    return { ...node, Children: updatePartByKey(node.Children, partKey, cabinetId, update) };
});

export const insertOperationAfter = (operations, selectedId, operation) => {
    const current = Array.isArray(operations) ? operations : [];
    if (selectedId == null) return [...current, operation];
    const index = current.findIndex(item => String(item.id) === String(selectedId));
    if (index < 0) return [...current, operation];
    return [...current.slice(0, index + 1), operation, ...current.slice(index + 1)];
};

export const insertOperationsAfter = (operations, selectedId, additions) => {
    const current = Array.isArray(operations) ? operations : [];
    const nextOperations = Array.isArray(additions) ? additions : [];
    if (!nextOperations.length) return current;
    if (selectedId == null) return [...current, ...nextOperations];
    const index = current.findIndex(item => String(item.id) === String(selectedId));
    if (index < 0) return [...current, ...nextOperations];
    return [...current.slice(0, index + 1), ...nextOperations, ...current.slice(index + 1)];
};

const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const defaultToolId = (tools, category) =>
    (Array.isArray(tools) ? tools : []).find(tool => tool.category === category)?.id ?? "";

const mergeCncDefaults = cncDefault => ({
    ...DEFAULT_CNC,
    ...(cncDefault ?? {}),
    spax: {
        ...DEFAULT_CNC.spax,
        ...(cncDefault?.spax ?? {}),
        connector: { ...DEFAULT_CNC.spax.connector, ...(cncDefault?.spax?.connector ?? {}) },
        screw: { ...DEFAULT_CNC.spax.screw, ...(cncDefault?.spax?.screw ?? {}) },
        horizontal: { ...DEFAULT_CNC.spax.horizontal, ...(cncDefault?.spax?.horizontal ?? {}) }
    },
    shelf: { ...DEFAULT_CNC.shelf, ...(cncDefault?.shelf ?? {}) },
    legrabox: { ...DEFAULT_CNC.legrabox, ...(cncDefault?.legrabox ?? {}) },
    fronts: {
        ...DEFAULT_CNC.fronts,
        ...(cncDefault?.fronts ?? {}),
        drawer: { ...DEFAULT_CNC.fronts.drawer, ...(cncDefault?.fronts?.drawer ?? {}) },
        door: {
            ...DEFAULT_CNC.fronts.door,
            ...(cncDefault?.fronts?.door ?? {}),
            cup: { ...DEFAULT_CNC.fronts.door.cup, ...(cncDefault?.fronts?.door?.cup ?? {}) },
            corpus: { ...DEFAULT_CNC.fronts.door.corpus, ...(cncDefault?.fronts?.door?.corpus ?? {}) },
            auxiliaryHoles: cncDefault?.fronts?.door?.auxiliaryHoles ?? DEFAULT_CNC.fronts.door.auxiliaryHoles
        }
    },
    backPanel: {
        ...DEFAULT_CNC.backPanel,
        ...(cncDefault?.backPanel ?? {}),
        groove: {
            ...DEFAULT_CNC.backPanel.groove,
            ...(cncDefault?.backPanel?.groove ?? {}),
            path: { ...DEFAULT_CNC.backPanel.groove.path, ...(cncDefault?.backPanel?.groove?.path ?? {}) }
        },
        rabbet: { ...DEFAULT_CNC.backPanel.rabbet, ...(cncDefault?.backPanel?.rabbet ?? {}) }
    }
});

const linearPositions = (length, startOffset, endOffset, count) => {
    const start = number(startOffset);
    const end = Math.max(start, number(length) - number(endOffset));
    const safeCount = Math.max(1, Math.floor(number(count, 1)));
    const spacing = safeCount > 1 ? (end - start) / (safeCount - 1) : 0;
    return Array.from({ length: safeCount }, (_, index) => start + index * spacing);
};

const macroSource = (macroId, values, details = {}) => ({
    type: "cncMacro",
    macroId,
    parameters: { ...values },
    ...details
});

const macroOperation = ({ macroId, values, intentId, kind, face = "A", source = {}, ...geometry }) => ({
    id: createStringId(),
    kind,
    intentId,
    face,
    ...geometry,
    source: macroSource(macroId, values, source)
});

const frontDrawerBaseOffset = (drawerConfig, variant) => {
    const offsets = getDrawerFrontGroups(drawerConfig, variant).flatMap(group =>
        (group.holes ?? []).map(hole => number(group.verticalOffset) + number(hole.verticalOffset))
    );
    return offsets.length ? Math.min(...offsets) : 0;
};

export const createMacroDraft = ({ macro, part, cncDefault }) => {
    const config = mergeCncDefaults(cncDefault);
    const length = number(part?.L, 600);
    const drawerVariant = "M";
    const defaults = {
        "macro.connectorRow": { x: length / 2 },
        "macro.connectorEdge": { edge: "left" },
        "macro.screwRow": { x: length / 2 },
        "macro.shelfRow": { start: 37, end: Math.max(37, length - 37) },
        "macro.legrabox": { x: length / 2 },
        "macro.frontDrawer": {
            firstHoleFromBottom: number(config.fronts.drawer.fallbackBoxPositionFromBottom, 59) + frontDrawerBaseOffset(config.fronts.drawer, drawerVariant),
            variant: drawerVariant
        },
        "macro.frontHinge": { x: 100 },
        "macro.cabinetHinge": { x: 100 },
        "macro.backGroove": { y: number(config.backPanel.groove.path.y, 20) },
        "macro.backRabbet": { y: number(config.backPanel.rabbet.topOffset, 7) }
    };
    return {
        macroId: macro.id,
        values: defaults[macro.id] ?? {},
        parameterExpressions: {}
    };
};

export const createMacroOperations = ({ macroId, values = {}, part, cncDefault, tools = [] }) => {
    const config = mergeCncDefaults(cncDefault);
    const length = number(part?.L, 600);
    const width = number(part?.B, 400);
    const thickness = number(part?.T, 19);
    const drillingTool = defaultToolId(tools, "drilling");
    const millingTool = defaultToolId(tools, "milling");

    if (macroId === "macro.connectorRow" || macroId === "macro.screwRow") {
        const connector = macroId === "macro.connectorRow" ? config.spax.connector : config.spax.screw;
        const count = macroId === "macro.connectorRow" && width >= number(config.spax.connector.holeCountThreshold, 300) ? 3 : 2;
        const positions = linearPositions(width, connector.startOffset, connector.endOffset, count);
        return [macroOperation({
            macroId,
            values,
            kind: MACHINING_KINDS.DRILL_LINEAR_PATTERN,
            intentId: macroId === "macro.connectorRow" ? MACHINING_INTENT_IDS.JOINT_CONNECTOR : MACHINING_INTENT_IDS.JOINT_SCREW,
            x: number(values.x),
            y: positions[0],
            positions,
            count: positions.length,
            spacing: positions.length > 1 ? positions[1] - positions[0] : 0,
            diameter: number(connector.diameter, 5),
            depth: number(connector.depth, 15),
            pattern: macroId === "macro.connectorRow" ? "connector" : "spax",
            toolId: drillingTool
        })];
    }

    if (macroId === "macro.connectorEdge") {
        const connector = config.spax.horizontal;
        const positions = linearPositions(width, connector.startOffset, connector.endOffset, 2);
        return [macroOperation({
            macroId,
            values,
            kind: MACHINING_KINDS.DRILL_EDGE_PATTERN,
            intentId: MACHINING_INTENT_IDS.JOINT_CONNECTOR,
            edge: values.edge === "right" ? "right" : "left",
            positions,
            height: thickness / 2,
            diameter: number(connector.diameter, 8),
            depth: number(connector.depth, 15),
            toolId: drillingTool
        })];
    }

    if (macroId === "macro.shelfRow") {
        return [macroOperation({
            macroId,
            values,
            kind: MACHINING_KINDS.DRILL_ROW,
            intentId: MACHINING_INTENT_IDS.SHELF_PIN_ROW,
            axis: "x",
            start: number(values.start),
            end: number(values.end),
            spacing: 32,
            crossPositions: [number(config.shelf.frontOffset, 37), Math.max(0, width - number(config.shelf.backOffset, 37))],
            diameter: number(config.shelf.diameter, 5),
            depth: number(config.shelf.depth, 16),
            toolId: drillingTool
        })];
    }

    if (macroId === "macro.legrabox") {
        const depthPattern = Array.isArray(config.legrabox.depthPattern) ? config.legrabox.depthPattern.map(value => number(value)) : [37, 69, 192, 224, 256];
        return [
            [depthPattern[0], depthPattern[1]],
            [depthPattern[2], depthPattern[3], depthPattern[4]]
        ].filter(group => group.every(Number.isFinite)).map((group, groupIndex) => macroOperation({
            macroId,
            values,
            kind: MACHINING_KINDS.DRILL_PATTERN,
            intentId: MACHINING_INTENT_IDS.DRAWER_LEGRABOX,
            x: number(values.x),
            y: group[0],
            count: group.length,
            columns: 1,
            rows: group.length,
            stepX: 0,
            stepY: group.length > 1 ? group[1] - group[0] : 0,
            diameter: number(config.legrabox.diameter, 5),
            depth: number(config.legrabox.depth, 15),
            toolId: drillingTool,
            source: { group: groupIndex + 1 }
        }));
    }

    if (macroId === "macro.frontDrawer") {
        const variant = String(values.variant || "M").toUpperCase();
        const groups = getDrawerFrontGroups(config.fronts.drawer, variant);
        const baseOffset = frontDrawerBaseOffset(config.fronts.drawer, variant);
        const boxPositionFromBottom = number(values.firstHoleFromBottom) - baseOffset;
        return groups.flatMap((group, groupIndex) => (group.holes ?? []).flatMap((hole, holeIndex) => {
            const configuredOffset = number(group.verticalOffset) + number(hole.verticalOffset);
            const holeFromBottom = boxPositionFromBottom + configuredOffset;
            const sideOffset = Math.max(0, number(hole.sideOffset, 33));
            return [
                ["left", sideOffset],
                ["right", Math.max(0, length - sideOffset)]
            ].map(([side, x]) => macroOperation({
                macroId,
                values,
                kind: MACHINING_KINDS.DRILL_POINT,
                intentId: MACHINING_INTENT_IDS.FRONT_DRAWER_MOUNT,
                x,
                y: width - holeFromBottom,
                diameter: number(hole.diameter, 5),
                depth: number(hole.depth, 1),
                toolId: drillingTool,
                source: {
                    role: "drawerFront",
                    side,
                    variant,
                    programId: group.programId,
                    groupId: group.id,
                    groupIndex,
                    holeIndex,
                    boxPositionFromBottom,
                    firstHoleFromBottom: number(values.firstHoleFromBottom),
                    groupOffsetFromFirstHole: configuredOffset - baseOffset
                }
            }));
        }));
    }

    if (macroId === "macro.frontHinge") {
        const cup = config.fronts.door.cup;
        const operations = [macroOperation({
            macroId,
            values,
            kind: MACHINING_KINDS.DRILL_POINT,
            intentId: MACHINING_INTENT_IDS.FRONT_HINGE_CUP,
            x: number(values.x),
            y: number(cup.edgeOffset, 22.5),
            diameter: number(cup.diameter, 35),
            depth: number(cup.depth, 13),
            toolId: drillingTool,
            source: { role: "hingeCup" }
        })];
        (config.fronts.door.auxiliaryHoles ?? []).forEach((hole, holeIndex) => operations.push(macroOperation({
            macroId,
            values,
            kind: MACHINING_KINDS.DRILL_POINT,
            intentId: MACHINING_INTENT_IDS.FRONT_HINGE_AUXILIARY,
            x: number(values.x) + number(hole.verticalOffset),
            y: number(cup.edgeOffset, 22.5) + number(hole.horizontalOffset),
            diameter: number(hole.diameter, 5),
            depth: number(hole.depth, 13),
            toolId: drillingTool,
            source: { role: "hingeAuxiliary", holeIndex }
        })));
        return operations;
    }

    if (macroId === "macro.cabinetHinge") {
        const corpus = config.fronts.door.corpus;
        return (corpus.centerOffsets ?? [-32, 32]).map((offset, holeIndex) => macroOperation({
            macroId,
            values,
            kind: MACHINING_KINDS.DRILL_POINT,
            intentId: MACHINING_INTENT_IDS.CABINET_HINGE_PLATE,
            x: number(values.x) + number(offset),
            y: number(corpus.frontOffset, 37),
            diameter: number(corpus.diameter, 5),
            depth: number(corpus.depth, 15),
            toolId: drillingTool,
            source: { role: "hingeCorpus", holeIndex, cupCenterOffset: number(offset) }
        }));
    }

    if (macroId === "macro.backGroove") {
        const groove = config.backPanel.groove;
        const path = groove.path;
        return [macroOperation({
            macroId,
            values,
            kind: MACHINING_KINDS.MILL_GROOVE,
            intentId: MACHINING_INTENT_IDS.BACK_GROOVE,
            start: { x: number(path.startOffset, 3), y: number(values.y), z: number(path.z, groove.zDepth) },
            end: { x: length - number(path.endOffset, 3), y: number(values.y), z: number(path.z, groove.zDepth) },
            width: number(path.width, groove.width),
            toolId: millingTool
        })];
    }

    if (macroId === "macro.backRabbet") {
        const rabbet = config.backPanel.rabbet;
        const startX = number(rabbet.continuous?.startLeft, -20);
        const endX = length - number(rabbet.continuous?.endRight, -20);
        const start = { x: startX, y: number(values.y), z: number(rabbet.depth, 16) };
        const target = { x: endX, y: number(values.y), z: number(rabbet.depth, 16) };
        return [
            macroOperation({
                macroId,
                values,
                kind: MACHINING_KINDS.MILL_PATH,
                intentId: MACHINING_INTENT_IDS.BACK_RABBET,
                motion: "rapid",
                target: start,
                compensation: "center",
                toolId: millingTool
            }),
            macroOperation({
                macroId,
                values,
                kind: MACHINING_KINDS.MILL_PATH,
                intentId: MACHINING_INTENT_IDS.BACK_RABBET,
                motion: "linear",
                start,
                target,
                compensation: "center",
                toolId: millingTool,
                feed: 5
            })
        ];
    }

    return [];
};

export const createManualOperation = ({ tool, part, cncDefault = {}, tools = [], previousOperation = null }) => {
    const width = number(part?.L, 600);
    const height = number(part?.B, 400);
    const drillDiameter = number(cncDefault?.shelf?.diameter, 5);
    const drillDepth = number(cncDefault?.shelf?.depth, 15);
    const millingDepth = number(cncDefault?.backPanel?.rabbet?.depth, 8);
    const previousCompensation = previousOperation?.kind === MACHINING_KINDS.MILL_PATH
        ? previousOperation.compensation ?? "center"
        : "center";
    const previousMillingTool = previousOperation?.kind === MACHINING_KINDS.MILL_PATH
        ? previousOperation.toolId
        : null;
    const center = { x: width / 2, y: height / 2 };
    const common = {
        id: createStringId(),
        kind: tool.kind,
        intentId: tool.id === "mill.groove" ? MACHINING_INTENT_IDS.MANUAL_GROOVE
            : tool.kind === MACHINING_KINDS.MILL_PATH ? MACHINING_INTENT_IDS.MANUAL_MILLING
                : MACHINING_INTENT_IDS.MANUAL_DRILLING,
        face: "A",
        source: { type: "manualCncEditor", toolId: tool.id }
    };

    switch (tool.id) {
        case "drill.point":
            return { ...common, ...center, diameter: drillDiameter, depth: drillDepth, toolId: defaultToolId(tools, "drilling") };
        case "drill.pattern":
            return { ...common, x: 37, y: 37, columns: 4, rows: 1, stepX: 32, stepY: 32, diameter: drillDiameter, depth: drillDepth, toolId: defaultToolId(tools, "drilling") };
        case "drill.linearPattern":
            return { ...common, x: 37, y: 37, count: 4, spacing: 32, diameter: drillDiameter, depth: drillDepth, toolId: defaultToolId(tools, "drilling") };
        case "drill.row":
            return { ...common, axis: "x", start: 37, end: Math.max(37, width - 37), spacing: 32, crossPositions: [37, Math.max(37, height - 37)], diameter: drillDiameter, depth: drillDepth, toolId: defaultToolId(tools, "drilling") };
        case "drill.edgePattern":
            return { ...common, edge: "left", positions: [37, Math.max(37, height - 37)], spacing: 32, height: number(part?.T, 19) / 2, diameter: drillDiameter, depth: drillDepth, toolId: defaultToolId(tools, "drilling") };
        case "mill.groove":
            return { ...common, start: { x: 0, y: 20, z: millingDepth }, end: { x: width, y: 20, z: millingDepth }, width: number(cncDefault?.backPanel?.groove?.width, 8), toolId: defaultToolId(tools, "milling") };
        case "mill.rapid":
            return { ...common, motion: "rapid", target: { x: 0, y: 0, z: millingDepth }, toolId: previousMillingTool ?? defaultToolId(tools, "milling"), compensation: previousCompensation };
        case "mill.line": {
            const start = previousOperation?.kind === MACHINING_KINDS.MILL_PATH
                ? (previousOperation.target ?? previousOperation.start)
                : { x: 0, y: 0, z: millingDepth };
            return { ...common, motion: "linear", start: { ...start }, target: { x: Math.min(width, number(start?.x) + 100), y: number(start?.y), z: number(start?.z, millingDepth) }, toolId: previousMillingTool ?? defaultToolId(tools, "milling"), compensation: previousCompensation, feed: 5 };
        }
        default:
            return common;
    }
};

const compensatedRadius = (operation, toolDiameter) => {
    const clockwise = operation.direction !== "counterclockwise";
    const direction = operation.compensation === "left" ? 1 : -1;
    return number(operation.radius, Math.hypot(
        number(operation.start?.x) - number(operation.center?.x),
        number(operation.start?.y) - number(operation.center?.y)
    )) + toolDiameter / 2 * direction * (clockwise ? 1 : -1);
};

export const createCompensatedMillingPaths = (operations, tools) => {
    const millingTools = (Array.isArray(tools) ? tools : []).filter(tool => tool.category === "milling");
    return (Array.isArray(operations) ? operations : []).flatMap(operation => {
        if (
            operation.kind !== MACHINING_KINDS.MILL_PATH ||
            !["linear", "arc"].includes(operation.motion) ||
            !["left", "right"].includes(operation.compensation)
        ) return [];
        const tool = millingTools.find(item => item.id === operation.toolId) ?? millingTools[0];
        const diameter = number(tool?.diameter);
        if (!(diameter > 0)) return [];

        if (operation.motion === "linear") {
            const start = point(operation.start);
            const target = point(operation.target);
            const dx = target.x - start.x;
            const dy = target.y - start.y;
            const length = Math.hypot(dx, dy);
            if (!(length > 0)) return [];
            const direction = operation.compensation === "left" ? 1 : -1;
            const offset = diameter / 2;
            const ox = direction * (dy / length) * offset;
            const oy = direction * (-dx / length) * offset;
            return [{
                id: operation.id,
                face: operation.face ?? "A",
                type: "line",
                start: { x: start.x + ox, y: start.y + oy },
                target: { x: target.x + ox, y: target.y + oy }
            }];
        }

        const center = point(operation.center);
        const start = point(operation.start);
        const target = point(operation.target);
        const radius = compensatedRadius(operation, diameter);
        if (!(radius > 0)) return [];
        const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
        const targetAngle = Math.atan2(target.y - center.y, target.x - center.x);
        return [{
            id: operation.id,
            face: operation.face ?? "A",
            type: "arc",
            center,
            radius,
            direction: operation.direction ?? "clockwise",
            start: { x: center.x + Math.cos(startAngle) * radius, y: center.y + Math.sin(startAngle) * radius },
            target: { x: center.x + Math.cos(targetAngle) * radius, y: center.y + Math.sin(targetAngle) * radius }
        }];
    });
};

const point = value => ({ x: number(value?.x), y: number(value?.y), z: number(value?.z) });
const distance = (left, right) => Math.hypot(left.x - right.x, left.y - right.y);
const near = (left, right, tolerance = 0.01) => distance(left, right) <= tolerance;
const clamp = value => Math.max(-1, Math.min(1, value));

export const insertFilletAfter = (operations, selectedId, radius, requestedDirection = "auto") => {
    const current = Array.isArray(operations) ? operations : [];
    const index = current.findIndex(item => String(item.id) === String(selectedId));
    const first = current[index];
    const second = current[index + 1];
    if (
        index < 0 ||
        first?.kind !== MACHINING_KINDS.MILL_PATH || first.motion !== "linear" ||
        second?.kind !== MACHINING_KINDS.MILL_PATH || second.motion !== "linear"
    ) {
        throw new Error("Für einen Radius müssen eine Gerade und die direkt folgende Gerade ausgewählt sein.");
    }

    const a = point(first.start);
    const corner = point(first.target);
    const secondStart = point(second.start);
    const c = point(second.target);
    if (!near(corner, secondStart)) {
        throw new Error("Die beiden Fräsgeraden müssen sich in einem gemeinsamen Eckpunkt treffen.");
    }

    const firstLength = distance(a, corner);
    const secondLength = distance(corner, c);
    const u1 = { x: (a.x - corner.x) / firstLength, y: (a.y - corner.y) / firstLength };
    const u2 = { x: (c.x - corner.x) / secondLength, y: (c.y - corner.y) / secondLength };
    const angle = Math.acos(clamp(u1.x * u2.x + u1.y * u2.y));
    const requestedRadius = number(radius);
    if (!(requestedRadius > 0) || !(angle > 0.001) || Math.abs(Math.PI - angle) < 0.001) {
        throw new Error("Der Radius oder der Winkel der beiden Geraden ist ungültig.");
    }
    const tangentDistance = requestedRadius / Math.tan(angle / 2);
    if (tangentDistance >= firstLength || tangentDistance >= secondLength) {
        throw new Error("Der Radius ist für die angrenzenden Fräsgeraden zu groß.");
    }

    const tangentStart = { ...corner, x: corner.x + u1.x * tangentDistance, y: corner.y + u1.y * tangentDistance };
    const tangentEnd = { ...corner, x: corner.x + u2.x * tangentDistance, y: corner.y + u2.y * tangentDistance };
    const bisectorLength = Math.hypot(u1.x + u2.x, u1.y + u2.y);
    const centerDistance = requestedRadius / Math.sin(angle / 2);
    const center = {
        x: corner.x + ((u1.x + u2.x) / bisectorLength) * centerDistance,
        y: corner.y + ((u1.y + u2.y) / bisectorLength) * centerDistance,
        z: corner.z
    };
    const incoming = { x: corner.x - a.x, y: corner.y - a.y };
    const outgoing = { x: c.x - corner.x, y: c.y - corner.y };
    const automaticDirection = incoming.x * outgoing.y - incoming.y * outgoing.x > 0
        ? "clockwise"
        : "counterclockwise";
    const direction = requestedDirection === "auto" ? automaticDirection : requestedDirection;
    const arc = {
        id: createStringId(),
        kind: MACHINING_KINDS.MILL_PATH,
        intentId: MACHINING_INTENT_IDS.MANUAL_MILLING,
        face: first.face ?? "A",
        motion: "arc",
        start: tangentStart,
        target: tangentEnd,
        center,
        radius: requestedRadius,
        direction,
        compensation: first.compensation ?? "center",
        toolId: first.toolId ?? second.toolId ?? "",
        feed: first.feed ?? second.feed,
        source: { type: "manualCncEditor", toolId: "mill.radius" }
    };
    return {
        operations: [
            ...current.slice(0, index),
            { ...first, target: tangentStart },
            arc,
            { ...second, start: tangentEnd },
            ...current.slice(index + 2)
        ],
        operation: arc
    };
};

export const operationTitle = operation => {
    if (operation?.source?.type === "cncMacro") {
        const macro = CNC_MACRO_DEFINITIONS.find(entry => entry.id === operation.source.macroId);
        if (macro) return macro.label;
    }
    if (operation?.kind === MACHINING_KINDS.DRILL_POINT) return "Einzelbohrung";
    if (operation?.kind === MACHINING_KINDS.DRILL_PATTERN) return "Rasterbohrung";
    if (operation?.kind === MACHINING_KINDS.DRILL_LINEAR_PATTERN) return "Reihenbohrung";
    if (operation?.kind === MACHINING_KINDS.DRILL_ROW) return "Lochreihe";
    if (operation?.kind === MACHINING_KINDS.DRILL_EDGE_PATTERN) return "Kantenbohrung";
    if (operation?.kind === MACHINING_KINDS.MILL_GROOVE) return "Nut";
    if (operation?.kind === MACHINING_KINDS.MILL_PATH && operation.motion === "rapid") return "G0 Startpunkt";
    if (operation?.kind === MACHINING_KINDS.MILL_PATH && operation.motion === "arc") return "Radius";
    if (operation?.kind === MACHINING_KINDS.MILL_PATH) return "Fräsgerade";
    return "Bearbeitung";
};
