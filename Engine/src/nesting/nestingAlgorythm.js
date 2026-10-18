import { defaultSettings } from "./helper/defaults.js";
import { createPlateList } from "./createPlates.js";
import { sortPlates } from "./placement/sortPlates.js";
import { findStorageMaterial } from "./helper/parseStorageMaterial.js";

import { nestWithRemainingPlates } from "./placement/nestRemaining.js";

function createNestingGroups(
    plates,
    settings
) {
    const defaultPlate = settings.defaultSheet;
    const partGap = Number(settings.gap) || 0;

    // Originalmaße bleiben separat von den Footprints inklusive Abstand erhalten.
    const preparedPlates = plates.map(plate => {
        const originalWidth = Number(plate.originalWidth ?? plate.width) || 0;
        const originalHeight = Number(plate.originalHeight ?? plate.height) || 0;

        return {
            ...plate,

            originalWidth,
            originalHeight,

            width: originalWidth + partGap,

            height: originalHeight + partGap
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

export function calculateNesting(
    processedContent,
    userSettings = [{}],
    storageMaterials = []
) {

    

    // fetch content to all plates list

    const platesList = createPlateList(processedContent);

    platesList.forEach((sheet, index) => {

        const userSheetSettings = userSettings[index] ?? {};
        const storageMaterial = findStorageMaterial(
            sheet.MID,
            sheet.T,
            storageMaterials
        );
        const configuredDefaultSheet = {
            ...defaultSettings.defaultSheet,
            ...userSheetSettings.defaultSheet
        };
        const defaultSheet = storageMaterial
            ? {
                ...configuredDefaultSheet,
                width: Number(storageMaterial.width),
                height: Number(storageMaterial.height),
                material: storageMaterial.materialNumber || sheet.MID
            }
            : {
                ...configuredDefaultSheet,
                width: defaultSettings.defaultSheet.width,
                height: defaultSettings.defaultSheet.height,
                material: defaultSettings.defaultSheet.material
            };

        const settings = {
            ...defaultSettings,
            ...userSheetSettings,
            // Eine feste Maserungsrichtung darf beim Nesting nicht gedreht werden.
            allowRotation: storageMaterial?.maser === true
                ? false
                : (userSheetSettings.allowRotation ?? defaultSettings.allowRotation),
            defaultSheet
        };

        sheet.settings = settings;
        sheet.storageMaterialFound = Boolean(storageMaterial);
        sheet.storageMaterialFallback = !storageMaterial;
        sheet.storageMaterialName = storageMaterial?.name ?? null;
        sheet.storageMaterialHasGrain = storageMaterial?.maser === true;

        const plates = sheet.plates;

        const strips = createNestingGroups(plates, settings);

        sheet.nestingPlates = strips.nestingPlates;
        sheet.strips = strips.strips;
    });

    return platesList;

}
