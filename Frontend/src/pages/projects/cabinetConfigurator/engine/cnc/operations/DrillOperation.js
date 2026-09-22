import { CNC_DEFAULTS } from "../cncDefaults";
import { createId } from "../cncHelpers";

export const createDrillOperation = ({
    x,
    y,
    diameter =
        CNC_DEFAULTS.holeDiameter,
    depth =
        CNC_DEFAULTS.holeDepth,
    face = "A",
    source = null
}) => {

    return {

        id:
            createId(),

        type:
            "drill",

        face,

        x,
        y,

        diameter,

        depth,

        source
    };
};