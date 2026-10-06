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
import { getDefaultEdges } from "../get/getDefaultEdges";

const getSource = (part) => {
    return (
        part?.Source ??
        part?.source ??
        {}
    );
};


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
 * Mittelwand-Mittelpunkt bestimmen
 * ------------------------------------------------------------
 */

const getMiddleWallCenter = ({
    wall,
    section,
    cabinet
}) => {

    const orientation =
        wall.orientation ??
        "horizontal";

    const offset =
        Number(
            wall.positionOffset ?? 0
        );

    const sectionX =
        Number(section.x) || 0;

    const sectionY =
        Number(section.y) || 0;

    const sectionWidth =
        Number(section.width) || 0;

    const sectionHeight =
        Number(section.height) || 0;

    const cabinetWidth =
        Number(cabinet.width) || 0;

    const cabinetHeight =
        Number(cabinet.height) || 0;


    if (
        orientation === "vertical"
    ) {

        switch (
            wall.positionReference
        ) {

            case "cabinetLeft":
                return offset;

            case "cabinetRight":
                return (
                    cabinetWidth -
                    offset
                );

            case "sectionLeft":
                return (
                    sectionX +
                    offset
                );

            case "sectionRight":
                return (
                    sectionX +
                    sectionWidth -
                    offset
                );

            default:
                return (
                    sectionX +
                    sectionWidth / 2
                );
        }
    }


    switch (
        wall.positionReference
    ) {

        case "cabinetTop":
            return offset;

        case "cabinetBottom":
            return (
                cabinetHeight -
                offset
            );

        case "sectionTop":
            return (
                sectionY +
                offset
            );

        case "sectionBottom":
            return (
                sectionY +
                sectionHeight -
                offset
            );

        default:
            return (
                sectionY +
                sectionHeight / 2
            );
    }
};


/*
 * ------------------------------------------------------------
 * Sections rekursiv durchlaufen
 * ------------------------------------------------------------
 */

const flattenSections = (
    sections
) => {

    const result = [];


    const walk = (
        list
    ) => {

        (
            list ?? []
        ).forEach(
            section => {

                result.push(section);

                if (
                    Array.isArray(
                        section.children
                    ) &&
                    section.children.length
                ) {
                    walk(
                        section.children
                    );
                }
            }
        );
    };


    walk(sections);

    return result;
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
        flattenSections(
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