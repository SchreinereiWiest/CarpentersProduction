import { defaultSettings } from "./helper/defaults";
import { createPlateList } from "./createPlates";
import { sortPlates } from "./placement/sortPlates";
import { nestStrips } from "./placement/nestingPlate";
import { createStrips } from "./placement/createStrip"

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

    const strips = createStrips(
        sortedPlates,
        settings
    );

    const nestingPlates =
        nestStrips(
            strips,
            defaultPlate,
            settings
        );


    return {
        strips,
        nestingPlates
    };
}

export function calculateNesting(processedContent, userSettings = {}) {

    const settings = {

        ...defaultSettings,
        ...userSettings

    };

    // fetch content to all plates list

    const platesList = createPlateList(processedContent);

    platesList.forEach(sheet => {

        const plates = sheet.plates;

        const strips = createNestingGroups(plates, settings);

        sheet.nestingPlates = strips.nestingPlates;
        sheet.strips = strips.strips;
    });

    return platesList;

}