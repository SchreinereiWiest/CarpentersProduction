import { area } from "./helper/helpers";

export function createPlateList(processedContent) {

    const plates = [];

    let id = 0;

    processedContent.forEach(object => {

        object.Children.forEach(child => {

            const amount = Number(child.Anzahl);

            const item = plates.findIndex(item => item.MID == child.MID && item.T==child.T);
            

            let last = item;
            if(item === -1) {
                last = plates.push({MID:child.MID, T:child.T, plates:[]});
                last -=1;
            }

            for (let i = 0; i < amount; i++) {

                plates[last].plates.push({

                    id: id++,

                    width: child.L,

                    height: child.B,

                    thickness: child.T,

                    material: child.MID,

                    original: child

                });

            }

        });

           

    });

    return plates;

}


export function createSheets(defaultSheet, count = 1) {

    const sheets = [];

    for (let i = 0; i < count; i++) {

        sheets.push({

            id: i,

            width: defaultSheet.width,

            height: defaultSheet.height,

            material: defaultSheet.material,

            area: area(defaultSheet.width, defaultSheet.height),

            offsetX: 0

        });

    }

    return sheets;

}


export function addSheets(sheets, defaultSheet, count = 1) {

    for (let i = 0; i < count; i++) {

        sheets.push({

            id: sheets.length,

            width: defaultSheet.width,

            height: defaultSheet.height,

            material: defaultSheet.material,

            area: area(defaultSheet.width, defaultSheet.height),

            offsetX: sheets.length * 3000

        });

    }

    return sheets;

}