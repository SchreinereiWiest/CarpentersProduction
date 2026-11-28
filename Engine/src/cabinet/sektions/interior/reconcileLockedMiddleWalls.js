import { getMiddleWallCenter } from "../../geometry/middleWall.js";

const numberOr = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const sameCrossAxis = (left, right, orientation) => {
    const start = orientation === "horizontal" ? "x" : "y";
    const size = orientation === "horizontal" ? "width" : "height";
    return Math.abs(numberOr(left[start]) - numberOr(right[start])) < 0.5 &&
        Math.abs(numberOr(left[size]) - numberOr(right[size])) < 0.5;
};

const reconcileLevel = (items, cabinet, minimumSectionSize) => {
    let next = items.map(item => {
        if (!Array.isArray(item.children) || item.children.length === 0) return item;
        const children = reconcileLevel(item.children, cabinet, minimumSectionSize);
        return children === item.children ? item : { ...item, children };
    });
    let changed = next.some((item, index) => item !== items[index]);

    next.forEach(wallSection => {
        if (!wallSection.lockedMiddleWall) return;
        const wall = (wallSection.functionConfig ?? []).find(func => func.type === "middleWall" && func.locked === true);
        if (!wall) return;
        const orientation = wall.orientation === "vertical" ? "vertical" : "horizontal";
        const axisStart = orientation === "horizontal" ? "y" : "x";
        const axisSize = orientation === "horizontal" ? "height" : "width";
        const matching = next
            .filter(section => sameCrossAxis(section, wallSection, orientation))
            .sort((left, right) => numberOr(left[axisStart]) - numberOr(right[axisStart]));
        const wallIndex = matching.findIndex(section => section.id === wallSection.id);
        const before = matching[wallIndex - 1];
        const after = matching[wallIndex + 1];
        if (!before || !after) return;

        const thickness = numberOr(wallSection[axisSize], numberOr(cabinet.thickness, 19));
        const beforeStart = numberOr(before[axisStart]);
        const afterEnd = numberOr(after[axisStart]) + numberOr(after[axisSize]);
        const desiredCenter = getMiddleWallCenter({ wall, section: wallSection, cabinet });
        const minimumStart = beforeStart + minimumSectionSize;
        const maximumStart = afterEnd - minimumSectionSize - thickness;
        if (maximumStart < minimumStart) return;
        const start = Math.min(maximumStart, Math.max(minimumStart, desiredCenter - thickness / 2));
        const center = start + thickness / 2;
        const positionReference = orientation === "horizontal"
            ? wall.positionReference === "cabinetBottom" ? "cabinetBottom" : "cabinetTop"
            : wall.positionReference === "cabinetRight" ? "cabinetRight" : "cabinetLeft";
        const positionOffset = positionReference === "cabinetBottom"
            ? numberOr(cabinet.height) - center
            : positionReference === "cabinetRight"
                ? numberOr(cabinet.width) - center
                : center;
        const nextBefore = { ...before, [axisSize]: start - beforeStart };
        const nextAfterStart = start + thickness;
        const nextAfter = {
            ...after,
            [axisStart]: nextAfterStart,
            [axisSize]: afterEnd - nextAfterStart
        };
        const nextWall = {
            ...wallSection,
            [axisStart]: start,
            [axisSize]: thickness,
            functionConfig: (wallSection.functionConfig ?? []).map(func => func.id === wall.id
                ? {
                    ...func,
                    positionReference,
                    positionOffset,
                    absoluteOffset: center
                }
                : func)
        };
        const replacements = new Map([
            [before.id, nextBefore],
            [wallSection.id, nextWall],
            [after.id, nextAfter]
        ]);
        next = next.map(section => replacements.get(section.id) ?? section);
        changed = true;
    });

    if (!changed || JSON.stringify(next) === JSON.stringify(items)) return items;
    return next;
};

export const reconcileLockedMiddleWalls = (cabinet, { minimumSectionSize = 1 } = {}) => {
    if (!Array.isArray(cabinet?.sections)) return cabinet;
    const sections = reconcileLevel(cabinet.sections, cabinet, minimumSectionSize);
    return sections === cabinet.sections ? cabinet : { ...cabinet, sections };
};
