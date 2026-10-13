/*
 * generateMiddleWall.js
 *
 * Erzeugt Mittelwand-Parts aus:
 *
 * section.functionConfig[]
 *
 * Unterstützt:
 * - horizontal
 * - vertical
 *
 * Die Position wird zusätzlich als echte
 * Bauteilgeometrie in source gespeichert.
 */

import { createPart } from "../createPart.js";
import { getDefaultEdges } from "../get/getDefaultEdges.js";
import { getMiddleWallCenter } from "../../../geometry/middleWall.js";
import { flattenTree } from "../../../../utils/tree.js";


const getSectionFunctions = (
    section
) => {

    if (
        !Array.isArray(
            section?.functionConfig
        )
    ) {
        return [];
    }

    return section.functionConfig;
};


/*
 * ------------------------------------------------------------
 * Mittelwände erzeugen
 * ------------------------------------------------------------
 */

export const generateMiddleWallParts = ({
    cabinet,
    materials,
    nextPID,
    color
}) => {

    const thickness =
        Number(cabinet.thickness) || 0;

    const depth =
        Number(cabinet.depth) || 0;

    const sections =
        flattenTree(
            cabinet.sections ?? []
        );

    const parts = [];

    sections.forEach(
        section => {

            const functions =
                getSectionFunctions(
                    section
                );


            functions
                .filter(
                    func =>
                        func.type ===
                        "middleWall"
                )
                .forEach(
                    wall => {

                        const orientation =
                            wall.orientation ??
                            "horizontal";


                        const center =
                            getMiddleWallCenter({
                                wall,
                                section,
                                cabinet
                            });


                        /*
                         * -------------------------------------------------
                         * HORIZONTAL
                         * -------------------------------------------------
                         */

                        if (
                            orientation ===
                            "horizontal"
                        ) {

                            const centerY =
                                Number(center);


                            const x =
                                Number(section.x) ||
                                0;

                            const width =
                                Number(section.width) ||
                                0;


                            const y =
                                centerY -
                                thickness / 2;


                            const part =
                                createPart({

                                    PID: nextPID(),

                                    name:
                                        `Mittelwand ${parts.length + 1}`,

                                    type:
                                        "Mittelwand",

                                    quantity: 1,

                                    L: width,

                                    B: depth,

                                    T: thickness,

                                    materialId:
                                        cabinet.materialId,
            
                                    materials,

                                    color: color,
            
                                    edges:
                                        getDefaultEdges(
                                            cabinet,
                                            materials,
                                            {
                                                front: true,
                                                top: false,
                                                bottom: false
                                            }
                                        ),
                                    

                                    position: {

                                        x,
                                        y,

                                        z: 0
                                    },

                                    source: {

                                        type:
                                            "section",

                                        role:
                                            "middleWall",

                                        orientation:
                                            "horizontal",

                                        sectionId:
                                            section.id,

                                        wallId:
                                            wall.id,

                                        /*
                                         * Echte Geometrie
                                         */
                                        x,

                                        y,

                                        width,

                                        height:
                                            thickness,

                                        centerX:
                                            x +
                                            width / 2,

                                        centerY,

                                        continuous: false
                                    }

                                });


                            parts.push(
                                part
                            );

                            return;
                        }


                        /*
                         * -------------------------------------------------
                         * VERTIKAL
                         * -------------------------------------------------
                         */

                        if (
                            orientation ===
                            "vertical"
                        ) {

                            const centerX =
                                Number(center);


                            const y =
                                Number(section.y) ||
                                0;

                            const height =
                                Number(section.height) ||
                                0;


                            const x =
                                centerX -
                                thickness / 2;


                            const part =
                                createPart({

                                    PID: nextPID(),

                                    name:
                                        `Mittelwand ${parts.length + 1}`,

                                    type:
                                        "Mittelwand",

                                    quantity: 1,

                                    /*
                                     * Bei vertikaler
                                     * Mittelwand:
                                     *
                                     * L = Höhe
                                     * B = Tiefe
                                     */
                                    L:
                                        height,

                                    B:
                                        depth,

                                    T:
                                        thickness,

                                    materialId:
                                        cabinet.materialId,
            
                                    materials,
            
                                    edges:
                                        getDefaultEdges(
                                            cabinet,
                                            materials,
                                            {
                                                front: true,
                                                top: false,
                                                bottom: false
                                            }
                                        ),

                                    position: {

                                        x,
                                        y,

                                        z: 0
                                    },

                                    source: {

                                        type:
                                            "section",

                                        role:
                                            "middleWall",

                                        orientation:
                                            "vertical",

                                        sectionId:
                                            section.id,

                                        wallId:
                                            wall.id,

                                        /*
                                         * Echte Geometrie
                                         */
                                        x,

                                        y,

                                        width:
                                            thickness,

                                        height,

                                        centerX,

                                        centerY:
                                            y +
                                            height / 2,

                                            continuous: false
                                    }

                                });


                            parts.push(
                                part
                            );
                        }
                    }
                );
        }
    );


    return parts;
};
