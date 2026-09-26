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


        let quantity = 0;
        if(cabinet.topExists) {quantity+=1};
        if(cabinet.bottomExists) {quantity+=1};

    return createPart({

        PID:
            nextPID(),

        name:
            "Boden",

        type:
            "Boden",

        quantity: quantity,

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