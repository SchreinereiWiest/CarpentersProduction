import { getCarcassPartsGeometry } from "../partGeometry";
import { getDefaultEdges } from "../get/getDefaultEdges";
import { createPart } from "../createPart";



export const generateSideParts = ({
    cabinet,
    materials,
    nextPID
}) => {

    const geometry =
        getCarcassPartsGeometry(
            cabinet
        );


    const parts = [];


    const edges =
        getDefaultEdges(
            cabinet,
            materials,
            {
                front: true,
                top: true,
                bottom: true
            }
        );


    parts.push(

        createPart({

            PID:
                nextPID(),

            name:
                "Seiten",

            type:
                "Seite",

            quantity:
                2,

            L:
                geometry.side.L,

            B:
                geometry.side.B,

            T:
                geometry.side.T,

            materialId:
                cabinet.materialId,

            materials,

            edges,

            position: {
                left: {
                    x: 0,
                    y: 0,
                    z: 0
                },

                right: {
                    x:
                        Number(cabinet.width) -
                        Number(cabinet.thickness),

                    y: 0,
                    z: 0
                }
            },

            source: {
                type:
                    "cabinet",

                role:
                    "side"
            }
        })
    );


    return parts;
};