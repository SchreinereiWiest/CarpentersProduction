/**
 * Berechnet die Teilpositionen und Außenmaße des Strips für Scene und Platzierung.
 * Die Drehung verändert seine Geometrie; die Schnittlage bleibt davon unabhängig.
 */
export function getStripLayout(strip, options = {}) {
    const layoutType = options.layoutType ?? strip.layoutType ?? strip.type ?? "vertical";
    const rotation = options.rotation ?? strip.rotation ?? 0;
    const firstPlate = strip.plates?.[0];
    const firstPlateWidth = firstPlate?.originalWidth ?? firstPlate?.width;
    const inferredPartGap = firstPlate
        ? Math.max(0, (firstPlate.width ?? firstPlateWidth) - firstPlateWidth)
        : 0;
    const partGap = options.partGap ?? strip.partGap ?? inferredPartGap;
    const cutGap = options.cutGap ?? strip.cutGap ?? 0;

    let currentX = 0;
    let currentY = 0;
    let baseWidth = 0;
    let baseHeight = 0;

    const isPacked2D = strip.packingMode === "2d";
    const items = (strip.plates ?? []).map((plate) => {
        const originalWidth = plate.originalWidth ?? plate.width;
        const originalHeight = plate.originalHeight ?? plate.height;

        if (isPacked2D) {
            const itemRotation = Number(plate.nestingRotation) === 90 ? 90 : 0;
            const itemWidth = itemRotation === 90 ? originalHeight : originalWidth;
            const itemHeight = itemRotation === 90 ? originalWidth : originalHeight;
            const footprintWidth = plate.nestingFootprintWidth ?? plate.width ?? originalWidth;
            const footprintHeight = plate.nestingFootprintHeight ?? plate.height ?? originalHeight;

            return {
                plate,
                x: plate.nestingX + (footprintWidth - itemWidth) / 2,
                y: plate.nestingY + (footprintHeight - itemHeight) / 2,
                width: itemWidth,
                height: itemHeight
            };
        }

        const footprintWidth = plate.width ?? originalWidth + partGap;
        const footprintHeight = plate.height ?? originalHeight + partGap;
        const itemWidth = layoutType === "horizontal" ? originalHeight : originalWidth;
        const itemHeight = layoutType === "horizontal" ? originalWidth : originalHeight;

        let x;
        let y;

        if (layoutType === "horizontal") {
            x = currentX + (footprintHeight - itemWidth) / 2;
            y = (footprintWidth - itemHeight) / 2;
            currentX += footprintHeight + cutGap;
            baseHeight = Math.max(baseHeight, footprintWidth);
        } else {
            x = (footprintWidth - itemWidth) / 2;
            y = currentY + (footprintHeight - itemHeight) / 2;
            currentY += footprintHeight + cutGap;
            baseWidth = Math.max(baseWidth, footprintWidth);
        }

        return { plate, x, y, width: itemWidth, height: itemHeight };
    });

    if (isPacked2D) {
        baseWidth = strip.width ?? 0;
        baseHeight = strip.height ?? 0;
    } else if (layoutType === "horizontal") {
        baseWidth = Math.max(0, currentX - (items.length ? cutGap : 0));
    } else {
        baseHeight = Math.max(0, currentY - (items.length ? cutGap : 0));
    }

    if (!items.length) {
        baseWidth = strip.width ?? strip.placedWidth ?? 0;
        baseHeight = strip.height ?? strip.placedHeight ?? 0;
    }

    const normalizedRotation = Number(rotation) === 90 ? 90 : 0;
    const rotated = normalizedRotation === 90;
    const placedWidth = rotated ? baseHeight : baseWidth;
    const placedHeight = rotated ? baseWidth : baseHeight;
    const layoutItems = items.map((item) => {
        if (!rotated) return item;

        return {
            ...item,
            x: baseHeight - item.y - item.height,
            y: item.x,
            width: item.height,
            height: item.width
        };
    });

    return {
        layoutType,
        rotation: normalizedRotation,
        width: baseWidth,
        height: baseHeight,
        placedWidth,
        placedHeight,
        items: layoutItems
    };
}

/** Layout-Richtung, Schnittlage und Drehung bleiben unabhängig voneinander.
 * Danach werden die belegten Maße neu berechnet, damit Snapping und Kollision
 * mit der aktualisierten Strip-Geometrie arbeiten.
 */
export function configureStripPlacement(strip, options, settings = {}) {
    const configured = {
        ...strip,
        layoutType: strip.layoutType ?? strip.type ?? "vertical",
        cutOrientation: options.cutOrientation ?? strip.cutOrientation ?? strip.type ?? "vertical",
        rotation: settings.allowRotation === false
            ? 0
            : options.rotation ?? strip.rotation ?? 0,
        partGap: strip.partGap ?? settings.gap,
        cutGap: strip.cutGap ?? settings.cutGap
    };
    const layout = getStripLayout(configured, {
        ...options,
        partGap: configured.partGap,
        cutGap: configured.cutGap
    });

    return {
        ...configured,
        width: layout.width,
        height: layout.height,
        placedWidth: layout.placedWidth,
        placedHeight: layout.placedHeight
    };
}

/**
 * Prüft, ob der Strip vollständig innerhalb der Platte liegt und andere Strips
 * mit dem nötigen Sägespalt nicht überschneidet.
 */
export function canPlaceStrip(plate, strip, x, y, cutGap = 0) {
    const width = strip.placedWidth;
    const height = strip.placedHeight;
    const plateWidth = plate.width ?? plate.placedWidth;
    const plateHeight = plate.height ?? plate.placedHeight;

    if (
        x < 0 ||
        y < 0 ||
        x + width > plateWidth ||
        y + height > plateHeight
    ) {
        return false;
    }

    return !(plate.strips ?? []).some((other) => {
        const gap = Math.max(0, cutGap);
        return (
            x < other.x + other.placedWidth + gap &&
            x + width + gap > other.x &&
            y < other.y + other.placedHeight + gap &&
            y + height + gap > other.y
        );
    });
}

/** Sucht passende Guillotine-Freiflächen und prüft deren obere linke Ecke.
 * Gibt die gültige Ecke zurück, die dem gewünschten Cursor-Placement am
 * nächsten liegt; bei gleichem Abstand wird oben links bevorzugt.
 */
export function findNearestFreeSpace(plate, strip, desiredPosition, cutGap = 0) {
    const candidates = (plate.freeSpaces ?? [])
        .filter((space) => (
            strip.placedWidth <= space.width &&
            strip.placedHeight <= space.height &&
            canPlaceStrip(plate, strip, space.x, space.y, cutGap)
        ))
        .map((space) => ({
            space,
            x: space.x,
            y: space.y,
            distanceSquared:
                (space.x - desiredPosition.x) ** 2 +
                (space.y - desiredPosition.y) ** 2
        }));

    candidates.sort((left, right) =>
        left.distanceSquared - right.distanceSquared ||
        left.y - right.y ||
        left.x - right.x
    );

    return candidates[0] ?? null;
}
