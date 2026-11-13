
import { createPart } from "../createPart.js";
import { getDefaultEdges } from "../get/getDefaultEdges.js";

export const generateSideParts = ({
    cabinet,
    materials,
    nextPID,
    color
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


    const topExists = cabinet.topExists ?? true;
    const bottomExists = cabinet.bottomExists ?? true;
    const topOffset = Number(cabinet.topOffset ?? 0);
    const bottomOffset = Number(cabinet.bottomOffset ?? 0);
    const sideStartY = bottomIsContinuous && topExists
        ? topOffset + thickness
        : 0;
    const sideEndY = bottomIsContinuous && bottomExists
        ? height - bottomOffset - thickness
        : height;
    const sideHeight = Math.max(0, sideEndY - sideStartY);
    const createSide = side => {
        const isRight = side === "right";

        return createPart({

            PID:
                nextPID(),

            name:
                "Seiten",

            type:
                "Seite",

            quantity:
                1,

            L:
                sideHeight,

            B:
                depth  ,

            T:
               thickness  ,

            materialId:
                cabinet.materialId,

            materials,

            color: color,

            edges,

            source: {

            type: "cabinet",

            role: "side",

            continuous: !bottomIsContinuous,

            instances: [{
                id: side,
                side,
                mirrorX: isRight,
                x: isRight ? width - thickness : 0,
                y: sideStartY,
                width: thickness,
                height: sideHeight,
                continuous: !bottomIsContinuous
            }]
        }
        });
    };

    return [createSide("left"), createSide("right")];
};
