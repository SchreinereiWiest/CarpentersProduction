
import { createPart } from "../createPart.js";
import { getDefaultEdges } from "../get/getDefaultEdges";

export const generateSideParts = ({
    cabinet,
    materials,
    nextPID
}) => {

    const width = Number(cabinet.width) || 0;
    const height = Number(cabinet.height) || 0;
    const depth = Number(cabinet.depth) || 0;
    const thickness = Number(cabinet.thickness) || 0;

    const continuous =
    String(
        cabinet.continuous ??
        "side"
    ).toLowerCase();

    const bottomIsContinuous =
        continuous === "bottom";

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
                bottomIsContinuous ? height - 2 * thickness : height,

            B:
                depth  ,

            T:
               thickness  ,

            materialId:
                cabinet.materialId,

            materials,

            edges,

            source: {

            type: "cabinet",

            role: "side",

            continuous: !bottomIsContinuous,

            instances: [
                {
                    id: "left",
                    side: "left",

                    mirrorX: false,

                    x: 0,
                    y: 0,

                    width: thickness,
                    height: bottomIsContinuous ? height - 2 * thickness : height,

                    continuous: !bottomIsContinuous

                },

                {
                    id: "right",
                    side: "right",

                    mirrorX: true,

                    x:
                        width -
                        thickness,

                    y: 0,

                    width: thickness,
                    height: bottomIsContinuous ? height - 2 * thickness : height,

                    continuous: !bottomIsContinuous
                }
            ]
        }
        });
};