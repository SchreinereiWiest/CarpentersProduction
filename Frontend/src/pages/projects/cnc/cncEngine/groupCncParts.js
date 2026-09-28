import { flattenPartList } from "./falttenPartList";
import { getCncProgramSignature } from "./getCncProgramSignature";
import { createId } from "./cncGroupUtils";

export const groupCncParts = (
    partList = []
) => {

    const parts = flattenPartList(partList);

    console.log(parts);

    const groups = new Map();

    parts.forEach(part => {
        if(!part.CNC || part.CNC.operations.length == 0) {return;}

        const signature = getCncProgramSignature(part);

        if (!groups.has(signature)) {

            groups.set(
                signature,
                {
                    id: createId(),
                    signature,
                    name:
                        part.Objektname ||
                        "Bauteil",

                    type:
                        part.Plattentyp ||
                        "",

                    parts: []
                }
            );
        }

        groups
            .get(signature)
            .parts
            .push(part);
    });

    return Array.from(
        groups.values()
    );
};