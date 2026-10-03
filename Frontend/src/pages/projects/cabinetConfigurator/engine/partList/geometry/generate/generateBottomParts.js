import { createPart } from "../createPart.js";
import { getDefaultEdges } from "../get/getDefaultEdges";

export const generateBottomPart = ({
    cabinet,
    materials,
    nextPID
}) => {

    const width =
        Number(cabinet.width) || 0;

    const height =
        Number(cabinet.height) || 0;

    const depth =
        Number(cabinet.depth) || 0;

    const thickness =
        Number(cabinet.thickness) || 0;

    const topOffset =
        Number(cabinet.topOffset ?? 0);

    const bottomOffset =
        Number(cabinet.bottomOffset ?? 0);

    const topExists =
        cabinet.topExists ?? true;

    const bottomExists =
        cabinet.bottomExists ?? true;

    const continuous =
        String(
            cabinet.continuous ??
            "side"
        ).toLowerCase();

    const bottomIsContinuous =
        continuous === "bottom";


    const innerWidth =
        Math.max(
            0,
            width - 2 * thickness
        );


    const materialId =
        cabinet.materialId ??
        cabinet.corpusMaterialId ??
        "";

    const edges =
    getDefaultEdges(
        cabinet,
        materials,
        {
            front: true,
            top: false,
            bottom: false
        }
    );


    const instances = [];


    if (
        topExists
    ) {

        const y =
            topOffset;

        const centerY =
            y +
            thickness / 2;


        instances.push({

            id:
                "top",

            role:
                "top",

            x:
                thickness,

            y,

            width: bottomIsContinuous ? width : innerWidth,

            height:
                thickness,

            centerY,

            continuous: bottomIsContinuous
                

        });

    }


    if (
        bottomExists
    ) {

        const y =
            height -
            bottomOffset -
            thickness;

        const centerY =
            y +
            thickness / 2;


        instances.push({

            id:
                "bottom",

            role:
                "bottom",

            x:
                thickness,

            y,

            width:
                bottomIsContinuous ? width : innerWidth,

            height:
                thickness,

            centerY,

            continuous: bottomIsContinuous
                

        });

    }


    if (
        instances.length === 0
    ) {

        return null;

    }


    return createPart({

        PID:
            nextPID(),

        name:
            "Boden",

        type:
            "Boden",

        quantity:
            instances.length,

        L:
            bottomIsContinuous ? width : innerWidth,

        B:
            depth,

        T:
            thickness,

        materialId:
            cabinet.materialId,

        materials,

        edges,

        source: {

            type:
                "cabinet",

            role:
                "horizontalPanel",

            continuousReference:
                continuous,

            continuous:
                bottomIsContinuous,

            instances

        }

    });

};