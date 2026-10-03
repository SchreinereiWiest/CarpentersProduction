
import {addOperation} from "../../cncHelpers";

/* =========================================================
 * Fachboden / Lochreihe
 * ========================================================= */

export const compileShelf = ({
    section,
    func,
    boundary,
    config
}) => {

    if (
        !boundary?.part
    ) {
        return;
    }


    const compartmentCount =
        Math.max(
            1,
            Number(
                func.compartmentCount ?? 1
            )
        );


    const shelfCount =
        Math.max(
            0,
            compartmentCount - 1
        );


    if (
        shelfCount <= 0
    ) {
        return;
    }


    const sectionY =
        Number(
            section.y
        ) || 0;


    const sectionHeight =
        Number(
            section.height
        ) || 0;


    const startFromBottom =
        Math.max(
            0,
            Number(
                func.holeRow?.startFromBottom ??
                0
            )
        );


    const endFromTop =
        Math.max(
            0,
            Number(
                func.holeRow?.endFromTop ??
                0
            )
        );


    const spacing =
        Number(
            func.holeRow?.spacing ??
            32
        );


    const frontOffset =
        Number(
            func.holeRow?.frontOffset ??
            config.shelf.frontOffset
        );


    const backOffset =
        Number(
            func.holeRow?.backOffset ??
            config.shelf.backOffset
        );


    const start =
        sectionY +
        endFromTop;


    const end =
        sectionY +
        sectionHeight -
        startFromBottom;


    const partDepth =
        Number(
            boundary.part.B
        ) || 0;


        addOperation(
            boundary.part,
            {

                type: "LR",

                face:
                    boundary.face ??
                    "A",

                axis: "L",

                fixedAxis: "B",

                frontOffset: frontOffset,

                backOffset: partDepth - backOffset,

                start,

                end,

                spacing,

                depth:
                    config.shelf.depth,

                diameter:
                    config.shelf.diameter,

                source: {

                    type: "section",

                    role: "shelf",

                    sectionId:
                        section.id,

                    functionId:
                        func.id

                }

            }
        );

    
};