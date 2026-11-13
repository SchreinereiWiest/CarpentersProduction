import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";
import { DEFAULT_CABINET } from "@Engine/cabinet/cabinetDefaults.js";

export const createShelfHoleRowDefaults = (
    cncConfig = DEFAULT_CNC,
    cabinetConfig = DEFAULT_CABINET
) => {
    const config = cncConfig?.cncDefault ?? cncConfig;

    return {
        spacing: 32,
        frontOffset: config?.shelf?.frontOffset ?? DEFAULT_CNC.shelf.frontOffset,
        backOffset: config?.shelf?.backOffset ?? DEFAULT_CNC.shelf.backOffset,
        startFromBottom: 150,
        endFromTop: 150,
        centered: cabinetConfig.functionDefaults.shelf.holeRow.centered
    };
};

export const getShelfFrontOffsetDefault = (cncConfig = DEFAULT_CNC) => {
    const config = cncConfig?.cncDefault ?? cncConfig;
    return config?.shelf?.shelfFrontOffset ?? config?.shelf?.setback ?? DEFAULT_CNC.shelf.shelfFrontOffset;
};
