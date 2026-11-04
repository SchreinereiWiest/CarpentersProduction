import { createStringId } from "../../shared/id.js";
import { MACHINING_INTENT_IDS, MACHINING_KINDS } from "../../postprocessor/machiningModel.js";

export const CNC_PROGRAM_CONFIG_TYPE = "cncPrograms";
export const CNC_PROGRAM_CONFIG_VERSION = 1;

const clone = value => JSON.parse(JSON.stringify(value));
const asArray = value => Array.isArray(value) ? value : [];
const keyOf = value => String(value ?? "");

export const getCncPartKey = part => {
    const generatedId = String(part?._generatedId ?? "");
    const marker = ":part:";
    const markerIndex = generatedId.lastIndexOf(marker);
    if (markerIndex >= 0) return generatedId.slice(markerIndex + 1);
    return generatedId || `pid:${part?.PID ?? "unknown"}`;
};

export const getCncProgramConfig = cabinet =>
    asArray(cabinet?.functionConfig).find(entry => entry?.type === CNC_PROGRAM_CONFIG_TYPE) ?? null;

const emptyConfig = () => ({
    id: createStringId(),
    type: CNC_PROGRAM_CONFIG_TYPE,
    schemaVersion: CNC_PROGRAM_CONFIG_VERSION,
    recognizedProfiles: [],
    customPrograms: [],
    partOrders: []
});

export const replaceCncProgramConfig = (cabinet, config) => ({
    ...cabinet,
    functionConfig: [
        ...asArray(cabinet?.functionConfig).filter(entry => entry?.type !== CNC_PROGRAM_CONFIG_TYPE),
        config
    ]
});

export const updateCncProgramConfig = (cabinet, update) => {
    const current = getCncProgramConfig(cabinet) ?? emptyConfig();
    return replaceCncProgramConfig(cabinet, update(clone(current)));
};

const PROFILE_BY_INTENT = Object.freeze({
    [MACHINING_INTENT_IDS.SHELF_PIN_ROW]: "shelf.row",
    [MACHINING_INTENT_IDS.DRAWER_LEGRABOX]: "drawer.legrabox",
    [MACHINING_INTENT_IDS.JOINT_CONNECTOR]: "connector.drill",
    [MACHINING_INTENT_IDS.JOINT_SCREW]: "connector.screw",
    [MACHINING_INTENT_IDS.BACK_GROOVE]: "back.groove",
    [MACHINING_INTENT_IDS.BACK_RABBET]: "back.rabbet",
    [MACHINING_INTENT_IDS.FRONT_DRAWER_MOUNT]: "front.drawerMount",
    [MACHINING_INTENT_IDS.FRONT_HINGE_CUP]: "front.hingeCup",
    [MACHINING_INTENT_IDS.FRONT_HINGE_AUXILIARY]: "front.hingeAuxiliary",
    [MACHINING_INTENT_IDS.CABINET_HINGE_PLATE]: "cabinet.hingePlate"
});

export const getRecognizedCncProfileType = operation =>
    operation?.source?.type === "manualCncEditor"
        ? null
        : PROFILE_BY_INTENT[operation?.intentId] ?? null;

const escapeAttribute = value => String(value).replace(/[&"<>]/g, character => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[character]);
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

const drillPoints = operation => {
    if (operation.kind === MACHINING_KINDS.DRILL_ROW) {
        const points = [];
        const spacing = Math.max(0.1, finite(operation.spacing, 32));
        for (let position = finite(operation.start); position <= finite(operation.end) + 0.001; position += spacing) {
            asArray(operation.crossPositions).forEach(crossPosition => points.push(operation.axis === "y"
                ? { x: finite(crossPosition), y: position }
                : { x: position, y: finite(crossPosition) }));
        }
        return points;
    }
    if (operation.kind === MACHINING_KINDS.DRILL_EDGE_PATTERN) {
        return asArray(operation.positions).map(y => ({ x: operation.edge === "right" ? 1 : 0, y: finite(y), edge: true }));
    }
    if (operation.kind === MACHINING_KINDS.DRILL_LINEAR_PATTERN) {
        const positions = asArray(operation.positions);
        if (positions.length) return positions.map(y => ({ x: finite(operation.x), y: finite(y) }));
        return Array.from({ length: Math.max(1, Math.floor(finite(operation.count, 1))) }, (_, index) => ({
            x: finite(operation.x),
            y: finite(operation.y) + index * finite(operation.spacing)
        }));
    }
    if (operation.kind === MACHINING_KINDS.DRILL_PATTERN) {
        const columns = Math.max(1, Math.floor(finite(operation.columns, operation.count ?? 1)));
        const rows = Math.max(1, Math.floor(finite(operation.rows, 1)));
        return Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => ({
            x: finite(operation.x) + column * finite(operation.stepX),
            y: finite(operation.y) + row * finite(operation.stepY)
        }))).flat();
    }
    const columns = Math.max(1, Math.floor(finite(operation.columns ?? operation.count, 1)));
    const rows = Math.max(1, Math.floor(finite(operation.rows, 1)));
    return Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => ({
        x: finite(operation.x) + column * finite(operation.stepX),
        y: finite(operation.y) + row * finite(operation.stepY ?? operation.spacing)
    }))).flat();
};

const millingToolDiameter = (operation, tools) => {
    const millingTools = asArray(tools).filter(tool => tool?.category === "milling");
    const selected = millingTools.find(tool => keyOf(tool.id) === keyOf(operation.toolId)) ?? millingTools[0];
    return Math.max(0, finite(selected?.diameter ?? operation.toolDiameter, 8));
};

const compensatedPathSvg = (operation, tools) => {
    if (
        operation.kind !== MACHINING_KINDS.MILL_PATH ||
        !["linear", "arc"].includes(operation.motion) ||
        !["left", "right"].includes(operation.compensation)
    ) return "";
    const diameter = millingToolDiameter(operation, tools);
    if (!(diameter > 0)) return "";
    const direction = operation.compensation === "left" ? 1 : -1;
    if (operation.motion === "linear") {
        const start = operation.start ?? {};
        const target = operation.target ?? {};
        const dx = finite(target.x) - finite(start.x);
        const dy = finite(target.y) - finite(start.y);
        const length = Math.hypot(dx, dy);
        if (!(length > 0)) return "";
        const offset = diameter / 2;
        const offsetX = direction * dy / length * offset;
        const offsetY = direction * -dx / length * offset;
        return `<line x1="${finite(start.x) + offsetX}" y1="${finite(start.y) + offsetY}" x2="${finite(target.x) + offsetX}" y2="${finite(target.y) + offsetY}" stroke="#38bdf8" stroke-width="2"/>`;
    }
    const center = operation.center ?? {};
    const start = operation.start ?? {};
    const target = operation.target ?? {};
    const clockwise = operation.direction !== "counterclockwise";
    const programmedRadius = Math.max(0.1, finite(operation.radius, Math.hypot(finite(start.x) - finite(center.x), finite(start.y) - finite(center.y))));
    const radius = programmedRadius + diameter / 2 * direction * (clockwise ? 1 : -1);
    if (!(radius > 0)) return "";
    const startAngle = Math.atan2(finite(start.y) - finite(center.y), finite(start.x) - finite(center.x));
    const targetAngle = Math.atan2(finite(target.y) - finite(center.y), finite(target.x) - finite(center.x));
    let sweep = targetAngle - startAngle;
    if (clockwise) while (sweep <= 0) sweep += Math.PI * 2;
    else while (sweep >= 0) sweep -= Math.PI * 2;
    const correctedStart = { x: finite(center.x) + Math.cos(startAngle) * radius, y: finite(center.y) + Math.sin(startAngle) * radius };
    const correctedTarget = { x: finite(center.x) + Math.cos(targetAngle) * radius, y: finite(center.y) + Math.sin(targetAngle) * radius };
    return `<path d="M ${correctedStart.x} ${correctedStart.y} A ${radius} ${radius} 0 ${Math.abs(sweep) > Math.PI ? 1 : 0} ${clockwise ? 1 : 0} ${correctedTarget.x} ${correctedTarget.y}" fill="none" stroke="#38bdf8" stroke-width="2"/>`;
};

export const createCncProgramPreviewSvg = (part, operations, tools = []) => {
    const width = Math.max(1, finite(part?.L, 600));
    const height = Math.max(1, finite(part?.B, 400));
    const geometry = asArray(operations).map(operation => {
        if (String(operation.kind).startsWith("drill.")) {
            return drillPoints(operation).map(point => `<circle cx="${point.edge && operation.edge === "right" ? width : point.x}" cy="${point.y}" r="${Math.max(2, finite(operation.diameter, 5) / 2)}" fill="#60a5fa"/>`).join("");
        }
        if (operation.kind === MACHINING_KINDS.MILL_GROOVE) {
            return `<line x1="${finite(operation.start?.x)}" y1="${finite(operation.start?.y)}" x2="${finite(operation.end?.x)}" y2="${finite(operation.end?.y, finite(operation.start?.y))}" stroke="#22c55e" stroke-width="${Math.max(2, finite(operation.width, 4))}"/>`;
        }
        if (operation.kind === MACHINING_KINDS.MILL_PATH && operation.motion === "arc") {
            const radius = Math.max(0.1, finite(operation.radius));
            const clockwise = operation.direction !== "counterclockwise";
            return `<path d="M ${finite(operation.start?.x)} ${finite(operation.start?.y)} A ${radius} ${radius} 0 0 ${clockwise ? 1 : 0} ${finite(operation.target?.x)} ${finite(operation.target?.y)}" fill="none" stroke="#c084fc" stroke-width="3"/>`;
        }
        if (operation.kind === MACHINING_KINDS.MILL_PATH) {
            const start = operation.start ?? operation.target;
            return `<line x1="${finite(start?.x)}" y1="${finite(start?.y)}" x2="${finite(operation.target?.x)}" y2="${finite(operation.target?.y)}" stroke="#c084fc" stroke-width="3"/>`;
        }
        return "";
    }).join("");
    const compensatedGeometry = asArray(operations).map(operation => compensatedPathSvg(operation, tools)).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${escapeAttribute(width)} ${escapeAttribute(height)}" role="img"><rect width="${escapeAttribute(width)}" height="${escapeAttribute(height)}" fill="#111827" stroke="#64748b" stroke-width="2"/>${geometry}${compensatedGeometry}</svg>`;
};

const childrenOf = section => asArray(section?.children);
const updateSection = (sections, sectionId, update) => asArray(sections).map(section => {
    if (keyOf(section.id) === keyOf(sectionId)) return update(section);
    return { ...section, children: updateSection(childrenOf(section), sectionId, update) };
});
const findSection = (sections, sectionId) => {
    for (const section of asArray(sections)) {
        if (keyOf(section.id) === keyOf(sectionId)) return section;
        const nested = findSection(childrenOf(section), sectionId);
        if (nested) return nested;
    }
    return null;
};

const syncRecognizedSectionFunctions = (cabinet, part, operations) => {
    let sections = cabinet.sections;
    const grouped = new Map();
    operations.forEach(operation => {
        const sectionId = operation.source?.sectionId;
        const functionId = operation.source?.functionId;
        if (!sectionId || !functionId) return;
        const key = `${sectionId}:${functionId}`;
        if (!grouped.has(key)) grouped.set(key, { sectionId, functionId, operations: [] });
        grouped.get(key).operations.push(operation);
    });
    grouped.forEach(group => {
        const section = findSection(sections, group.sectionId);
        if (!section) return;
        const row = group.operations.find(operation => operation.kind === MACHINING_KINDS.DRILL_ROW);
        const drawer = group.operations.find(operation => operation.intentId === MACHINING_INTENT_IDS.DRAWER_LEGRABOX);
        sections = updateSection(sections, group.sectionId, current => ({
            ...current,
            functionConfig: asArray(current.functionConfig).map(func => {
                if (keyOf(func.id) !== keyOf(group.functionId)) return func;
                if (row && func.type === "shelf") {
                    return {
                        ...func,
                        holeRow: {
                            ...(func.holeRow ?? {}),
                            spacing: finite(row.spacing, 32),
                            frontOffset: finite(row.crossPositions?.[0]),
                            backOffset: Math.max(0, finite(part?.B) - finite(row.crossPositions?.at?.(-1))),
                            endFromTop: Math.max(0, finite(row.start) - finite(current.y)),
                            startFromBottom: Math.max(0, finite(current.y) + finite(current.height) - finite(row.end)),
                            centered: false
                        }
                    };
                }
                if (drawer && func.type === "legrabox") {
                    const continuousOffset = part?.Source?.continuous === false ? 19 : 0;
                    return {
                        ...func,
                        positionFromBottom: Math.max(0, finite(current.height) + finite(current.y) - continuousOffset - finite(drawer.x)),
                        variant: drawer.source?.variant ?? func.variant
                    };
                }
                return func;
            })
        }));
    });
    return { ...cabinet, sections };
};

const groupRecognized = operations => {
    const groups = new Map();
    asArray(operations).forEach(operation => {
        const profileType = getRecognizedCncProfileType(operation);
        if (!profileType) return;
        const sectionId = operation.source?.sectionId ?? null;
        const functionId = operation.source?.functionId ?? null;
        const key = `${profileType}:${sectionId ?? "global"}:${functionId ?? ""}`;
        if (!groups.has(key)) groups.set(key, { profileType, sectionId, functionId, operations: [] });
        groups.get(key).operations.push(clone(operation));
    });
    return [...groups.values()];
};

const recognizedGroupKey = group => [
    group.profileType,
    group.sectionId ?? "global",
    group.functionId ?? ""
].map(keyOf).join(":");

const groupCustom = operations => {
    const groups = new Map();
    asArray(operations).filter(operation => !getRecognizedCncProfileType(operation)).forEach(operation => {
        const sectionId = operation.source?.sectionId ?? null;
        const functionId = operation.source?.functionId ?? null;
        const key = `${sectionId ?? "global"}:${functionId ?? ""}`;
        if (!groups.has(key)) groups.set(key, { sectionId, functionId, operations: [] });
        groups.get(key).operations.push(clone(operation));
    });
    return [...groups.values()];
};

const entryBase = (part, group = {}) => ({
    id: createStringId(),
    partKey: getCncPartKey(part),
    partId: part.PID ?? null,
    partName: part.Objektname ?? "Bauteil",
    dimensions: { x: finite(part.L), y: finite(part.B), z: finite(part.T) },
    scope: group.sectionId ? "section" : "global",
    sectionId: group.sectionId ?? null,
    functionId: group.functionId ?? null
});

export const storePartCncInCabinet = (cabinet, part, operations, { tools = [] } = {}) => {
    const synchronized = syncRecognizedSectionFunctions(cabinet, part, operations);
    const partKey = getCncPartKey(part);
    const recognizedGroups = groupRecognized(operations);
    const customGroups = groupCustom(operations);
    return updateCncProgramConfig(synchronized, config => {
        const previousGroups = [
            ...groupRecognized(part?.CNC?.operations),
            ...asArray(config.recognizedProfiles)
                .filter(entry => entry.partKey === partKey)
                .map(entry => ({
                    profileType: entry.profileType,
                    sectionId: entry.sectionId,
                    functionId: entry.functionId,
                    operations: entry.operations,
                    intentIds: entry.intentIds
                }))
        ];
        const currentKeys = new Set(recognizedGroups.map(recognizedGroupKey));
        const suppressedGroups = [
            ...new Map(previousGroups
                .filter(group => !currentKeys.has(recognizedGroupKey(group)))
                .map(group => [recognizedGroupKey(group), group]))
                .values()
        ];
        const profileEntries = [
            ...recognizedGroups.map(group => ({
                ...entryBase(part, group),
                profileType: group.profileType,
                intentIds: [...new Set(group.operations.map(operation => operation.intentId))],
                operations: group.operations
            })),
            ...suppressedGroups.map(group => ({
                ...entryBase(part, group),
                profileType: group.profileType,
                intentIds: [...new Set([
                    ...asArray(group.intentIds),
                    ...asArray(group.operations).map(operation => operation.intentId)
                ])],
                operations: [],
                suppressed: true
            }))
        ];

        return {
            ...config,
            recognizedProfiles: [
                ...asArray(config.recognizedProfiles).filter(entry => entry.partKey !== partKey),
                ...profileEntries
            ],
            customPrograms: [
                ...asArray(config.customPrograms).filter(entry => entry.partKey !== partKey),
                ...customGroups.map(group => ({
                    ...entryBase(part, group),
                    operations: group.operations,
                    previewOperations: clone(operations),
                    toolDatabase: clone(tools),
                    previewSvg: createCncProgramPreviewSvg(part, operations, tools)
                }))
            ],
            partOrders: [
                ...asArray(config.partOrders).filter(entry => entry.partKey !== partKey),
                {
                    partKey,
                    operationIds: asArray(operations).map(operation => operation.id)
                }
            ]
        };
    });
};

const matchesProfile = (operation, profile) => {
    if (!asArray(profile.intentIds).includes(operation.intentId)) return false;
    if (profile.sectionId && keyOf(operation.source?.sectionId) !== keyOf(profile.sectionId)) return false;
    if (profile.functionId && keyOf(operation.source?.functionId) !== keyOf(profile.functionId)) return false;
    return true;
};

export const applyStoredCncPrograms = (cabinet, parts) => {
    const config = getCncProgramConfig(cabinet);
    if (!config) return parts;
    const profiles = asArray(config.recognizedProfiles);
    const customs = asArray(config.customPrograms);
    const partOrders = asArray(config.partOrders);
    parts.forEach(part => {
        const partKey = getCncPartKey(part);
        const matchingProfiles = profiles.filter(entry => entry.partKey === partKey);
        const matchingCustoms = customs.filter(entry => entry.partKey === partKey);
        let operations = asArray(part.CNC?.operations);
        matchingProfiles.forEach(profile => {
            operations = [
                ...operations.filter(operation => !matchesProfile(operation, profile)),
                ...clone(profile.operations)
            ];
        });
        matchingCustoms.forEach(program => {
            operations.push(...clone(program.operations));
        });
        const storedOrder = partOrders.find(entry => entry.partKey === partKey)?.operationIds ?? [];
        const orderById = new Map(storedOrder.map((id, index) => [keyOf(id), index]));
        if (operations.length > 0 && operations.every(operation => orderById.has(keyOf(operation.id)))) {
            operations.sort((left, right) => orderById.get(keyOf(left.id)) - orderById.get(keyOf(right.id)));
        }
        if (part.CNC) part.CNC.operations = operations;
    });
    return parts;
};

export const removeCncProfilesForFunction = (cabinet, functionId) => {
    if (!getCncProgramConfig(cabinet)) return cabinet;
    return updateCncProgramConfig(cabinet, config => ({
        ...config,
        recognizedProfiles: asArray(config.recognizedProfiles).filter(entry => keyOf(entry.functionId) !== keyOf(functionId))
    }));
};
