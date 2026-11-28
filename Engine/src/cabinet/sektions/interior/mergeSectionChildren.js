import { createAvailableSection } from "../../cabinet.js";
import { findTreeNode, findTreeParent, updateTree } from "../../../shared/tree.js";

export const findSection = findTreeNode;
export const findParent = findTreeParent;

const numberOr = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const childrenOf = section => Array.isArray(section?.children) ? section.children : [];

const stripLockMetadata = section => {
    const next = { ...section };
    delete next.lockedMiddleWall;
    delete next.lockedMiddleWallGroupId;
    delete next.lockedMiddleWallRestoreSections;
    return next;
};

const unlockedWallFunctions = wallSection => (wallSection?.functionConfig ?? []).map(func => {
    if (func.type !== "middleWall") return func;
    const next = { ...func };
    delete next.locked;
    return next;
});

const sameCrossAxis = (left, right, orientation) => {
    const start = orientation === "horizontal" ? "x" : "y";
    const size = orientation === "horizontal" ? "width" : "height";
    return Math.abs(numberOr(left?.[start]) - numberOr(right?.[start])) < 0.5 &&
        Math.abs(numberOr(left?.[size]) - numberOr(right?.[size])) < 0.5;
};

const mergeLegacyLockedWall = (items, selectedId) => {
    const orderedWalls = items.filter(section => section.lockedMiddleWall === true);
    const wallSection = orderedWalls.find(section => section.id === selectedId) ?? orderedWalls.find(section => {
        const wall = (section.functionConfig ?? []).find(func => func.type === "middleWall");
        const orientation = wall?.orientation === "vertical" ? "vertical" : "horizontal";
        const axis = orientation === "horizontal" ? "y" : "x";
        const matching = items
            .filter(item => sameCrossAxis(item, section, orientation))
            .sort((left, right) => numberOr(left[axis]) - numberOr(right[axis]));
        const index = matching.findIndex(item => item.id === section.id);
        return matching[index - 1]?.id === selectedId || matching[index + 1]?.id === selectedId;
    });
    if (!wallSection) return null;

    const wall = (wallSection.functionConfig ?? []).find(func => func.type === "middleWall");
    const orientation = wall?.orientation === "vertical" ? "vertical" : "horizontal";
    const axisStart = orientation === "horizontal" ? "y" : "x";
    const axisSize = orientation === "horizontal" ? "height" : "width";
    const matching = items
        .filter(section => sameCrossAxis(section, wallSection, orientation))
        .sort((left, right) => numberOr(left[axisStart]) - numberOr(right[axisStart]));
    const wallIndex = matching.findIndex(section => section.id === wallSection.id);
    const before = matching[wallIndex - 1];
    const after = matching[wallIndex + 1];
    if (!before || !after) return null;

    const start = numberOr(before[axisStart]);
    const end = numberOr(after[axisStart]) + numberOr(after[axisSize]);
    const merged = stripLockMetadata({
        ...before,
        [axisStart]: start,
        [axisSize]: end - start,
        functionConfig: [
            ...(before.functionConfig ?? []),
            ...unlockedWallFunctions(wallSection),
            ...(after.functionConfig ?? [])
        ],
        children: []
    });
    const consumedIds = new Set([before.id, wallSection.id, after.id]);
    const firstIndex = Math.min(...[before, wallSection, after].map(section => items.findIndex(item => item.id === section.id)));
    const next = items.filter(section => !consumedIds.has(section.id));
    next.splice(firstIndex, 0, merged);
    return { items: next, selected: merged };
};

const restoreLockedWallAtLevel = (items, selectedId) => {
    const selected = items.find(section => section.id === selectedId);
    if (selected) {
        const groupId = selected.lockedMiddleWallGroupId;
        if (groupId) {
            const wallSection = items.find(section =>
                section.lockedMiddleWall === true && section.lockedMiddleWallGroupId === groupId
            );
            const restoreSections = wallSection?.lockedMiddleWallRestoreSections;
            if (Array.isArray(restoreSections) && restoreSections.length > 0) {
                const groupIndexes = items
                    .map((section, index) => section.lockedMiddleWallGroupId === groupId ? index : -1)
                    .filter(index => index >= 0);
                const insertIndex = Math.min(...groupIndexes);
                const restored = restoreSections.map(stripLockMetadata);
                const next = items.filter(section => section.lockedMiddleWallGroupId !== groupId);
                next.splice(insertIndex, 0, ...restored);
                const restoredSelected = restored.find(section =>
                    (section.functionConfig ?? []).some(func => func.type === "middleWall")
                ) ?? restored[0];
                return { items: next, selected: restoredSelected };
            }
        }

        const legacy = mergeLegacyLockedWall(items, selectedId);
        if (legacy) return legacy;
    }

    for (let index = 0; index < items.length; index += 1) {
        const children = childrenOf(items[index]);
        if (children.length === 0) continue;
        const nested = restoreLockedWallAtLevel(children, selectedId);
        if (!nested) continue;
        const next = [...items];
        next[index] = { ...items[index], children: nested.items };
        return { items: next, selected: nested.selected };
    }

    return null;
};

export const mergeSectionChildren = (
    sectionId,
    activeCabinet,
    updateActiveCabinet,
    setSelectedElement
) => {

    if (!activeCabinet) {
        return;
    }

    const selectedSection =
        findSection(
            activeCabinet.sections ?? [],
            sectionId
        );


    if (!selectedSection) {
        console.warn(
            "Sektion nicht gefunden:",
            sectionId
        );
        return;
    }

    const restoredLockedWall = restoreLockedWallAtLevel(
        activeCabinet.sections ?? [],
        sectionId
    );

    if (restoredLockedWall) {
        updateActiveCabinet({ sections: restoredLockedWall.items });
        setSelectedElement({ ...restoredLockedWall.selected, type: "section" });
        return;
    }


    // =====================================================
    // Parent bestimmen
    //
    // Falls die ausgewählte Section selbst Children hat,
    // kann sie direkt zusammengeführt werden.
    //
    // Falls sie ein Child ist, wird ihr Parent verwendet.
    // =====================================================

    const targetParent = (
        selectedSection.children &&
        selectedSection.children.length > 0
    )
        ? selectedSection
        : findParent(
            activeCabinet.sections ?? [],
            sectionId
        );


    if (!targetParent) {
        const initialSection = createAvailableSection(activeCabinet);
        if (!initialSection) return;
        updateActiveCabinet({
            sections: [initialSection],
            sectionLayout: {
                source: "split",
                spec: "1",
                direction: "vertical",
                gap: 0
            }
        });
        setSelectedElement({ ...initialSection, type: "section" });
        return;
    }


    // =====================================================
    // Nichts zu tun
    // =====================================================

    if (
        !targetParent.children ||
        targetParent.children.length === 0
    ) {

        console.warn(
            "Die Sektion besitzt keine Unterteilungen."
        );

        return;
    }


    // =====================================================
    // Tree rekursiv aktualisieren
    // =====================================================

    const newSections = updateTree(
        activeCabinet.sections ?? [],
        targetParent.id,
        section => ({
            ...section,
            children: [],
            splitDirection: undefined,
            splitSpec: undefined,
            splitGap: undefined
        })
    );


    // =====================================================
    // Cabinet aktualisieren
    // =====================================================

    updateActiveCabinet({
        sections: newSections
    });


    // =====================================================
    // Parent wieder auswählen
    // =====================================================

    const mergedParent =
        findSection(
            newSections,
            targetParent.id
        );


    if (mergedParent) {

        setSelectedElement({
            ...mergedParent,
            type: "section"
        });
    }
};
