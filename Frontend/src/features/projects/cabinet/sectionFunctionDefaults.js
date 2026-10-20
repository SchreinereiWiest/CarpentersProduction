import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";

export const createShelfHoleRowDefaults = (cncConfig = DEFAULT_CNC) => {
    const config = cncConfig?.cncDefault ?? cncConfig;

    return {
        spacing: 32,
        frontOffset: config?.shelf?.frontOffset ?? DEFAULT_CNC.shelf.frontOffset,
        backOffset: config?.shelf?.backOffset ?? DEFAULT_CNC.shelf.backOffset,
        startFromBottom: 150,
        endFromTop: 150
    };
};
