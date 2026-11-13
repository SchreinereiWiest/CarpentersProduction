
import {addOperation} from "../../cncHelpers.js";
import {
    MACHINING_INTENT_IDS,
    MACHINING_KINDS
} from "../../../../../postprocessor/machiningModel.js";

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


    let start =
        sectionY +
        endFromTop;


    let end =
        sectionY +
        sectionHeight -
        startFromBottom;


    const rangeStart = start;
    const rangeEnd = end;


    if (
        func.holeRow?.centered === true &&
        Number.isFinite(spacing) &&
        spacing > 0 &&
        end >= start
    ) {
        const availableLength = end - start;
        const intervalCount = Math.floor((availableLength + 1e-9) / spacing);
        const usedLength = intervalCount * spacing;
        const edgeOffset = (availableLength - usedLength) / 2;

        start += edgeOffset;
        end -= edgeOffset;
    }


    const partDepth =
        Number(
            boundary.part.B
        ) || 0;


        addOperation(
            boundary.part,
            {

                kind: MACHINING_KINDS.DRILL_ROW,
                intentId: MACHINING_INTENT_IDS.SHELF_PIN_ROW,

                face:
                    boundary.face ??
                    "A",

                axis: "x",

                crossPositions: [frontOffset, partDepth - backOffset],

                start,

                end,

                spacing,

                centered:
                    func.holeRow?.centered === true,

                rangeStart,

                rangeEnd,

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
                        func.id,

                    centered:
                        func.holeRow?.centered === true

                }

            }
        );

    
};
