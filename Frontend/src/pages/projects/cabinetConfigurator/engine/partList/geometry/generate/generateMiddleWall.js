import { flattenSections } from "../flattenSections";
import { createPart } from "../createPart";
import { getMiddleWallCenter } from "../get/getMiddleWall";
import { getDefaultEdges } from "../get/getDefaultEdges";

export const generateMiddleWallParts = ({
    cabinet,
    materials,
    nextPID
}) => {

    const parts = [];


    const sections =
        flattenSections(
            cabinet.sections ?? []
        );


    sections.forEach(
        section => {

            if (
                section.functionType !==
                "middleWall"
            ) {
                return;
            }


            const walls =
                section.functionConfig
                    ?.middleWalls ?? [];


            walls.forEach(
                (wall, index) => {

                    const centerY =
                        getMiddleWallCenter({

                            wall,

                            section,

                            cabinet
                        });


                    parts.push(

                        createPart({

                            PID:
                                nextPID(),

                            name:
                                `Mittelwand ${index + 1}`,

                            type:
                                "Mittelwand",

                            quantity:
                                1,

                            L:
                                Number(
                                    section.width
                                ),

                            B:
                                Number(
                                    cabinet.depth
                                ),

                            T:
                                Number(
                                    cabinet.thickness
                                ),

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
                                x:
                                    Number(
                                        section.x
                                    ),

                                y:
                                    centerY -
                                    Number(
                                        cabinet.thickness
                                    ) / 2,

                                z: 0,

                                centerY
                            },

                            source: {

                                type:
                                    "section",

                                role:
                                    "middleWall",

                                sectionId:
                                    section.id,

                                wallId:
                                    wall.id
                            }
                        })
                    );
                }
            );
        }
    );


    return parts;
};