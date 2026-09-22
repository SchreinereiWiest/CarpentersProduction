

import {
    getMaterialNumber,
    getGrainValue
} from "./materials";

import { generateSideParts } from "./geometry/generate/generateSideParts";
import { generateBottomPart } from "./geometry/generate/generateBottomParts";
import { generateBackPart } from "./geometry/generate/generateBackParts";
import { generateShelfParts } from "./geometry/generate/generateShelfParts";
import { generateMiddleWallParts } from "./geometry/generate/generateMiddleWall";
import { generateFrontParts } from "./geometry/generate/generateFrontParts";
import { generateLegraboxHardware } from "./hardware/generateLegraboxHardware";

import {generateSectionCnc} from "../cnc/cncEngine";


const isNear = (
    a,
    b,
    epsilon = 0.01
) => {

    return Math.abs(
        Number(a) -
        Number(b)
    ) <= epsilon;
};


const applyShelfCncToSides = (
    cabinet,
    parts
) => {

    const sections =
        flattenSections(
            cabinet.sections ?? []
        );


    const leftSide =
        parts.find(
            part =>
                part.Source?.role ===
                "side"
        );


    const rightSide =
        parts.find(
            part =>
                part.Source?.role ===
                "side"
        );


    if (!leftSide) {
        return;
    }


    sections.forEach(
        section => {

            if (
                section.functionType !==
                "shelf"
            ) {
                return;
            }


            const sectionLeft =
                Number(section.x);

            const sectionRight =
                sectionLeft +
                Number(section.width);


            const cabinetLeft =
                Number(
                    cabinet.thickness
                );


            const cabinetRight =
                Number(
                    cabinet.width
                ) -
                Number(
                    cabinet.thickness
                );


            const cnc =
                generateSectionCnc({

                    section,

                    cabinet
                });


            // -------------------------------------------------
            // Linke Korpusseite
            // -------------------------------------------------

            if (
                isNear(
                    sectionLeft,
                    cabinetLeft
                )
            ) {

                leftSide.CNC ??= {};

                leftSide.CNC.operations ??= [];

                leftSide.CNC.operations.push(
                    ...cnc.operations
                );
            }


            // -------------------------------------------------
            // Rechte Korpusseite
            // -------------------------------------------------

            if (
                isNear(
                    sectionRight,
                    cabinetRight
                )
            ) {

                rightSide.CNC ??= {};

                rightSide.CNC.operations ??= [];

                rightSide.CNC.operations.push(
                    ...cnc.operations
                );
            }
        }
    );
};


export const buildPartList = (
    cabinets = [],
    materials = []
) => {

    let pid = 0;


    const nextPID = () => {

        pid++;

        return String(pid)
            .padStart(6, "0");
    };


    return cabinets.map(
        cabinet => {

            const cabinetMaterial =
                cabinet.materialId;


            const root = {

                PID:
                    nextPID(),

                BPID:
                    "",

                Objektname:
                    cabinet.name,

                Plattentyp:
                    "KO",

                Anzahl:
                    1,

                L:
                    Number(
                        cabinet.height
                    ),

                B:
                    Number(
                        cabinet.width
                    ),

                T:
                    Number(
                        cabinet.depth
                    ),

                MID:
                    getMaterialNumber(
                        materials,
                        cabinetMaterial
                    ),

                Maserung:
                    getGrainValue(
                        materials,
                        cabinetMaterial
                    ),

                ELID: "",
                ERID: "",
                ETID: "",
                EBID: "",

                Kante:
                    ":::",

                Notiz: "",

                color:
                    "#25a7b3",

                Children: [],

                Hardware: []
            };


            // =============================================
            // Korpus
            // =============================================

            root.Children.push(

                ...generateSideParts({

                    cabinet,

                    materials,

                    nextPID
                })
            );


            root.Children.push(

                generateBottomPart({

                    cabinet,

                    materials,

                    nextPID
                })
            );


            root.Children.push(

                generateBackPart({

                    cabinet,

                    materials,

                    nextPID
                })
            );


            // =============================================
            // Sections
            // =============================================

            root.Children.push(

                ...generateShelfParts({

                    cabinet,

                    materials,

                    nextPID
                })
            );


            root.Children.push(

                ...generateMiddleWallParts({

                    cabinet,

                    materials,

                    nextPID
                })
            );


            // =============================================
            // Fronten
            // =============================================

            root.Children.push(

                ...generateFrontParts({

                    cabinet,

                    materials,

                    nextPID
                })
            );


            // =============================================
            // Hardware
            // =============================================

            root.Hardware =
                generateLegraboxHardware(
                    cabinet
                );


            return root;
        }
    );
};