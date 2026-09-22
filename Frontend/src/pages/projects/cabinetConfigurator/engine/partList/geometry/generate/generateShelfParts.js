import { getDefaultEdges } from "../get/getDefaultEdges";
import { flattenSections } from "../flattenSections";
import { getShelfConfig } from "../get/getShelfConfig";
import { createPart } from "../createPart";


export const generateShelfParts = ({
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
                "shelf"
            ) {
                return;
            }


            const config =
                getShelfConfig(
                    section,
                    cabinet
                );


            if (
                config.quantity <= 0
            ) {
                return;
            }


            const depth =
                config.depth;


            const shelfWidth =
                Number(
                    section.width
                );


            for (
                let i = 0;
                i < config.quantity;
                i++
            ) {

                parts.push(

                    createPart({

                        PID:
                            nextPID(),

                        name:
                            `Fachboden ${i + 1}`,

                        type:
                            "Fächer",

                        quantity:
                            1,

                        L:
                            shelfWidth,

                        B:
                            depth,

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

                        source: {
                            type:
                                "section",

                            role:
                                "shelf",

                            sectionId:
                                section.id
                        }
                    })
                );
            }
        }
    );


    return parts;
};