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

                width:
                    defaultPlate.width,

                height:
                    defaultPlate.height,

                strips: [],

                plates: [],

                freeSpaces: []
            };


            nestingPlates.push(
                currentPlate
            );


            freeSpaces = [

                {

                    x: 0,

                    y: 0,

                    width:
                        defaultPlate.width,

                    height:
                        defaultPlate.height
                }
            ];
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

                width:
                    defaultPlate.width,

                height:
                    defaultPlate.height,

                strips: [],

                plates: [],

                freeSpaces: []
            };


            nestingPlates.push(
                currentPlate
            );


            freeSpaces = [

                {

                    x: 0,

                    y: 0,

                    width:
                        defaultPlate.width,

                    height:
                        defaultPlate.height
                }
            ];


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
                currentPlate,
                freeSpaces,
                settings
            );

            currentPlate.freeSpaces = freeSpaces;

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
            currentPlate,
            freeSpaces,
            settings
        );

        currentPlate.freeSpaces = freeSpaces;

    }
    // console.log(freeSpaces);


    return nestingPlates;
}