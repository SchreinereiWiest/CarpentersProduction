import { area } from "./helper/helpers";

export function createPlateList(processedContent) {

    const plates = [];

    let id = 0;

    const addPlates = (child) => {

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

                width: child.B,

                height: child.L,

                thickness: child.T,

                material: child.MID,

                original: child,

                rotate: false,

                EdgeB : child.EBID,

                EdgeT : child.ETID,

                EdgeL : child.ELID,

                EdgeR : child.ERID

            });

        }
    }

    processedContent.forEach(object => {

        if(object.Children.length == 0) {
            addPlates(object);
        }

        object.Children.forEach(child => {

            addPlates(child);

        });

           

    });

    return plates;

}

