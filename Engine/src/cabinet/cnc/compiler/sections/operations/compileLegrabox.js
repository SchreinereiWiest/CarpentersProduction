import {
    addOperation
} from "../../cncHelpers.js";
import {
    MACHINING_INTENT_IDS,
    MACHINING_KINDS
} from "../../../../../postprocessor/machiningModel.js";


export const compileLegrabox = ({
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



    const positionFromBottom =
        Math.max(
            0,
            Number(
                func.positionFromBottom ?? 40
            )
        );

    const insideRightOffset = Number(
        func.doubling?.insideRightOffset ?? 0
    );
    const safeInsideRightOffset = Number.isFinite(insideRightOffset)
        ? insideRightOffset
        : 0;


    /*
     * Erste Bohrung der Legrabox
     *
     * lengthReference = top
     *
     * Deshalb wird hier direkt die Position
     * relativ zur Oberkante des Bauteils angegeben.
     */
    const boxPosition =
    Number(section.height) -
    positionFromBottom + Number(section.y) -
    (
        boundary.part?.Source?.continuous === false
            ? 19
            : 0
    );

    const depthPattern =
        Array.isArray(
            config.legrabox.depthPattern
        )
            ? config.legrabox.depthPattern
            : [
                37,
                69,
                192,
                224,
                256
            ];


    /*
     * =====================================================
     * Bohrgruppen
     *
     * Gruppe 1:
     * 37 -> 69
     *
     * Gruppe 2:
     * 192 -> 224 -> 256
     * =====================================================
     */

    const groups = [

        {
            firstDepthPosition:
                Number(
                    depthPattern[0]
                ),

            count:
                2,

            xOffset:
                0,

            yOffset:
                Number(
                    depthPattern[1]
                ) -
                Number(
                    depthPattern[0]
                )

        },

        {
            firstDepthPosition:
                Number(
                    depthPattern[2]
                ),

            count:
                3,

            xOffset:
                0,

            yOffset:
                Number(
                    depthPattern[3]
                ) -
                Number(
                    depthPattern[2]
                )

        }

    ];


    groups.forEach(
        (
            group,
            groupIndex
        ) => {

            if (
                !Number.isFinite(
                    group.firstDepthPosition
                ) ||
                group.count < 1
            ) {
                return;
            }

            addOperation(
                boundary.part,
                {

                    kind:
                        MACHINING_KINDS.DRILL_PATTERN,

                    intentId:
                        MACHINING_INTENT_IDS.DRAWER_LEGRABOX,

                    face:
                        boundary.face ??
                        "A",

                    diameter:
                        config.legrabox.diameter,

                    depth:
                        config.legrabox.depth,

                    lengthReference:
                        "top",

                    /*
                     * ERSTE Bohrung
                     * insideRightOffset verschiebt den gesamten
                     * Bohrgruppenstart; YOffset hält die Lochabstände.
                     */

                    x: boxPosition,

                    y:
                        group.firstDepthPosition +
                        safeInsideRightOffset,

                    /*
                     * Wiederholungsparameter
                     */

                    count:
                        group.count,

                    stepX:
                        group.xOffset,

                    stepY:
                        group.yOffset,

                    source: {

                        type:
                            "section",

                        role:
                            "legrabox",

                        sectionId:
                            section.id,

                        functionId:
                            func.id,

                        variant:
                            func.variant ?? "M",

                        group:
                            groupIndex + 1,

                        firstHole:
                            true

                    }

                }
            );

        }
    );

};
