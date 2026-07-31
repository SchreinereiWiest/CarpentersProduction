import { canFit } from "../helper/helpers";
import { placeStrip } from "../placement/placeStrip";

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

            currentPlate = {

                id:
                    nestingPlates.length,

                width: defaultPlate.width - settings.margin*2,

                height: defaultPlate.height - settings.margin*2,

                placedWidth: defaultPlate.width,

                placedHeight: defaultPlate.height,

                strips: [],

                plates: [],

                freeSpaces: [{

                    sheet: nestingPlates.length,

                    x: 0,

                    y: 0,

                    width: defaultPlate.width - settings.margin*2,

                    height: defaultPlate.height - settings.margin*2
                }]
            };

            nestingPlates.push(
                currentPlate
            );

            freeSpaces = [
                {

                    sheet: nestingPlates.length - 1,

                    x: 0,

                    y: 0,

                    width: defaultPlate.width - settings.margin*2,

                    height: defaultPlate.height - settings.margin*2,
                }
            ]
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

            currentPlate = {

                id:
                    nestingPlates.length,

                width: defaultPlate.width - settings.margin*2,

                height: defaultPlate.height - settings.margin*2,

                placedWidth: defaultPlate.width,

                placedHeight: defaultPlate.height,

                strips: [],

                plates: [],

                freeSpaces: [{

                     sheet: nestingPlates.length,

                    x: 0,

                    y: 0,

                    width: defaultPlate.width - settings.margin*2,

                    height: defaultPlate.height - settings.margin*2,
                }]
            };


            nestingPlates.push(
                currentPlate
            );

            freeSpaces.push(

                {
                     sheet: nestingPlates.length - 1,

                    x: 0,

                    y: 0,

                    width: defaultPlate.width - settings.margin*2,

                    height: defaultPlate.height - settings.margin*2,
                }
            );


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