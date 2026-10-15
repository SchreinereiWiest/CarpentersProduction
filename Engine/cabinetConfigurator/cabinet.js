import { createId } from "../utils/id.js";

export function cloneCabinetWithFreshIds(cabinet) {
    const idMap = new Map();

    const cloneValue = value => {
        if (Array.isArray(value)) {
            return value.map(cloneValue);
        }

        if (value && typeof value === "object") {
            return Object.fromEntries(
                Object.entries(value).map(([key, nestedValue]) => {
                    if (key === "id" && nestedValue != null) {
                        const newId = createId();
                        idMap.set(nestedValue, newId);
                        return [key, newId];
                    }

                    return [key, cloneValue(nestedValue)];
                })
            );
        }

        return value;
    };

    const remapReferences = value => {
        if (Array.isArray(value)) {
            value.forEach(remapReferences);
            return;
        }

        if (!value || typeof value !== "object") {
            return;
        }

        Object.entries(value).forEach(([key, nestedValue]) => {
            if (key.endsWith("Id") && idMap.has(nestedValue)) {
                value[key] = idMap.get(nestedValue);
                return;
            }

            remapReferences(nestedValue);
        });
    };

    const clone = cloneValue(cabinet);
    remapReferences(clone);
    return clone;
}

export function createAvailableSection(cabinet) {
    const thickness = Number(cabinet?.thickness) || 0;
    const width = Number(cabinet?.width) || 0;
    const height = Number(cabinet?.height) || 0;
    const topOffset = Number(cabinet?.topOffset ?? 0);
    const bottomOffset = Number(cabinet?.bottomOffset ?? 0);
    const topExists = cabinet?.topExists ?? true;
    const bottomExists = cabinet?.bottomExists ?? true;
    const sectionTop = topOffset + (topExists ? thickness : 0);
    const sectionBottom = height - bottomOffset - (bottomExists ? thickness : 0);
    const sectionHeight = sectionBottom - sectionTop;

    if (width <= 2 * thickness || sectionHeight <= 0) {
        return null;
    }

    return {
        id: createId(),
        type: "section",
        parentId: null,
        name: "Section 1",
        x: thickness,
        y: sectionTop,
        width: width - 2 * thickness,
        height: sectionHeight,
        functionConfig: [],
        children: []
    };
}
