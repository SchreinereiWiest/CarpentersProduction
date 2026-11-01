import { cloneCabinetWithFreshIds } from "../cabinet.js";
import { getAvailableCabinetArea } from "./functions/getAvailableCabinetArea.js";

const childrenOf = section => Array.isArray(section?.children) ? section.children : [];

const relativeBounds = (section, bounds) => ({
    x: bounds.width ? (Number(section.x) - bounds.x) / bounds.width : 0,
    y: bounds.height ? (Number(section.y) - bounds.y) / bounds.height : 0,
    width: bounds.width ? Number(section.width) / bounds.width : 1,
    height: bounds.height ? Number(section.height) / bounds.height : 1
});

const normalizeSection = (section, bounds) => {
    const nextBounds = {
        x: Number(section.x),
        y: Number(section.y),
        width: Number(section.width),
        height: Number(section.height)
    };

    return {
        ...section,
        presetBounds: relativeBounds(section, bounds),
        children: childrenOf(section).map(child => normalizeSection(child, nextBounds))
    };
};

const materializeSection = (section, bounds, parentId = null) => {
    const relative = section.presetBounds ?? { x: 0, y: 0, width: 1, height: 1 };
    const next = {
        ...section,
        parentId,
        x: bounds.x + Number(relative.x || 0) * bounds.width,
        y: bounds.y + Number(relative.y || 0) * bounds.height,
        width: Number(relative.width ?? 1) * bounds.width,
        height: Number(relative.height ?? 1) * bounds.height
    };
    delete next.presetBounds;

    const childBounds = { x: next.x, y: next.y, width: next.width, height: next.height };
    next.children = childrenOf(section).map(child => materializeSection(child, childBounds, next.id));
    return next;
};

export const createFunctionPreset = cabinet => {
    const area = getAvailableCabinetArea(cabinet);
    return {
        sections: (cabinet?.sections ?? []).map(section => normalizeSection(section, area)),
        sectionLayout: cabinet?.sectionLayout ?? null
    };
};

export const applyFunctionPreset = (cabinet, preset) => {
    const cloned = cloneCabinetWithFreshIds({ sections: preset?.sections ?? [] });
    const area = getAvailableCabinetArea(cabinet);

    return {
        sections: cloned.sections.map(section => materializeSection(section, area)),
        sectionLayout: preset?.sectionLayout ?? null
    };
};
