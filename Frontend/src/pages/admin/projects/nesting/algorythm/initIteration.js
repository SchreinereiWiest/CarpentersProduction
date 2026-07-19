
export function initializeIteration(sheets, settings) {

    const freeRects = [];

    sheets.forEach(sheet => {

        freeRects.push({

            sheet: sheet.id,

            x: settings.margin,

            y: settings.margin,

            width: sheet.width - settings.margin * 2,

            height: sheet.height - settings.margin * 2

        });

    });

    return {

        placedPlates: [],

        freeRects,

        sheets: sheets,

        cuts: []

    };

}