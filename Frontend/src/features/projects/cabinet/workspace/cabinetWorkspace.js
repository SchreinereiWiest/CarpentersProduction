import { createId } from "@Engine/shared/id.js";
import { createAvailableSection } from "@Engine/cabinet/cabinet.js";
import { getMiddleWallCenter } from "@Engine/cabinet/geometry/middleWall.js";
import { reconcileLockedMiddleWalls } from "@Engine/cabinet/sektions/interior/reconcileLockedMiddleWalls.js";
import { evaluateMeasurementExpression } from "../measurementExpressions.js";

export const DEFAULT_PAGE_ID = "cabinet-page-1";
export const DEFAULT_CABINET_GAP = 0;

const numberOr = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

export const ensureCabinetSections = cabinet => {
    if (!cabinet) return cabinet;
    if (Array.isArray(cabinet.sections) && cabinet.sections.length > 0) return cabinet;

    const initialSection = createAvailableSection(cabinet);
    return {
        ...cabinet,
        sections: initialSection ? [initialSection] : [],
        sectionLayout: cabinet.sectionLayout ?? {
            source: "split",
            spec: "1",
            direction: "vertical",
            gap: 0
        }
    };
};

export const createEmptyWorkspace = () => ({
    version: 2,
    activePageId: DEFAULT_PAGE_ID,
    pages: [{ id: DEFAULT_PAGE_ID, name: "Seite 1" }],
    placements: {},
    guides: {
        [DEFAULT_PAGE_ID]: { front: [], interior: [], dual: [] }
    }
});

export const normalizeWorkspace = (workspace, cabinets = []) => {
    const source = workspace && typeof workspace === "object"
        ? workspace
        : createEmptyWorkspace();
    const pages = Array.isArray(source.pages) && source.pages.length > 0
        ? source.pages
            .filter(page => page?.id)
            .map((page, index) => ({
                id: String(page.id),
                name: String(page.name || `Seite ${index + 1}`)
            }))
        : createEmptyWorkspace().pages;
    const pageIds = new Set(pages.map(page => page.id));
    const fallbackPageId = pages[0].id;
    const placements = {};
    let nextX = 0;

    cabinets.forEach(cabinet => {
        const current = source.placements?.[cabinet.id];
        const pageId = pageIds.has(current?.pageId) ? current.pageId : fallbackPageId;
        placements[cabinet.id] = {
            pageId,
            x: numberOr(current?.x, nextX),
            y: numberOr(current?.y, 0),
            groupId: null,
            positionExpressions: current?.groupId
                ? { x: String(numberOr(current?.x, nextX)), y: String(numberOr(current?.y, 0)) }
                : current?.positionExpressions && typeof current.positionExpressions === "object"
                ? current.positionExpressions
                : undefined
        };
        if (!current) nextX += numberOr(cabinet.width, 600) + DEFAULT_CABINET_GAP;
    });

    const isLegacyTopOrigin = numberOr(source.version, 1) < 2;
    Object.values(placements).forEach(placement => {
        if (isLegacyTopOrigin) placement.y = -placement.y;
    });

    const guides = Object.fromEntries(pages.map(page => {
        const pageGuides = source.guides?.[page.id] ?? {};
        return [page.id, {
            front: Array.isArray(pageGuides.front) ? pageGuides.front : [],
            interior: Array.isArray(pageGuides.interior) ? pageGuides.interior : [],
            dual: Array.isArray(pageGuides.dual) ? pageGuides.dual : []
        }];
    }));

    return {
        version: 2,
        activePageId: pageIds.has(source.activePageId) ? source.activePageId : fallbackPageId,
        pages,
        placements,
        guides
    };
};

export const getCabinetsOnPage = (cabinets, workspace, pageId = workspace?.activePageId) =>
    cabinets.filter(cabinet => workspace?.placements?.[cabinet.id]?.pageId === pageId);

export const movePlacementSelection = ({
    workspace,
    activeCabinetId,
    selectedCabinetIds = [],
    axis,
    expression,
    value
}) => {
    const active = workspace?.placements?.[activeCabinetId];
    if (!active || !["x", "y"].includes(axis)) return workspace;
    const activeCoordinate = numberOr(active[axis]);
    const hasValue = Number.isFinite(Number(value));
    const delta = hasValue ? Number(value) - activeCoordinate : 0;
    const targetIds = new Set([
        activeCabinetId,
        ...selectedCabinetIds.filter(id => workspace.placements?.[id]?.pageId === active.pageId)
    ]);
    const placements = { ...workspace.placements };

    targetIds.forEach(id => {
        const placement = placements[id];
        if (!placement) return;
        const nextCoordinate = hasValue ? numberOr(placement[axis]) + delta : numberOr(placement[axis]);
        const positionExpressions = {
            ...(placement.positionExpressions ?? {})
        };
        if (id === activeCabinetId) positionExpressions[axis] = expression;
        else if (hasValue) positionExpressions[axis] = String(nextCoordinate);
        placements[id] = {
            ...placement,
            groupId: null,
            ...(hasValue ? { [axis]: nextCoordinate } : {}),
            positionExpressions
        };
    });

    return { ...workspace, placements };
};

export const resolveWorkspacePlacementExpressions = (workspace, variables = []) => {
    if (!workspace?.placements) return workspace;
    let changed = false;
    const placements = { ...workspace.placements };

    Object.keys(placements).forEach(cabinetId => {
        const reference = placements[cabinetId];
        const expressions = reference?.positionExpressions ?? {};
        const resolved = {};
        ["x", "y"].forEach(axis => {
            if (!String(expressions[axis] ?? "").trim()) return;
            const result = evaluateMeasurementExpression(expressions[axis], variables);
            if (result.valid) resolved[axis] = result.value;
        });
        const x = Object.hasOwn(resolved, "x") ? resolved.x : numberOr(reference.x);
        const y = Object.hasOwn(resolved, "y") ? resolved.y : numberOr(reference.y);
        if (x === numberOr(reference.x) && y === numberOr(reference.y)) return;
        placements[cabinetId] = { ...reference, x, y };
        changed = true;
    });

    return changed ? { ...workspace, placements } : workspace;
};

export const getGuideVariables = (workspace, pageId = workspace?.activePageId) => {
    const pageGuides = workspace?.guides?.[pageId];
    if (!pageGuides) return [];

    return ["front", "interior", "dual"].flatMap(layer =>
        (pageGuides[layer] ?? []).map(guide => ({
                name: guide.name,
                value: Math.round(numberOr(guide.position) * 1000) / 1000,
                unit: "mm",
                label: `${layer === "front" ? "Frontlinie" : layer === "interior" ? "Innenraumlinie" : "Dual-Linie"}: ${guide.name}`,
                status: "guide"
            }))
    );
};

export const resolveWorkspaceGuideExpressions = (workspace, externalVariables = []) => {
    if (!workspace?.guides) return workspace;
    let changed = false;
    const guides = Object.fromEntries(Object.entries(workspace.guides).map(([pageId, pageGuides]) => {
        const layers = ["front", "interior", "dual"];
        let resolved = Object.fromEntries(layers.map(layer => [
            layer,
            (pageGuides?.[layer] ?? []).map(guide => ({ ...guide }))
        ]));
        const allGuides = layers.flatMap(layer => resolved[layer]);
        const guideByName = new Map(allGuides.map(guide => [String(guide.name).toLocaleUpperCase("de-DE"), guide]));
        const dependencies = new Map(allGuides.map(guide => {
            const identifiers = String(guide.expression ?? "").match(/[\p{L}_][\p{L}\p{N}_]*/gu) ?? [];
            return [guide.id, identifiers
                .map(name => guideByName.get(name.toLocaleUpperCase("de-DE"))?.id)
                .filter(Boolean)];
        }));
        const cyclicGuideIds = new Set();
        const visited = new Set();
        const visit = (guideId, path = []) => {
            const cycleIndex = path.indexOf(guideId);
            if (cycleIndex >= 0) {
                path.slice(cycleIndex).forEach(id => cyclicGuideIds.add(id));
                cyclicGuideIds.add(guideId);
                return;
            }
            if (visited.has(guideId)) return;
            (dependencies.get(guideId) ?? []).forEach(dependencyId => visit(dependencyId, [...path, guideId]));
            visited.add(guideId);
        };
        allGuides.forEach(guide => visit(guide.id));

        for (let pass = 0; pass < allGuides.length + 1; pass += 1) {
            let passChanged = false;
            const lineVariables = layers.flatMap(layer => resolved[layer]).map(guide => ({
                name: guide.name,
                value: numberOr(guide.position)
            }));
            resolved = Object.fromEntries(layers.map(layer => [layer, resolved[layer].map(guide => {
                if (!String(guide.expression ?? "").trim() || cyclicGuideIds.has(guide.id)) return guide;
                const variables = [...externalVariables, ...lineVariables].filter(variable =>
                    String(variable?.name).toLocaleUpperCase("de-DE") !== String(guide.name).toLocaleUpperCase("de-DE")
                );
                const result = evaluateMeasurementExpression(guide.expression, variables);
                if (!result.valid || Object.is(result.value, guide.position)) return guide;
                passChanged = true;
                return { ...guide, position: result.value };
            })]));
            if (!passChanged) break;
        }

        layers.forEach(layer => {
            if (resolved[layer].some((guide, index) => guide.position !== (pageGuides?.[layer] ?? [])[index]?.position)) {
                changed = true;
            }
        });
        return [pageId, resolved];
    }));

    return changed ? { ...workspace, guides } : workspace;
};

const childrenOf = item => Array.isArray(item?.children) ? item.children : [];

const updateTree = (items, id, updater) => items.map(item => {
    if (item.id === id) return updater(item);
    const children = childrenOf(item);
    return children.length ? { ...item, children: updateTree(children, id, updater) } : item;
});

const leafItems = items => items.flatMap(item => {
    const children = childrenOf(item);
    return children.length ? leafItems(children) : [item];
});

const splitFrontAtGuide = ({ cabinet, guide, placement }) => {
    const orientation = guide.orientation === "vertical" ? "vertical" : "horizontal";
    const coordinate = orientation === "horizontal"
        ? numberOr(cabinet.height) + numberOr(placement?.y) - numberOr(guide.position)
        : numberOr(guide.position) - numberOr(placement?.x);
    const gap = Math.max(0, numberOr(cabinet.frontGap, 3));
    const currentFronts = Array.isArray(cabinet.fronts) && cabinet.fronts.length > 0
        ? cabinet.fronts
        : [{
            id: createId(),
            type: "front",
            name: "Front 1",
            materialId: cabinet.frontMaterialId,
            x: numberOr(cabinet.frontGapLeft),
            y: numberOr(cabinet.frontGapTop),
            width: Math.max(0, numberOr(cabinet.width) - numberOr(cabinet.frontGapLeft) - numberOr(cabinet.frontGapRight)),
            height: Math.max(0, numberOr(cabinet.height) - numberOr(cabinet.frontGapTop) - numberOr(cabinet.frontGapBottom)),
            children: []
        }];
    const leaf = leafItems(currentFronts).find(front => {
        const start = orientation === "horizontal" ? numberOr(front.y) : numberOr(front.x);
        const size = orientation === "horizontal" ? numberOr(front.height) : numberOr(front.width);
        return coordinate > start + gap / 2 && coordinate < start + size - gap / 2;
    });
    if (!leaf) return cabinet;

    const start = orientation === "horizontal" ? numberOr(leaf.y) : numberOr(leaf.x);
    const totalSize = orientation === "horizontal" ? numberOr(leaf.height) : numberOr(leaf.width);
    const firstSize = coordinate - start - gap / 2;
    const secondSize = totalSize - firstSize - gap;
    if (firstSize <= 0 || secondSize <= 0) return cabinet;

    const direction = orientation === "horizontal" ? "vertical" : "horizontal";
    const makeChild = (index, position, size) => ({
        ...leaf,
        id: createId(),
        parentId: leaf.id,
        name: `${leaf.name || "Front"}.${index + 1}`,
        x: direction === "vertical" ? leaf.x : numberOr(leaf.x) + position,
        y: direction === "vertical" ? numberOr(leaf.y) + position : leaf.y,
        width: direction === "vertical" ? leaf.width : size,
        height: direction === "vertical" ? size : leaf.height,
        gapTop: direction === "vertical" && index > 0 ? gap : 0,
        gapBottom: direction === "vertical" && index === 0 ? gap : 0,
        gapLeft: direction === "horizontal" && index > 0 ? gap : 0,
        gapRight: direction === "horizontal" && index === 0 ? gap : 0,
        children: []
    });
    const children = [
        makeChild(0, 0, firstSize),
        makeChild(1, firstSize + gap, secondSize)
    ];

    return {
        ...cabinet,
        fronts: updateTree(currentFronts, leaf.id, front => ({
            ...front,
            guideId: guide.id,
            splitDirection: direction,
            splitSpec: `${firstSize}mm:${secondSize}mm`,
            children
        }))
    };
};

const addInteriorWallAtGuide = ({ cabinet, guide, placement }) => {
    const orientation = guide.orientation === "vertical" ? "vertical" : "horizontal";
    const coordinate = orientation === "horizontal"
        ? numberOr(cabinet.height) + numberOr(placement?.y) - numberOr(guide.position)
        : numberOr(guide.position) - numberOr(placement?.x);
    const sections = Array.isArray(cabinet.sections) ? cabinet.sections : [];
    const targets = leafItems(sections).filter(section => {
        const start = orientation === "horizontal" ? numberOr(section.y) : numberOr(section.x);
        const size = orientation === "horizontal" ? numberOr(section.height) : numberOr(section.width);
        return coordinate >= start && coordinate <= start + size;
    });
    if (targets.length === 0) return cabinet;

    const nextSections = targets.reduce((result, section) => updateTree(result, section.id, current => {
        const functions = Array.isArray(current.functionConfig) ? current.functionConfig : [];
        const duplicate = functions.some(func => func.type === "middleWall" &&
            (func.orientation ?? "horizontal") === orientation &&
            Math.abs(getMiddleWallCenter({ wall: func, section: current, cabinet }) - coordinate) < 0.5);
        if (duplicate) return current;
        return {
            ...current,
            functionConfig: [...functions, {
                id: createId(),
                type: "middleWall",
                orientation,
                positionReference: orientation === "horizontal" ? "cabinetTop" : "cabinetLeft",
                positionOffset: coordinate,
                absoluteOffset: coordinate,
                guideId: guide.id
            }]
        };
    }), sections);

    return { ...cabinet, sections: nextSections };
};

export const applyGuideToCabinet = ({ cabinet, guide, placement }) => {
    if (!cabinet || !guide) return cabinet;
    if (guide.layer === "dual") {
        return addInteriorWallAtGuide({
            cabinet: splitFrontAtGuide({ cabinet, guide, placement }),
            guide,
            placement
        });
    }
    return guide.layer === "front"
        ? splitFrontAtGuide({ cabinet, guide, placement })
        : addInteriorWallAtGuide({ cabinet, guide, placement });
};

export const syncCabinetToGuides = ({ cabinet, placement, guides = [] }) => {
    const guidesById = new Map(guides.map(guide => [guide.id, guide]));
    let sectionsChanged = false;
    let frontsChanged = false;

    const syncSections = sections => sections.map(section => {
        let sectionChanged = false;
        const functionConfig = (section.functionConfig ?? []).map(func => {
            const guide = guidesById.get(func.guideId);
            if (!guide || func.type !== "middleWall") return func;
            const orientation = guide.orientation === "vertical" ? "vertical" : "horizontal";
            const coordinate = orientation === "horizontal"
                ? numberOr(cabinet.height) + numberOr(placement?.y) - numberOr(guide.position)
                : numberOr(guide.position) - numberOr(placement?.x);
            if (func.orientation === orientation && numberOr(func.positionOffset) === coordinate) return func;
            sectionChanged = true;
            return {
                ...func,
                orientation,
                positionReference: orientation === "horizontal" ? "cabinetTop" : "cabinetLeft",
                positionOffset: coordinate,
                absoluteOffset: coordinate
            };
        });
        const previousChildren = section.children ?? [];
        const children = syncSections(previousChildren);
        const childrenChanged = children.some((child, index) => child !== previousChildren[index]);
        if (!sectionChanged && !childrenChanged) return section;
        sectionsChanged = true;
        return { ...section, functionConfig, children };
    });

    const syncFronts = fronts => fronts.map(front => {
        let next = front;
        const guide = guidesById.get(front.guideId);
        const children = front.children ?? [];
        if (guide && children.length === 2) {
            const horizontal = guide.orientation === "horizontal";
            const coordinate = horizontal
                ? numberOr(cabinet.height) + numberOr(placement?.y) - numberOr(guide.position)
                : numberOr(guide.position) - numberOr(placement?.x);
            const start = horizontal ? numberOr(front.y) : numberOr(front.x);
            const total = horizontal ? numberOr(front.height) : numberOr(front.width);
            const gap = Math.max(0, numberOr(cabinet.frontGap, 3));
            const firstSize = coordinate - start - gap / 2;
            const secondSize = total - firstSize - gap;
            if (firstSize > 0 && secondSize > 0) {
                const direction = horizontal ? "vertical" : "horizontal";
                const updatedChildren = children.map((child, index) => ({
                    ...child,
                    x: direction === "vertical" ? front.x : numberOr(front.x) + (index === 0 ? 0 : firstSize + gap),
                    y: direction === "vertical" ? numberOr(front.y) + (index === 0 ? 0 : firstSize + gap) : front.y,
                    width: direction === "vertical" ? front.width : (index === 0 ? firstSize : secondSize),
                    height: direction === "vertical" ? (index === 0 ? firstSize : secondSize) : front.height
                }));
                const geometryChanged = updatedChildren.some((child, index) =>
                    child.x !== children[index].x || child.y !== children[index].y ||
                    child.width !== children[index].width || child.height !== children[index].height
                );
                if (geometryChanged) {
                    next = { ...front, children: updatedChildren };
                    frontsChanged = true;
                }
            }
        }
        const previousChildren = next.children ?? [];
        const syncedChildren = syncFronts(previousChildren);
        if (syncedChildren.some((child, index) => child !== previousChildren[index])) {
            next = { ...next, children: syncedChildren };
            frontsChanged = true;
        }
        return next;
    });

    const sections = syncSections(cabinet.sections ?? []);
    const fronts = syncFronts(cabinet.fronts ?? []);
    const synced = sectionsChanged || frontsChanged ? { ...cabinet, sections, fronts } : cabinet;
    const reconciled = reconcileLockedMiddleWalls(synced);
    return JSON.stringify(reconciled) === JSON.stringify(cabinet) ? cabinet : reconciled;
};

