import { getLeafFronts } from "../get/getLeafFronts";
import { createPart } from "../createPart";
import { getMaterialNumber } from "../../materials";

export const generateFrontParts = ({
    cabinet,
    materials,
    nextPID
}) => {

    const parts = [];


    const fronts =
        getLeafFronts(
            cabinet.fronts ?? []
        );


    fronts.forEach(
        (front, index) => {

            const frontThickness =
                Number(
                    cabinet.frontThickness ??
                    cabinet.thickness
                );


            const frontMaterialId =
                front.materialId ??
                cabinet.materialId;


            const frontEdgeId =
                cabinet.frontEdgeMaterialId;


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
                            front.height
                        ),

                    B:
                        Number(
                            front.width
                        ),

                    T:
                        frontThickness,

                    materialId:
                        frontMaterialId,

                    materials,

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