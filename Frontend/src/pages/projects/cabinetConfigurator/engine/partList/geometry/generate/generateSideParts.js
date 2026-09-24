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

        return createPart({

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

            source: {
                type:
                    "cabinet",

                role:
                    "side"
            }
        });
};