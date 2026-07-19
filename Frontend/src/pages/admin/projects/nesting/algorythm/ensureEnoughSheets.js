import { area } from "./helper/helpers";

export function ensureEnoughSheets(plates, sheets, defaultSheet) {

    const plateArea = plates.reduce(
        (sum, plate) => sum + area(plate.width, plate.height),
        0
    );

    let sheetArea = sheets.reduce(
        (sum, sheet) => sum + area(sheet.width, sheet.height),
        0
    );

    while (sheetArea < plateArea) {

        sheets.push({

            id: sheets.length,

            width: defaultSheet.width,
            height: defaultSheet.height,

            material: defaultSheet.material,

            offsetX: sheets.length * 3000

        });

        sheetArea += area(defaultSheet.width, defaultSheet.height);

    }

    return sheets

}