import { canFit } from "../helper/helpers";
import { placeStrip } from "../placement/placeStrip";

export function createEmptyNestingPlate(defaultPlate, settings, id = 0) {
    // Neue manuelle Zielplatten starten mit der gesamten Innenfläche als Freiraum.
    const width = defaultPlate.width - settings.margin * 2;
    const height = defaultPlate.height - settings.margin * 2;

    return {
        id,
        width,
        height,
        placedWidth: defaultPlate.width,
        placedHeight: defaultPlate.height,
        strips: [],
        plates: [],
        cuts: [],
        freeSpaces: [{ sheet: id, x: 0, y: 0, width, height }]
    };
}

export function nestStrips(
    strips,
    defaultPlate,
    settings
) {

    const nestingPlates = [];

    let currentPlate = null;

    let freeSpaces = [];

    for (
        const strip of strips
    ) {

        /*
        =====================================
        Neue Platte erzeugen
        =====================================
        */

        if (
            !currentPlate
        ) {
            currentPlate = createEmptyNestingPlate(defaultPlate, settings, nestingPlates.length);
            nestingPlates.push(currentPlate);
            freeSpaces = [...currentPlate.freeSpaces];
        }




        /*
        =====================================
        Beste freie Fläche suchen
        =====================================
        */

        let bestSpace = null;

        for (const space of freeSpaces) {
            if (!canFit(space, strip.placedWidth, strip.placedHeight)) {
                continue;   
            }

            bestSpace = {x: space.x, y:space.y, space: space};
        }


        /*
        =====================================
        Wenn Strip nicht passt
        =====================================
        */

        if (
            !bestSpace
        ) {

            currentPlate = createEmptyNestingPlate(defaultPlate, settings, nestingPlates.length);
            nestingPlates.push(
                currentPlate
            );

            freeSpaces.push(...currentPlate.freeSpaces);


            /*
            ---------------------------------
            Erneut versuchen
            ---------------------------------
            */

            let newBestSpace = null;

            for (const space of freeSpaces) {
            if (!canFit(space, strip.placedWidth, strip.placedHeight)) {
                continue;   
            }

            newBestSpace = {x: space.x, y:space.y, space: space};
        }

            if (
                !newBestSpace
            ) {

                console.warn(
                    "Strip passt nicht auf Zuschnittplatte",
                    strip
                );

                continue;
            }


            placeStrip(
                strip,
                newBestSpace,
                nestingPlates,
                freeSpaces,
                settings
            );

            continue;
        }


        /*
        =====================================
        Strip platzieren
        =====================================
        */

        placeStrip(
            strip,
            bestSpace,
            nestingPlates,
            freeSpaces,
            settings
        );

    }
    for (const nest of nestingPlates) {

    nest.freeSpaces = freeSpaces.filter(
        space =>
            space.sheet === nest.id
    );
}
    return nestingPlates;
}
