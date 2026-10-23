import { getLeafFronts } from "../get/getLeafFronts.js";
import { createPart } from "../createPart.js";
import { getMaterialNumber } from "../../materials.js";

export const generateFrontParts = ({
    cabinet,
    materials,
    nextPID,
    color
}) => {

    const parts = [];


    const fronts =
        getLeafFronts(
            cabinet.fronts ?? []
        ).filter(front => !front.isRemoved);

    const hasHorizontalGrain =
        cabinet.frontGrainDirection === "horizontal";


    fronts.forEach(
        (front, index) => {

            const frontThickness =
                Number(
                    cabinet.frontThickness ??
                    cabinet.thickness
                );

            const frontMaterialId =
                cabinet.frontMaterialId ??
                cabinet.materialId;


            const frontEdgeId = cabinet.frontMaterialId;

            const frontEdge =
                getMaterialNumber(
                    materials,
                    frontEdgeId
                );

            parts.push(

                createPart({

                    PID:
                        nextPID(),

                    name:
                        front.name ??
                        `Front ${index + 1}`,

                    type:
                        "Front",

                    quantity:
                        1,

                    L:
                        Number(
                            hasHorizontalGrain
                                ? front.width
                                : front.height
                        ),

                    B:
                        Number(
                            hasHorizontalGrain
                                ? front.height
                                : front.width
                        ),

                    T:
                        frontThickness,

                    materialId:
                        frontMaterialId,

                    materials,

                    color: color,

                    edges: {

                        ELID:
                            frontEdge,

                        ERID:
                            frontEdge,

                        ETID:
                            frontEdge,

                        EBID:
                            frontEdge
                    },

                    position: {

                        x:
                            Number(
                                front.x
                            ),

                        y:
                            Number(
                                front.y
                            ),

                        z: 0
                    },

                    source: {

                        type:
                            "front",

                        frontId:
                            front.id
                    }
                })
            );
        }
    );


    return parts;
};
