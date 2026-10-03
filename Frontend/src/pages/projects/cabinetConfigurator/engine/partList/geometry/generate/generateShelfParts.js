import { getDefaultEdges } from "../get/getDefaultEdges";
import { flattenSections } from "../flattenSections";
import { createPart } from "../createPart";
import { getMaterialNumber } from "../../materials";

export const generateShelfParts = ({
    cabinet,
    materials,
    nextPID
}) => {

    const parts = [];

    const sections = flattenSections(
        cabinet.sections ?? []
    );


    sections.forEach((section) => {

        /*
         * Neue Struktur:
         *
         * functionConfig: [
         *     {
         *         id: ...,
         *         type: "shelf",
         *         compartmentCount: 3,
         *         shelfFrontOffset: 20,
         *         holeRow: {...}
         *     },
         *     {
         *         id: ...,
         *         type: "middleWall",
         *         ...
         *     }
         * ]
         */

        const functions = Array.isArray(
            section.functionConfig
        )
            ? section.functionConfig
            : [];


        /*
         * Alle Shelf-Funktionen dieser Sektion
         */
        const shelfFunctions = functions.filter(
            func => func.type === "shelf"
        );


        shelfFunctions.forEach((config) => {

            /*
             * Anzahl der Fächer
             *
             * 1 Fach  -> 0 Böden
             * 2 Fächer -> 1 Boden
             * 3 Fächer -> 2 Böden
             */
            const compartmentCount = Math.max(
                1,
                Number(config.compartmentCount ?? 1)
            );

            const quantity = Math.max(
                0,
                compartmentCount - 1
            );


            if (quantity <= 0) {
                return;
            }


            /*
             * Korpustiefe
             */
            const cabinetDepth =
                Number(cabinet.depth ?? 0);


            /*
             * Abstand von vorne
             *
             * Beispiel:
             * Korpustiefe = 535
             * Abstand vorne = 20
             *
             * => Fachbodentiefe = 515
             */
            const frontOffset = Math.max(
                0,
                Number(config.shelfFrontOffset ?? 0)
            );


            const depth = Math.max(
                0,
                cabinetDepth - frontOffset
            );


            /*
             * Fachbodenbreite
             */
            const shelfWidth =
                Number(section.width ?? 0);


            /*
             * Materialstärke
             */
            const thickness =
                Number(cabinet.thickness ?? 0);


            /*
             * Jeden benötigten Fachboden erzeugen
             */
            for (
                let i = 0;
                i < quantity;
                i++
            ) {

                parts.push(
                    createPart({
                        PID: nextPID(),

                        name:
                            quantity === 1
                                ? "Fachboden"
                                : `Fachboden ${i + 1}`,

                        type:
                            "Fächer",

                        quantity:
                            1,

                        L:
                            shelfWidth,

                        B:
                            depth,

                        T:
                            thickness,

                        materialId:
                            cabinet.materialId,

                        materials,

                        edges:
                            {
                            
                                    ELID: "",
                            
                                    ERID:
                                        getMaterialNumber(
                                                materials,
                                                cabinet.materialId
                                            )
                                            ,
                            
                                    ETID: "",
                                       
                            
                                    EBID: "",
                                        
                                },

                        source: {
                            type:
                                "section",

                            role:
                                "shelf",

                            sectionId:
                                section.id,

                            functionId:
                                config.id,

                            functionIndex:
                                functions.indexOf(config),

                            shelfIndex:
                                i
                        }
                    })
                );
            }

        });

    });


    return parts;
};