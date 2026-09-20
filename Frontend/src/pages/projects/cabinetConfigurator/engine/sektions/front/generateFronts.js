import { createId } from "../../../components/cabinetEditor";
import { calculateSplitSizes } from "../calcSplitSizes";

export const generateFronts = (
    spec,
    direction,
    activeCabinet,
    updateActiveCabinet,
    setSelectedElement
) => {

    const cabinet = activeCabinet;

    if (!cabinet) {
        return;
    }


    const gap =
        Number(cabinet.frontGap ?? 3);


    const totalSize =
        direction === "vertical"
            ? Number(cabinet.height)
            : Number(cabinet.width);


    if (!Number.isFinite(totalSize) || totalSize <= 0) {

        console.error(
            "Ungültige Schrankgröße:",
            totalSize
        );

        return;
    }


    /*
     * Split-Spezifikation berechnen
     *
     * Beispiel:
     *
     * 1:1:1:145mm
     *
     * bei 1000mm und 3mm Fuge:
     *
     * [282, 282, 282, 145]
     */

    const sizes =
        calculateSplitSizes(
            totalSize,
            spec,
            gap
        );


    if (sizes.length === 0) {

        console.warn(
            "Keine gültigen Frontmaße gefunden."
        );

        return;
    }


    console.log(
        "Front-Aufteilung:",
        {
            spec,
            direction,
            totalSize,
            gap,
            sizes
        }
    );


    let position = 0;


    const fronts =
        sizes.map((size, index) => {

            const numericSize =
                Number(size);


            if (
                !Number.isFinite(numericSize) ||
                numericSize <= 0
            ) {

                console.error(
                    "Ungültige Frontgröße:",
                    size
                );

                return null;
            }


            const front = {

                id: createId(),

                type: "front",

                name:
                    `Front ${index + 1}`,


                /*
                 * Position
                 */

                x:
                    direction === "vertical"
                        ? 0
                        : position,

                y:
                    direction === "vertical"
                        ? position
                        : 0,


                /*
                 * Größe
                 */

                width:
                    direction === "vertical"
                        ? Number(cabinet.width)
                        : numericSize,

                height:
                    direction === "vertical"
                        ? numericSize
                        : Number(cabinet.height),


                /*
                 * Fugen
                 */

                gapTop:
                    direction === "vertical" &&
                    index > 0
                        ? gap
                        : 0,

                gapBottom:
                    direction === "vertical" &&
                    index < sizes.length - 1
                        ? gap
                        : 0,

                gapLeft:
                    direction === "horizontal" &&
                    index > 0
                        ? gap
                        : 0,

                gapRight:
                    direction === "horizontal" &&
                    index < sizes.length - 1
                        ? gap
                        : 0
            };


            position +=
                numericSize + gap;


            return front;

        });


    /*
     * Ungültige Einträge entfernen
     */

    const validFronts =
        fronts.filter(Boolean);


    if (validFronts.length === 0) {
        return;
    }


    updateActiveCabinet({
        fronts: validFronts
    });


    setSelectedElement(null);
};