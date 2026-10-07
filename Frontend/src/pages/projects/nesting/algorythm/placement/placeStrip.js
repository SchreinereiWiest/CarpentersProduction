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
    nestingPlate.cuts = [...(nestingPlate.cuts ?? []), ...split.cuts];

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
