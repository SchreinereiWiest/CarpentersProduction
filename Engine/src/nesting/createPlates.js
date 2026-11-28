import { expandCncMachiningVariants } from "../cnc/machiningVariants.js";

export function createPlateList(processedContent) {

    const plates = [];

    let id = 0;

    const addPlates = (child) => {
        // Links-/Rechtsvarianten werden bereits vor dem Nesting zu physischen
        // Einzelteilen. Dadurch trägt jedes Etikett exakt die PID des späteren
        // CNC-Programms (z. B. 000042-L statt der mehrdeutigen Basis-PID).
        const physicalParts = (child.CNC?.machiningVariants?.length ?? 0) > 1
            ? expandCncMachiningVariants(child)
            : [child];

        physicalParts.forEach(part => {
            const amount = Number(part.Anzahl);
            const item = plates.findIndex(entry => entry.MID == part.MID && entry.T == part.T);
            let last = item;
            if (item === -1) {
                last = plates.push({ MID: part.MID, T: part.T, plates: [] });
                last -= 1;
            }

            for (let i = 0; i < amount; i++) {
                plates[last].plates.push({
                    id: id++,
                    width: part.B,
                    height: part.L,
                    thickness: part.T,
                    material: part.MID,
                    original: part,
                    rotate: false,
                    EdgeB: part.EBID,
                    EdgeT: part.ETID,
                    EdgeL: part.ELID,
                    EdgeR: part.ERID,
                    color: part.color
                });
            }
        });
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

