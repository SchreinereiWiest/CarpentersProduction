import { getCarcassPartsGeometry } from "../partGeometry";
import { getDefaultEdges } from "../get/getDefaultEdges";
import { createPart } from "../createPart";

export const generateBottomPart = ({
    cabinet,
    materials,
    nextPID
}) => {

    const geometry =
        getCarcassPartsGeometry(
            cabinet
        );


    const edges =
        getDefaultEdges(
            cabinet,
            materials,
            {
                front: true,
                top: true,
                bottom: false
            }
        );


    return createPart({

        PID:
            nextPID(),

        name:
            "Boden",

        type:
            "Boden",

        quantity:
            2,

        L:
            geometry.bottom.L,

        B:
            geometry.bottom.B,

        T:
            geometry.bottom.T,

        materialId:
            cabinet.materialId,

        materials,

        edges,

        source: {
            type:
                "cabinet",

            role:
                "bottom"
        }
    });
};