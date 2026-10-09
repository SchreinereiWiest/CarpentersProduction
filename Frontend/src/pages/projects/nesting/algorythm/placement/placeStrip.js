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
            height
        };
    });
    nestingPlate.cuts = [
        ...(nestingPlate.cuts ?? []),
        ...split.cuts,
        ...stripCuts
    ];

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
