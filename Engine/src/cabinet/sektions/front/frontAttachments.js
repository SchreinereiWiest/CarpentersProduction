import { getLegraboxHeight } from "../../cnc/legraboxDimensions.js";
import { flattenTree, updateTree } from "../../../shared/tree.js";

export const FRONT_ATTACHMENT_TYPES = {
    NONE: "none",
    DRAWER: "drawer",
    DOOR: "door",
    INSET_DRAWER: "insetDrawer"
};

const finite = value => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const getFunctions = section => Array.isArray(section?.functionConfig)
    ? section.functionConfig
    : [];

const overlap = (startA, sizeA, startB, sizeB) => Math.max(
    0,
    Math.min(startA + sizeA, startB + sizeB) - Math.max(startA, startB)
);

export const getLegraboxRailY = (section, func) => {
    const sectionY = finite(section?.y);
    const sectionHeight = finite(section?.height);
    const positionFromBottom = finite(func?.positionFromBottom) ?? 40;

    if (sectionY === null || sectionHeight === null) {
        return null;
    }

    return sectionY + sectionHeight - Math.max(0, positionFromBottom);
};

export const findFrontLegrabox = (cabinet, front) => {
    if (!cabinet || !front) {
        return null;
    }

    const attachment = front.attachment ?? {};
    const sections = flattenTree(cabinet.sections ?? []);
    const linkedSection = sections.find(section => String(section.id) === String(attachment.sectionId));
    const linkedFunction = linkedSection && getFunctions(linkedSection)
        .find(func => String(func.id) === String(attachment.functionId) && func.type === "legrabox");

    if (linkedSection && linkedFunction) {
        return {
            section: linkedSection,
            func: linkedFunction,
            railY: getLegraboxRailY(linkedSection, linkedFunction)
        };
    }

    const frontX = finite(front.x) ?? 0;
    const frontY = finite(front.y) ?? 0;
    const frontWidth = finite(front.width) ?? 0;
    const frontHeight = finite(front.height) ?? 0;
    const frontBottom = frontY + frontHeight;
    const candidates = [];

    sections.forEach(section => {
        const sectionX = finite(section.x) ?? 0;
        const sectionY = finite(section.y) ?? 0;
        const sectionWidth = finite(section.width) ?? 0;
        const sectionHeight = finite(section.height) ?? 0;
        const horizontalOverlap = overlap(frontX, frontWidth, sectionX, sectionWidth);
        const verticalOverlap = overlap(frontY, frontHeight, sectionY, sectionHeight);

        if (horizontalOverlap <= 0 || verticalOverlap <= 0) {
            return;
        }

        getFunctions(section)
            .filter(func => func.type === "legrabox")
            .forEach(func => {
                const railY = getLegraboxRailY(section, func);

                if (railY === null) {
                    return;
                }

                const insideFront = railY >= frontY && railY <= frontBottom;
                candidates.push({
                    section,
                    func,
                    railY,
                    score: (insideFront ? 1_000_000 : 0) +
                        horizontalOverlap * verticalOverlap -
                        Math.abs(frontBottom - railY)
                });
            });
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0] ?? null;
};

export const getFrontLegraboxVariant = (cabinet, front) => {
    const configuredVariant = front?.attachment?.drawerVariant;

    if (configuredVariant) {
        return String(configuredVariant).toUpperCase();
    }

    return String(findFrontLegrabox(cabinet, front)?.func?.variant ?? "M").toUpperCase();
};

const parseMatchKeys = value => (Array.isArray(value) ? value : String(value ?? "").split(","))
    .map(key => String(key).trim().toUpperCase())
    .filter(Boolean);

export const createDrawerProgramsFromLegacy = (drawerConfig = {}) => {
    if (Array.isArray(drawerConfig.programs)) {
        return drawerConfig.programs;
    }

    const legacyHoles = Array.isArray(drawerConfig.holes)
        ? drawerConfig.holes
        : null;
    const baseGroups = Array.isArray(drawerConfig.groups)
        ? drawerConfig.groups
        : legacyHoles
            ? [{ id: "legacy-primary", verticalOffset: 0, holes: legacyHoles }]
            : [];
    const additionalGroups = Array.isArray(drawerConfig.cAdditionalGroups)
        ? drawerConfig.cAdditionalGroups
        : [];

    return [
        {
            id: "legra-base",
            name: "Grundprogramm",
            matchKeys: "M,K",
            extendsProgramId: "",
            groups: baseGroups
        },
        ...(additionalGroups.length > 0 ? [{
            id: "legra-c",
            name: "Zusatzprogramm C",
            matchKeys: "C",
            extendsProgramId: "legra-base",
            groups: additionalGroups
        }] : [])
    ];
};

export const getDrawerProgramKeys = drawerConfig => Array.from(new Set(
    createDrawerProgramsFromLegacy(drawerConfig)
        .flatMap(program => parseMatchKeys(program.matchKeys))
));

export const getDrawerFrontGroups = (drawerConfig = {}, variant = "M") => {
    const programs = createDrawerProgramsFromLegacy(drawerConfig);
    const programById = new Map(programs.map(program => [String(program.id), program]));
    const targetKey = String(variant).trim().toUpperCase();
    const matchingPrograms = programs.filter(program => parseMatchKeys(program.matchKeys).includes(targetKey));
    const roots = matchingPrograms.length > 0
        ? matchingPrograms
        : programs.filter(program => !program.extendsProgramId).slice(0, 1);
    const resolvedProgramIds = new Set();
    const groups = [];

    const appendProgram = (program, ancestry = new Set()) => {
        if (!program || resolvedProgramIds.has(program.id) || ancestry.has(program.id)) {
            return;
        }

        const nextAncestry = new Set(ancestry).add(program.id);
        const parent = program.extendsProgramId
            ? programById.get(String(program.extendsProgramId))
            : null;
        appendProgram(parent, nextAncestry);
        resolvedProgramIds.add(program.id);
        (program.groups ?? [])
            .filter(group => Array.isArray(group?.holes))
            .forEach(group => groups.push({
                ...group,
                programId: program.id,
                programName: program.name
            }));
    };

    roots.forEach(program => appendProgram(program));
    return groups;
};

export const getFrontBoxPositionFromBottom = ({
    cabinet,
    front,
    fallback = 59
}) => {
    const manual = finite(front?.attachment?.boxPositionFromBottom);

    if (manual !== null) {
        return Math.max(0, manual);
    }

    const match = findFrontLegrabox(cabinet, front);
    const frontY = finite(front?.y);
    const frontHeight = finite(front?.height);

    if (
        Number.isFinite(Number(match?.railY)) &&
        frontY !== null &&
        frontHeight !== null
    ) {
        return Math.max(0, frontY + frontHeight - match.railY);
    }

    return Math.max(0, finite(fallback) ?? 59);
};

export const getInsetFrontGeometry = ({
    cabinet,
    front,
    cncConfig
}) => {
    const match = findFrontLegrabox(cabinet, front);

    if (!match) {
        return null;
    }

    const settings = cabinet.insetFront ?? {};
    const widthClearance = Math.max(0, finite(settings.widthClearance) ?? 5);
    const heightAddition = finite(settings.heightAddition) ?? 10;
    const bottomClearance = Math.max(0, finite(settings.bottomClearance) ?? widthClearance / 2);
    const sectionX = finite(match.section.x) ?? 0;
    const sectionY = finite(match.section.y) ?? 0;
    const sectionWidth = finite(match.section.width) ?? 0;
    const sectionHeight = finite(match.section.height) ?? 0;
    const height = Math.max(
        1,
        getLegraboxHeight(cncConfig?.cncDefault ?? cncConfig, match.func.variant ?? "M") + heightAddition
    );
    const width = Math.max(1, sectionWidth - widthClearance);
    const bottom = sectionY + sectionHeight - bottomClearance;

    return {
        x: sectionX + widthClearance / 2,
        y: bottom - height,
        width,
        height,
        sectionId: match.section.id,
        functionId: match.func.id
    };
};

export const updateFrontAttachment = ({
    cabinet,
    frontId,
    changes,
    cncConfig
}) => {
    const fronts = updateTree(cabinet?.fronts ?? [], frontId, front => {
        const wasInset = front.attachment?.type === FRONT_ATTACHMENT_TYPES.INSET_DRAWER;
        const attachment = {
            ...(front.attachment ?? {}),
            ...changes
        };
        const becomesInset = attachment.type === FRONT_ATTACHMENT_TYPES.INSET_DRAWER;

        if (becomesInset && !attachment.outerGeometry) {
            attachment.outerGeometry = {
                x: front.x,
                y: front.y,
                width: front.width,
                height: front.height
            };
        }

        const next = {
            ...front,
            attachment
        };

        if (!becomesInset) {
            if (wasInset && attachment.outerGeometry) {
                return {
                    ...next,
                    ...attachment.outerGeometry
                };
            }

            return next;
        }

        const geometry = getInsetFrontGeometry({
            cabinet,
            front: next,
            cncConfig
        });

        return geometry
            ? {
                ...next,
                ...geometry,
                attachment: {
                    ...attachment,
                    sectionId: geometry.sectionId,
                    functionId: geometry.functionId
                }
            }
            : next;
    });

    return fronts;
};
