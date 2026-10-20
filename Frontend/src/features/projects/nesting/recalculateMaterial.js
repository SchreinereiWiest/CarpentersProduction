function isSameMaterial(left, right) {
    return String(left?.MID ?? "") === String(right?.MID ?? "")
        && Number(left?.T) === Number(right?.T);
}

export function filterPartListByMaterial(processedContent, material) {
    if (!Array.isArray(processedContent) || !material) return [];

    return processedContent.flatMap((object) => {
        const children = Array.isArray(object.Children) ? object.Children : [];

        if (children.length === 0) {
            return isSameMaterial(object, material)
                ? [{ ...object, Children: [] }]
                : [];
        }

        const matchingChildren = children.filter((child) =>
            isSameMaterial(child, material)
        );

        return matchingChildren.length > 0
            ? [{ ...object, Children: matchingChildren }]
            : [];
    });
}

export function replaceNestingMaterial(nestingResult, activeSheetIndex, recalculatedSheet) {
    if (!Array.isArray(nestingResult) || !recalculatedSheet) return nestingResult;
    if (activeSheetIndex < 0 || activeSheetIndex >= nestingResult.length) return nestingResult;

    return nestingResult.map((sheet, index) =>
        index === activeSheetIndex ? recalculatedSheet : sheet
    );
}
