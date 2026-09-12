import { nestStrips } from "./nestingPlate";
import { createStrips } from "./createStrip"

export function nestWithRemainingPlates(
    sortedPlates,
    defaultPlate,
    settings
) {

    const nestingPlates = [];

    const allStrips = [];

    let remainingPlates = [
        ...sortedPlates
    ];


    /*
     * =====================================
     * RESTPLATTEN
     * =====================================
     */


    for (
        const remainingPlate of settings.remainingPlates
    ) {

        if (
            remainingPlates.length === 0
        ) {
            break;
        }


        /*
         * Settings für aktuelle Restplatte
         */

        const remainingSettings = {
            ...settings,

            defaultSheet: {
                ...settings.defaultSheet,

                width: remainingPlate.X,
                height: remainingPlate.Y
            }
        };


        /*
         * =====================================
         * Strips erzeugen
         * =====================================
         */

        const strips =
            createStrips(
                remainingPlates,
                remainingSettings
            );


        if (
            strips.length === 0
        ) {
            continue;
        }


        /*
         * =====================================
         * Nesting durchführen
         * =====================================
         */

        const possibleNestingPlates =
            nestStrips(
                strips,
                remainingSettings.defaultSheet,
                remainingSettings
            );

        if (
            possibleNestingPlates.length === 0
        ) {
            continue;
        }

        // /*
        //  * =====================================
        //  * Beste Restplatten-Nutzung suchen
        //  * =====================================
        //  */

        let bestNestingPlate = null;
        let bestUtilization = -1;

        for (
            const nestingPlate
            of possibleNestingPlates
        ) {

            const usedArea =
                nestingPlate.strips.reduce(
                    (sum, plate) =>
                        sum +
                        plate.width *
                        plate.height,
                    0
                );

            const availableArea =
                nestingPlate.width *
                nestingPlate.height;

            const utilization =
                availableArea > 0
                    ? usedArea / availableArea
                    : 0;


            if (
                utilization >
                bestUtilization
            ) {

                bestUtilization =
                    utilization;

                bestNestingPlate =
                    nestingPlate;
            }

        }

        const sheetId = nestingPlates.length;

        const usedStrips = bestNestingPlate.strips;

        usedStrips.forEach((object, index) => {
            object.id = allStrips.length + index;
            object.sheet = nestingPlates.length;
        });

        allStrips.push(...usedStrips);
         
        bestNestingPlate = {
            ...bestNestingPlate,

            id: sheetId,

        };


        nestingPlates.push(
            bestNestingPlate
        );

        for (const usedStrip of usedStrips) {

    remainingPlates = remainingPlates.filter(
        plate =>
            !usedStrip.plates.some(
                usedPlate =>
                    usedPlate.id === plate.id
            )
    );

}
        
    }

    const strips = createStrips(
        remainingPlates,
        settings
    );

    strips.forEach((object, index) => {
            object.id = allStrips.length + index;
        });

    allStrips.push(...strips);

    const nestingPlate = nestStrips(
            strips,
            defaultPlate,
            settings
        );

    nestingPlate.forEach((object, index) => {
            object.id = nestingPlates.length + index;

            for (const strip of object.strips) {
                allStrips[strip.id].sheet = nestingPlates.length + index;
            }
        });

    nestingPlates.push(
        ...nestingPlate
        );

    return {
        nestingPlates,

        strips: allStrips,

        remainingPlates
    };
}