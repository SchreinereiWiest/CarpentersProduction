import { splitRect } from "../guillotineSplit";


export function placeStrip(
    strip,
    bestSpace,
    nestingPlates,
    freeSpaces,
    settings
) {
    // Übernimmt den Strip, erzeugt Guillotine-Schnitte und aktualisiert Freiflächen.
    strip.x =
        bestSpace.x;

    strip.y =
        bestSpace.y;

    strip.sheet = bestSpace.space.sheet;

    // strip.id = nestingPlates[bestSpace.space.sheet].strips.length;

    strip.x = bestSpace.x;
    strip.y = bestSpace.y;

    const nestingPlate = nestingPlates.find(
        (plate) => plate.id === bestSpace.space.sheet
    );
    nestingPlate.strips.push(strip);

    // 2D hält die tatsächlichen Bauteile zusätzlich direkt an ihrer Nesting-Platte fest.
    const placedParts = strip.packingMode === "2d"
        ? (strip.plates ?? []).map((part) => {
            const originalWidth = Number(part.originalWidth ?? part.width) || 0;
            const originalHeight = Number(part.originalHeight ?? part.height) || 0;
            const partRotation = Number(part.nestingRotation ?? part.rotation) === 90 ? 90 : 0;
            const partWidth = partRotation === 90 ? originalHeight : originalWidth;
            const partHeight = partRotation === 90 ? originalWidth : originalHeight;
            const footprintWidth = Number(part.nestingFootprintWidth ?? part.width) || partWidth;
            const footprintHeight = Number(part.nestingFootprintHeight ?? part.height) || partHeight;
            const footprintX = Number(part.nestingX) || 0;
            const footprintY = Number(part.nestingY) || 0;
            let localX = footprintX + (footprintWidth - partWidth) / 2;
            let localY = footprintY + (footprintHeight - partHeight) / 2;
            let placedWidth = partWidth;
            let placedHeight = partHeight;
            let placedFootprintX = footprintX;
            let placedFootprintY = footprintY;
            let placedFootprintWidth = footprintWidth;
            let placedFootprintHeight = footprintHeight;

            if (Number(strip.rotation) === 90) {
                localX = strip.height - localY - partHeight;
                localY = footprintX + (footprintWidth - partWidth) / 2;
                placedWidth = partHeight;
                placedHeight = partWidth;
                placedFootprintX = strip.height - footprintY - footprintHeight;
                placedFootprintY = footprintX;
                placedFootprintWidth = footprintHeight;
                placedFootprintHeight = footprintWidth;
            }

            return {
                ...part,
                originalWidth,
                originalHeight,
                width: placedWidth,
                height: placedHeight,
                placedWidth,
                placedHeight,
                rotation: (partRotation + Number(strip.rotation ?? 0)) % 180,
                nestingRotation: (partRotation + Number(strip.rotation ?? 0)) % 180,
                x: strip.x + localX,
                y: strip.y + localY,
                nestingX: strip.x + placedFootprintX,
                nestingY: strip.y + placedFootprintY,
                nestingFootprintX: strip.x + placedFootprintX,
                nestingFootprintY: strip.y + placedFootprintY,
                nestingFootprintWidth: placedFootprintWidth,
                nestingFootprintHeight: placedFootprintHeight,
                sheet: strip.sheet,
                placementId: strip.id
            };
        })
        : [];
    nestingPlate.plates = [
        ...(nestingPlate.plates ?? []),
        ...placedParts
    ];

    const split = splitRect(
        bestSpace.space,
        strip,
        settings
    );

    const newSpaces = split.freeRects;
    // Lokale 2D-Schnitte in die Plattenkoordinaten übertragen.
    const stripCuts = (strip.cuts ?? []).map((cut) => {
        const rotated = Number(strip.rotation) === 90;
        const localX = rotated
            ? strip.height - cut.y - cut.height
            : cut.x;
        const localY = rotated ? cut.x : cut.y;
        const width = rotated ? cut.height : cut.width;
        const height = rotated ? cut.width : cut.height;

        return {
            ...cut,
            sheet: strip.sheet,
            x: strip.x + localX,
            y: strip.y + localY,
            width,
            height,
            stripId: strip.id,
            placementId: strip.id
        };
    });
    const ownedCuts = (split.cuts ?? []).map((cut) => ({
        ...cut,
        stripId: strip.id,
        placementId: strip.id
    }));

    nestingPlate.cuts ??= [];
    nestingPlate.cuts.push(...ownedCuts, ...stripCuts);

    const spaceIndex =
        freeSpaces.indexOf(
            bestSpace.space
        );


    freeSpaces.splice(
        spaceIndex,
        1
    );

    freeSpaces.push(
        ...newSpaces
    );


};
