import { splitRect } from "../guillotineSplit";


export function placeStrip(
    strip,
    bestSpace,
    nestingPlates,
    freeSpaces,
    settings
) {
    strip.x =
        bestSpace.x;

    strip.y =
        bestSpace.y;

    strip.sheet = bestSpace.space.sheet;

    strip.id = nestingPlates[bestSpace.space.sheet].strips.length;

    strip.x = bestSpace.x;
    strip.y = bestSpace.y;

    nestingPlates[bestSpace.space.sheet].strips.push(
        strip
    );

    const split = splitRect(
        bestSpace.space,
        strip,
        settings
    );

    const newSpaces = split.freeRects;

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