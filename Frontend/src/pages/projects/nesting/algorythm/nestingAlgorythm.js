import { defaultSettings } from "./helper/defaults";
import { createPlateList } from "./createPlates";
import { sortPlates } from "./placement/sortPlates";

import { nestWithRemainingPlates } from "./placement/nestRemaining";

function createNestingGroups(
    plates,
    settings
) {
    const defaultPlate = settings.defaultSheet;

    const preparedPlates = plates.map(plate => {

        return {
            ...plate,

            originalWidth: plate.width,
            originalHeight: plate.height,

            width:
                plate.width +
                settings.gap,

            height:
                plate.height +
                settings.gap
        };
    });

    const sortedPlates = sortPlates(preparedPlates);

    

    const nestingPlates =
        nestWithRemainingPlates(
        sortedPlates,
        defaultPlate,
        settings
    );

    return {
        strips: nestingPlates.strips,
        nestingPlates: nestingPlates.nestingPlates
    };
}

export function calculateNesting(processedContent, userSettings = [{}]) {

    

    // fetch content to all plates list

    const platesList = createPlateList(processedContent);

    platesList.forEach((sheet, index) => {

        const settings = {

        ...defaultSettings,
        ...userSettings[index]

    };

        sheet.settings = settings;

        const plates = sheet.plates;

        const strips = createNestingGroups(plates, settings);

        sheet.nestingPlates = strips.nestingPlates;
        sheet.strips = strips.strips;
    });

    return platesList;

}