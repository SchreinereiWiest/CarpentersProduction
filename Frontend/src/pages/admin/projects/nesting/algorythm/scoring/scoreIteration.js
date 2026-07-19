


export function scoreIteration(iteration) {

    const usedArea = iteration.placedPlates.reduce(
        (sum, plate) => sum + plate.width * plate.height,
        0
    );

    const wasteArea = iteration.freeRects.reduce(
        (sum, rect) => sum + rect.width * rect.height,
        0
    );

    const usage =
        usedArea + wasteArea > 0
            ? (usedArea / (usedArea + wasteArea)) * 100
            : 0;

    const wasteParts = iteration.freeRects.length;
    const cutCount = iteration.cuts.length;

    const freeArea = wasteArea;

    const avgWasteArea =
        wasteParts > 0
            ? freeArea / wasteParts
            : 0;

    const areaPerSheetPercent =
        freeArea > 0
            ? (avgWasteArea / freeArea) * 100
            : 0;

    const score =
        usage
        - cutCount
        - wasteParts
        + areaPerSheetPercent / 10;

    return {
        score,
        usage,
        usedArea,
        wasteArea,
        wasteParts,
        cutCount,
        avgWasteArea
    };
}