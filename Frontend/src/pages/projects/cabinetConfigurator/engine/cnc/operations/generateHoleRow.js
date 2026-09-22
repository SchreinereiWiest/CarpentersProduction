import { createDrillOperation } from "./DrillOperation";

export const generateHoleRow = ({
    section,
    boardDepth,

    frontOffset =
        37,

    backOffset =
        37,

    spacing =
        32,

    startFromBottom =
        150,

    endFromTop =
        150,

    diameter =
        CNC_DEFAULTS.holeDiameter,

    depth =
        CNC_DEFAULTS.holeDepth,

    source = null
}) => {

    const operations = [];


    const sectionY =
        Number(section.y);

    const sectionHeight =
        Number(section.height);

    const numericDepth =
        Number(boardDepth);


    if (
        !Number.isFinite(sectionY) ||
        !Number.isFinite(sectionHeight) ||
        !Number.isFinite(numericDepth) ||
        sectionHeight <= 0 ||
        numericDepth <= 0
    ) {
        return operations;
    }


    const firstY =
        sectionY +
        Number(endFromTop);


    const lastY =
        sectionY +
        sectionHeight -
        Number(startFromBottom);


    if (
        firstY >
        lastY
    ) {
        return operations;
    }


    const xPositions = [];


    const frontX =
        Number(frontOffset);

    const backX =
        numericDepth -
        Number(backOffset);


    if (
        Number.isFinite(frontX) &&
        frontX >= 0 &&
        frontX <= numericDepth
    ) {

        xPositions.push(
            frontX
        );
    }


    if (
        Number.isFinite(backX) &&
        backX >= 0 &&
        backX <= numericDepth &&
        Math.abs(
            backX - frontX
        ) > 0.001
    ) {

        xPositions.push(
            backX
        );
    }


    if (
        xPositions.length === 0
    ) {
        return operations;
    }


    const numericSpacing =
        Number(spacing);


    if (
        !Number.isFinite(numericSpacing) ||
        numericSpacing <= 0
    ) {
        return operations;
    }


    for (
        let worldY = firstY;
        worldY <= lastY + 0.001;
        worldY += numericSpacing
    ) {

        // ---------------------------------------------
        // CNC-Y lokal zum Bauteil
        // ---------------------------------------------

        const localY =
            worldY;


        xPositions.forEach(
            x => {

                operations.push(
                    createDrillOperation({

                        x,

                        y:
                            localY,

                        diameter,

                        depth,

                        source
                    })
                );
            }
        );
    }


    return operations;
};