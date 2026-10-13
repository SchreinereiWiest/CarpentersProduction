

import { createId } from "../../../utils/id.js";
import { findTreeNode, updateTree } from "../../../utils/tree.js";
import { calculateSplitSizes } from "../calcSplitSizes.js";


export const splitFront = (
    frontId,
    spec,
    direction,
    activeCabinet,
    updateActiveCabinet,
    setSelectedElement
) => {

    if (!activeCabinet) {
        return;
    }


    const frontGap =
        Number(activeCabinet.frontGap ?? 3);


    /*
     * Front im Baum suchen
     */

    const front = findTreeNode(
        activeCabinet.fronts ?? [],
        frontId
    );


    if (!front) {

        console.warn(
            "Front nicht gefunden:",
            frontId
        );

        return;
    }


    /*
     * Größe bestimmen
     */

    const totalSize =
        direction === "vertical"
            ? Number(front.height)
            : Number(front.width);


    if (
        !Number.isFinite(totalSize) ||
        totalSize <= 0
    ) {

        console.error(
            "Ungültige Frontgröße:",
            front
        );

        return;
    }


    /*
     * Aufteilung berechnen
     */

    const sizes =
        calculateSplitSizes(
            totalSize,
            spec,
            frontGap
        );


    if (sizes.length === 0) {

        console.warn(
            "Keine gültige Aufteilung:",
            spec
        );

        return;
    }


    /*
     * Unterfronten erzeugen
     */

    let position = 0;


    const children =
        sizes.map(
            (size, index) => {

                const numericSize =
                    Number(size);


                const child = {

                    id: createId(),

                    type: "front",

                    name:
                        `${front.name ?? "Front"}.${
                            index + 1
                        }`,

                    parentId:
                        front.id,


                    /*
                     * Position
                     */

                    x:
                        direction === "vertical"
                            ? front.x
                            : front.x + position,

                    y:
                        direction === "vertical"
                            ? front.y + position
                            : front.y,


                    /*
                     * Größe
                     */

                    width:
                        direction === "vertical"
                            ? front.width
                            : numericSize,

                    height:
                        direction === "vertical"
                            ? numericSize
                            : front.height,


                    /*
                     * Fugen
                     */

                    gapTop:
                        direction === "vertical" &&
                        index > 0
                            ? frontGap
                            : 0,

                    gapBottom:
                        direction === "vertical" &&
                        index <
                            sizes.length - 1
                            ? frontGap
                            : 0,

                    gapLeft:
                        direction === "horizontal" &&
                        index > 0
                            ? frontGap
                            : 0,

                    gapRight:
                        direction === "horizontal" &&
                        index <
                            sizes.length - 1
                            ? frontGap
                            : 0,


                    /*
                     * Für spätere Unterteilungen
                     */

                    children: []
                };


                position +=
                    numericSize +
                    frontGap;


                return child;
            }
        );


    /*
     * Front aktualisieren
     */

    const updatedFronts =
        updateTree(
            activeCabinet.fronts ?? [],
            frontId,
            front => ({
                ...front,
                splitDirection: direction,
                splitSpec: spec,
                children
            })
        );


    updateActiveCabinet({
        fronts: updatedFronts
    });


    /*
     * Auswahl auf bestehender Front
     * bestehen lassen.
     */

    setSelectedElement({
        ...front,
        type: "front",
        children
    });
};
