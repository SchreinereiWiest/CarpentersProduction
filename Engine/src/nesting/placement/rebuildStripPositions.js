import { createEmptyNestingPlate } from "./nestingPlate.js";
import { placeStrip } from "./placeStrip.js";

const EPSILON = 1e-7;

const sameId = (left, right) => String(left) === String(right);

function cloneStrip(strip) {
    return {
        ...strip,
        plates: (strip.plates ?? []).map((plate) => ({ ...plate })),
        cuts: (strip.cuts ?? []).map((cut) => ({ ...cut }))
    };
}

/**
 * Sichert die Reihenfolge und Position aller platzierten Strips mit Ausnahme
 * des Strips, der in den Pool verschoben wird.
 */
export function saveStripPositions(nestingPlates = [], excludedStripId) {
    let order = 0;

    return nestingPlates.flatMap((nestingPlate) =>
        (nestingPlate.strips ?? []).flatMap((strip) => {
            if (sameId(strip.id, excludedStripId)) return [];

            return [{
                strip: cloneStrip(strip),
                sheet: nestingPlate.id,
                x: Number(strip.x) || 0,
                y: Number(strip.y) || 0,
                order: order++
            }];
        })
    );
}

function getPhysicalPlateDimension(plate, dimension, margin) {
    const placedDimension = Number(plate[`placed${dimension}`]);
    if (Number.isFinite(placedDimension) && placedDimension > 0) {
        return placedDimension;
    }

    return (Number(plate[dimension.toLowerCase()]) || 0) + margin * 2;
}

function createRebuiltPlate(sourcePlate, settings) {
    const margin = Math.max(0, Number(settings.margin) || 0);
    const dimensions = {
        width: getPhysicalPlateDimension(sourcePlate, "Width", margin),
        height: getPhysicalPlateDimension(sourcePlate, "Height", margin)
    };
    const emptyPlate = createEmptyNestingPlate(dimensions, settings, sourcePlate.id);

    return {
        ...sourcePlate,
        ...emptyPlate
    };
}

function hasArea(rect) {
    return rect.width > EPSILON && rect.height > EPSILON;
}

function getSeparatorCandidates(positions, axis, cutGap) {
    const candidates = positions.flatMap((position) => {
        const start = axis === "vertical" ? position.x : position.y;
        const size = axis === "vertical"
            ? position.strip.placedWidth
            : position.strip.placedHeight;
        return [start - cutGap, start + size];
    });

    return [...new Set(candidates)].sort((left, right) => left - right);
}

function splitPositionsAt(positions, axis, cutStart, cutGap) {
    const before = [];
    const after = [];

    for (const position of positions) {
        const start = axis === "vertical" ? position.x : position.y;
        const size = axis === "vertical"
            ? position.strip.placedWidth
            : position.strip.placedHeight;
        const end = start + size;

        if (end <= cutStart + EPSILON) {
            before.push(position);
        } else if (start >= cutStart + cutGap - EPSILON) {
            after.push(position);
        } else {
            return null;
        }
    }

    return { before, after };
}

function splitRegion(region, axis, cutStart, cutGap) {
    if (axis === "vertical") {
        const afterX = cutStart + cutGap;
        return {
            before: {
                ...region,
                width: cutStart - region.x
            },
            after: {
                ...region,
                x: afterX,
                width: region.x + region.width - afterX
            },
            cut: {
                sheet: region.sheet,
                x: cutStart,
                y: region.y,
                width: cutGap,
                height: region.height
            }
        };
    }

    const afterY = cutStart + cutGap;
    return {
        before: {
            ...region,
            height: cutStart - region.y
        },
        after: {
            ...region,
            y: afterY,
            height: region.y + region.height - afterY
        },
        cut: {
            sheet: region.sheet,
            x: region.x,
            y: cutStart,
            width: region.width,
            height: cutGap
        }
    };
}

function combinePartition(separator, before, after) {
    return {
        leaves: [...before.leaves, ...after.leaves],
        freeSpaces: [...before.freeSpaces, ...after.freeSpaces],
        cuts: [
            ...(hasArea(separator.cut) ? [separator.cut] : []),
            ...before.cuts,
            ...after.cuts
        ]
    };
}

function partitionSavedPositions(region, positions, cutGap) {
    if (positions.length === 0) {
        return {
            leaves: [],
            freeSpaces: hasArea(region) ? [region] : [],
            cuts: []
        };
    }

    if (positions.length === 1) {
        return {
            leaves: [{ region, savedPosition: positions[0] }],
            freeSpaces: [],
            cuts: []
        };
    }

    const leadingCuts = [
        {
            axis: "vertical",
            start: Math.min(...positions.map((position) => position.x)) - cutGap,
            regionStart: region.x
        },
        {
            axis: "horizontal",
            start: Math.min(...positions.map((position) => position.y)) - cutGap,
            regionStart: region.y
        }
    ];

    for (const candidate of leadingCuts) {
        if (candidate.start <= candidate.regionStart + EPSILON) continue;

        const separator = splitRegion(
            region,
            candidate.axis,
            candidate.start,
            cutGap
        );
        const after = partitionSavedPositions(separator.after, positions, cutGap);
        if (!after) continue;

        const before = partitionSavedPositions(separator.before, [], cutGap);
        return combinePartition(separator, before, after);
    }

    for (const axis of ["vertical", "horizontal"]) {
        const regionStart = axis === "vertical" ? region.x : region.y;
        const regionEnd = axis === "vertical"
            ? region.x + region.width
            : region.y + region.height;
        const candidates = getSeparatorCandidates(positions, axis, cutGap);

        for (const cutStart of candidates) {
            if (
                cutStart <= regionStart + EPSILON ||
                cutStart + cutGap >= regionEnd - EPSILON
            ) {
                continue;
            }

            const dividedPositions = splitPositionsAt(
                positions,
                axis,
                cutStart,
                cutGap
            );
            if (
                !dividedPositions ||
                dividedPositions.before.length === 0 ||
                dividedPositions.after.length === 0
            ) {
                continue;
            }

            const separator = splitRegion(region, axis, cutStart, cutGap);
            const before = partitionSavedPositions(
                separator.before,
                dividedPositions.before,
                cutGap
            );
            if (!before) continue;

            const after = partitionSavedPositions(
                separator.after,
                dividedPositions.after,
                cutGap
            );
            if (!after) continue;

            return combinePartition(separator, before, after);
        }
    }

    return null;
}

/**
 * Baut die Platten leer neu auf und setzt die gesicherten Strips an ihren
 * bisherigen Koordinaten ein. Die neue Partitionierung und placeStrip erzeugen
 * dabei Cuts, Bauteilpositionen und Freiflächen vollständig neu.
 */
export function rebuildStripsAtSavedPositions(
    sourceNestingPlates = [],
    savedPositions = [],
    settings = {}
) {
    const nestingPlates = sourceNestingPlates.map((plate) =>
        createRebuiltPlate(plate, settings)
    );
    const placedStrips = [];
    const cutGap = Math.max(0, Number(settings.cutGap) || 0);

    for (const nestingPlate of nestingPlates) {
        const positionsForPlate = savedPositions.filter((position) =>
            sameId(position.sheet, nestingPlate.id)
        );
        if (positionsForPlate.length === 0) continue;

        const initialSpace = nestingPlate.freeSpaces[0];
        const partition = partitionSavedPositions(
            initialSpace,
            positionsForPlate,
            cutGap
        );
        if (!partition) {
            throw new Error(
                `Die gespeicherten Strip-Positionen auf Platte ${nestingPlate.id} können nicht wiederhergestellt werden.`
            );
        }

        nestingPlate.freeSpaces = [...partition.freeSpaces];
        nestingPlate.cuts = [...partition.cuts];

        for (const leaf of partition.leaves) {
            const { savedPosition, region } = leaf;
            const strip = cloneStrip(savedPosition.strip);
            const leafSpaces = [region];

            placeStrip(
                strip,
                {
                    x: savedPosition.x,
                    y: savedPosition.y,
                    space: region
                },
                nestingPlates,
                leafSpaces,
                settings
            );
            nestingPlate.freeSpaces.push(...leafSpaces);
            placedStrips.push({ order: savedPosition.order, strip });
        }
    }

    if (placedStrips.length !== savedPositions.length) {
        throw new Error("Nicht alle gespeicherten Strip-Positionen konnten wiederhergestellt werden.");
    }

    const strips = placedStrips
        .sort((left, right) => left.order - right.order)
        .map((entry) => entry.strip);

    return { nestingPlates, strips };
}
