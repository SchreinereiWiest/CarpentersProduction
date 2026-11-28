import { createId } from "../../../shared/id.js";
import { getMiddleWallCenter } from "../../geometry/middleWall.js";

const numberOr = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const overlaps = (start, end, bandStart, bandEnd) =>
    end > bandStart + 0.001 && start < bandEnd - 0.001;

const sameCrossAxis = (section, target, orientation) => {
    const startKey = orientation === "horizontal" ? "x" : "y";
    const sizeKey = orientation === "horizontal" ? "width" : "height";
    return Math.abs(numberOr(section[startKey]) - numberOr(target[startKey])) < 0.5 &&
        Math.abs(numberOr(section[sizeKey]) - numberOr(target[sizeKey])) < 0.5;
};

const cabinetOnlyMeasurementExpressions = expressions => {
    if (!expressions || typeof expressions !== "object") return expressions;
    const next = Object.fromEntries(Object.entries(expressions).filter(([path]) =>
        !path.startsWith("position.section")
    ));
    return Object.keys(next).length > 0 ? next : undefined;
};

const replaceAtLevel = ({ items, selectedId, cabinet, wall }) => {
    const selected = items.find(item => item.id === selectedId);
    if (!selected) {
        let changed = false;
        let wallSection = null;
        const nested = items.map(item => {
            if (!Array.isArray(item.children) || item.children.length === 0) return item;
            const result = replaceAtLevel({ items: item.children, selectedId, cabinet, wall });
            if (!result.changed) return item;
            changed = true;
            wallSection = result.wallSection ?? wallSection;
            return { ...item, children: result.items };
        });
        return { changed, items: nested, wallSection };
    }

    const orientation = wall.orientation === "vertical" ? "vertical" : "horizontal";
    const axisStart = orientation === "horizontal" ? "y" : "x";
    const axisSize = orientation === "horizontal" ? "height" : "width";
    const thickness = Math.max(0.001, numberOr(cabinet.thickness, 19));
    const center = getMiddleWallCenter({ wall, section: selected, cabinet });
    const bandStart = center - thickness / 2;
    const bandEnd = center + thickness / 2;
    const matching = items.filter(item => sameCrossAxis(item, selected, orientation));
    const totalStart = Math.min(...matching.map(item => numberOr(item[axisStart])));
    const totalEnd = Math.max(...matching.map(item => numberOr(item[axisStart]) + numberOr(item[axisSize])));
    const lockedStart = Math.max(totalStart, bandStart);
    const lockedEnd = Math.min(totalEnd, bandEnd);
    if (!(lockedEnd > lockedStart)) return { changed: false, items, wallSection: null };

    const affected = matching.filter(item => overlaps(
        numberOr(item[axisStart]),
        numberOr(item[axisStart]) + numberOr(item[axisSize]),
        lockedStart,
        lockedEnd
    ));
    if (affected.length === 0) return { changed: false, items, wallSection: null };
    const affectedIds = new Set(affected.map(item => item.id));
    const lockGroupId = createId();
    const restoreSections = affected.map(item => ({ ...item }));
    const remainingFunctions = (selected.functionConfig ?? []).filter(func => func.id !== wall.id);
    let functionsAssigned = false;
    const replacements = [];

    affected.forEach(item => {
        const start = numberOr(item[axisStart]);
        const end = start + numberOr(item[axisSize]);
        const slices = [
            { start, end: Math.min(end, lockedStart) },
            { start: Math.max(start, lockedEnd), end }
        ].filter(slice => slice.end - slice.start > 0.001);

        slices.forEach((slice, index) => {
            const keepId = item.id === selected.id && index === 0;
            const functions = item.id === selected.id && !functionsAssigned
                ? remainingFunctions
                : (item.functionConfig ?? []).filter(func => func.id !== wall.id);
            if (item.id === selected.id && !functionsAssigned) functionsAssigned = true;
            replacements.push({
                ...item,
                id: keepId ? item.id : createId(),
                lockedMiddleWallGroupId: lockGroupId,
                name: `${item.name || "Section"}${slices.length > 1 ? ` ${index + 1}` : ""}`,
                [axisStart]: slice.start,
                [axisSize]: slice.end - slice.start,
                functionConfig: functions,
                children: []
            });
        });
    });

    const wallSection = {
        id: createId(),
        type: "section",
        parentId: selected.parentId ?? null,
        name: "Mittelwand",
        x: orientation === "horizontal" ? numberOr(selected.x) : lockedStart,
        y: orientation === "horizontal" ? lockedStart : numberOr(selected.y),
        width: orientation === "horizontal" ? numberOr(selected.width) : lockedEnd - lockedStart,
        height: orientation === "horizontal" ? lockedEnd - lockedStart : numberOr(selected.height),
        functionConfig: [{
            ...wall,
            locked: true,
            positionReference: orientation === "horizontal" ? "cabinetTop" : "cabinetLeft",
            positionOffset: (lockedStart + lockedEnd) / 2,
            absoluteOffset: (lockedStart + lockedEnd) / 2,
            measurementExpressions: cabinetOnlyMeasurementExpressions(wall.measurementExpressions)
        }],
        children: [],
        lockedMiddleWall: true,
        lockedMiddleWallGroupId: lockGroupId,
        lockedMiddleWallRestoreSections: restoreSections
    };

    const next = [
        ...items.filter(item => !affectedIds.has(item.id)),
        ...replacements,
        wallSection
    ].sort((left, right) =>
        numberOr(left[axisStart]) - numberOr(right[axisStart]) ||
        numberOr(left[orientation === "horizontal" ? "x" : "y"]) - numberOr(right[orientation === "horizontal" ? "x" : "y"])
    );
    return { changed: true, items: next, wallSection };
};

export const lockMiddleWallSection = ({ cabinet, sectionId, functionId }) => {
    const findWall = items => {
        for (const item of items ?? []) {
            if (item.id === sectionId) {
                return (item.functionConfig ?? []).find(func => func.id === functionId && func.type === "middleWall") ?? null;
            }
            const nested = findWall(item.children);
            if (nested) return nested;
        }
        return null;
    };
    const wall = findWall(cabinet?.sections);
    if (!cabinet || !wall) return { cabinet, wallSection: null };
    const result = replaceAtLevel({
        items: cabinet.sections ?? [],
        selectedId: sectionId,
        cabinet,
        wall
    });
    return {
        cabinet: result.changed ? { ...cabinet, sections: result.items } : cabinet,
        wallSection: result.wallSection
    };
};

