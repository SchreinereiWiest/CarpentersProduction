import { splitRect } from "../guillotineSplit";


export function placeStrip(
    strip,
    bestSpace,
    currentPlate,
    freeSpaces,
    settings
) {
    strip.x =
        bestSpace.x;

    strip.y =
        bestSpace.y;

    strip.sheet =
        currentPlate.id;

    strip.id =
        currentPlate.strips.length;

    strip.x = bestSpace.x;
    strip.y = bestSpace.y;

    currentPlate.strips.push(
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