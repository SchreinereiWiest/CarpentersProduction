import {
    ensureCnc,
    addOperation,
    flattenSections,
    getCncConfig,
    isBottomPart,
    isSidePart,
    isTopPart
} from "./cncHelpers.js";

import { compileSectionFunctions } from "./sections/compileSectionFunctions.js";
import { compileSpax } from "./sections/operations/compileSpax.js";
import { compileFrontAttachments } from "./fronts/compileFrontAttachments.js";
import {
    MACHINING_INTENT_IDS,
    MACHINING_KINDS
} from "../../../postprocessor/machiningModel.js";
/* =========================================================
 * Rückwand
 * ========================================================= */

const compileBackPanel = ({
    cabinet,
    parts
}) => {

    const backPanel =
        cabinet.backPanel ??
        {};


    const construction =
        String(
            backPanel.construction ??
            "butt"
        ).toLowerCase();


    const continuous =
        String(
            backPanel.continuous ??
            "side"
        ).toLowerCase();


    let targets = [];


    /*
     * Seite durchgehend
     * => Rückwandbearbeitung an den Seiten
     */

    if (
        continuous === "side"
    ) {

        targets =
            parts.filter(
                part =>
                    isSidePart(part)
            );

    }


    /*
     * Boden durchgehend
     * => ausschließlich Boden
     *
     * Wichtig:
     * Das funktioniert sauber, sobald Top und Boden
     * als getrennte Parts erzeugt werden.
     */

    else if (
        continuous === "bottom"
    ) {

        targets =
            parts.filter(
                part =>
                    isBottomPart(part)
            );

    }

    /*
     * Falz
     */

    if (
        construction === "rabbet" ||
        construction === "falz8" ||
        construction === "falz"
    ) {

        targets.forEach(
            part => {

                addOperation(
                    part,
                    {

                        kind: MACHINING_KINDS.MILL_PATH,
                        intentId: MACHINING_INTENT_IDS.BACK_RABBET,
                        motion: "rapid",

                        face: "A",

                        target: { x: -20, y: part.B - 7, z: 13 },

                        source: {

                            type: "backPanel",

                            role:
                                "rabbetStart",

                            construction

                        }

                    }
                );


                addOperation(
                    part,
                    {

                        kind: MACHINING_KINDS.MILL_PATH,
                        intentId: MACHINING_INTENT_IDS.BACK_RABBET,
                        motion: "linear",

                        face: "A",

                        start: { x: -20, y: part.B - 7, z: 13 },
                        target: { x: Number(part.L) + 20, y: part.B - 7, z: 13 },

                        source: {

                            type: "backPanel",

                            role:
                                "rabbetLine",

                            construction

                        }

                    }
                );

            }
        );

    }


    /*
     * Eingesetzter Falz
     */

    if (
        construction === "inserted" ||
        construction === "insertedrabbet" ||
        construction === "falzeingesetzt"
    ) {

        targets.forEach(
            part => {

                addOperation(
                    part,
                    {

                        kind: MACHINING_KINDS.MILL_PATH,
                        intentId: MACHINING_INTENT_IDS.BACK_RABBET,
                        motion: "rapid",

                        face: "A",

                        target: { x: 16, y: -20, z: 16 },

                        source: {

                            type: "backPanel",

                            role:
                                "insertedRabbetStart"

                        }

                    }
                );


                addOperation(
                    part,
                    {

                        kind: MACHINING_KINDS.MILL_PATH,
                        intentId: MACHINING_INTENT_IDS.BACK_RABBET,
                        motion: "linear",

                        face: "A",

                        start: { x: 16, y: -20, z: 16 },
                        target: { x: 16, y: part.B - 9, z: 16 },

                        source: {

                            type: "backPanel",

                            role:
                                "insertedRabbetLine1"

                        }

                    }
                );


                addOperation(
                    part,
                    {

                        kind: MACHINING_KINDS.MILL_PATH,
                        intentId: MACHINING_INTENT_IDS.BACK_RABBET,
                        motion: "linear",

                        face: "A",

                        start: { x: 16, y: part.B - 9, z: 16 },
                        target: { x: Number(part.L) + 20, y: 9, z: 16 },

                        source: {

                            type: "backPanel",

                            role:
                                "insertedRabbetLine2"

                        }

                    }
                );


                addOperation(
                    part,
                    {

                        kind: MACHINING_KINDS.MILL_PATH,
                        intentId: MACHINING_INTENT_IDS.BACK_RABBET,
                        motion: "linear",

                        face: "A",

                        start: { x: Number(part.L) + 20, y: 9, z: 16 },
                        target: { x: Number(part.L) + 20, y: part.B - 20, z: 16 },

                        source: {

                            type: "backPanel",

                            role:
                                "insertedRabbetLine3"

                        }

                    }
                );

            }
        );

    }

};


const compileBackPanelGroove = ({
    cabinet,
    parts,
    config
}) => {

    const backPanel =
        cabinet.backPanel ?? {};


    const construction =
        String(
            backPanel.construction ??
            "butt"
        ).toLowerCase();


    /*
     * Nur bei Nut aktiv.
     */
    const isClosedGroove =
        construction === "groove" ||
        construction === "nut8" ||
        construction === "nut";


    const isOpenGroove =
        construction === "grooveopen" ||
        construction === "nut8open" ||
        construction === "nutopen";


    if (
        !isClosedGroove &&
        !isOpenGroove
    ) {
        return;
    }


    const continuous =
        String(
            backPanel.continuous ??
            "side"
        ).toLowerCase();


    const grooveConfig =
        config.backPanel.groove.path;


    /*
     * -----------------------------------------------------
     * Seite durchgehend
     * -----------------------------------------------------
     *
     * Seiten = "durchgehende Teile"
     * Top / Boden = Zwischenplatten
     */

    if (
        continuous === "side"
    ) {

        /*
         * -----------------------------------------------
         * Durchgehende Seiten
         * -----------------------------------------------
         */

        parts
            .filter(
                part =>
                    isSidePart(part)
            )
            .forEach(
                part => {

                    const length =
                        Number(
                            part.L
                        ) || 0;


                    /*
                     * Geschlossen:
                     *
                     * X  = 3
                     * x  = DX - 3
                     *
                     * Oben offen:
                     *
                     * X  = -20
                     * x  = DX - 3
                     */

                    const startX =
                        isOpenGroove
                            ? grooveConfig.openStartOffset
                            : grooveConfig.startOffset;


                    const endX =
                        length -
                        grooveConfig.endOffset;


                    if (
                        !Number.isFinite(
                            startX
                        ) ||
                        !Number.isFinite(
                            endX
                        )
                    ) {
                        return;
                    }


                    addOperation(
                        part,
                        {

                            kind:
                                MACHINING_KINDS.MILL_GROOVE,

                            intentId:
                                MACHINING_INTENT_IDS.BACK_GROOVE,

                            face:
                                "A",

                            /*
                             * Fahrtrichtung immer X
                             */

                            axis:
                                "x",

                            /*
                             * Werte aus deinem
                             * Neutrale Nutgeometrie:
                             *
                             * Y=20
                             * Z=9
                             * B=8.3
                             * T=81
                             * C=0
                             */

                            start: {
                                x: startX,
                                y: part.B - grooveConfig.y,
                                z: grooveConfig.z
                            },

                            end: {
                                x: endX,
                                y: part.B - grooveConfig.y,
                                z: grooveConfig.z
                            },

                            width:
                                grooveConfig.width,

                            /*
                             * Die Nut liegt 42 mm
                             * von der jeweiligen Vorder-
                             * bzw. Hinterkante.
                             */

                            frontOffset:
                                config.backPanel
                                    .groove
                                    .frontOffset,

                            backOffset:
                                config.backPanel
                                    .groove
                                    .backOffset,

                            source: {

                                type:
                                    "backPanel",

                                role:
                                    "groove",

                                construction,

                                target:
                                    "continuousSide",

                                continuous,

                                startX,

                                endX

                            }

                        }
                    );

                }
            );


        /*
         * -----------------------------------------------
         * Zwischenliegende Teile
         * -----------------------------------------------
         *
         * Bei durchgehenden Seiten laufen die
         * zwischenliegenden Platten in die Seiten hinein.
         *
         * Deshalb:
         *
         * X  = -20
         * x  = DX + 20
         */

        parts
            .filter(
                part =>
                    isTopPart(part) ||
                    isBottomPart(part)
            )
            .forEach(
                part => {

                    const length =
                        Number(
                            part.L
                        ) || 0;


                    const startX =
                        grooveConfig
                            .intermediateStartOffset;


                    const endX =
                        length +
                        grooveConfig
                            .intermediateEndOffset;


                    addOperation(
                        part,
                        {

                            kind:
                                MACHINING_KINDS.MILL_GROOVE,

                            intentId:
                                MACHINING_INTENT_IDS.BACK_GROOVE,

                            face:
                                "A",

                            axis:
                                "x",

                            start: {
                                x: startX,
                                y: part.B - grooveConfig.y,
                                z: grooveConfig.z
                            },

                            end: {
                                x: endX,
                                y: part.B - grooveConfig.y,
                                z: grooveConfig.z
                            },

                            width:
                                grooveConfig.width,

                            frontOffset:
                                config.backPanel
                                    .groove
                                    .frontOffset,

                            backOffset:
                                config.backPanel
                                    .groove
                                    .backOffset,

                            source: {

                                type:
                                    "backPanel",

                                role:
                                    "groove",

                                construction,

                                target:
                                    "intermediate",

                                continuous,

                                startX,

                                endX

                            }

                        }
                    );

                }
            );


        return;

    }


    /*
     * -----------------------------------------------------
     * Boden durchgehend
     * -----------------------------------------------------
     *
     * Hier ist der Boden das durchgehende Bauteil.
     *
     * Die momentan erzeugten getrennten Deckel/Boden-Parts
     * machen diese Zuordnung jetzt möglich.
     *
     * Für den Boden lassen wir die Nut über beide Enden
     * hinauslaufen.
     */

    if (
        continuous === "bottom"
    ) {

        parts
            .filter(
                part =>
                    isBottomPart(part)
            )
            .forEach(
                part => {

                    const length =
                        Number(
                            part.L
                        ) || 0;


                    const startX =
                        grooveConfig
                            .intermediateStartOffset;


                    const endX =
                        length +
                        grooveConfig
                            .intermediateEndOffset;


                    addOperation(
                        part,
                        {

                            kind:
                                MACHINING_KINDS.MILL_GROOVE,

                            intentId:
                                MACHINING_INTENT_IDS.BACK_GROOVE,

                            face:
                                "A",

                            axis:
                                "x",

                            start: {
                                x: startX,
                                y: part.B - grooveConfig.y,
                                z: grooveConfig.z
                            },

                            end: {
                                x: endX,
                                y: part.B - grooveConfig.y,
                                z: grooveConfig.z
                            },

                            width:
                                grooveConfig.width,

                            frontOffset:
                                config.backPanel
                                    .groove
                                    .frontOffset,

                            backOffset:
                                config.backPanel
                                    .groove
                                    .backOffset,

                            source: {

                                type:
                                    "backPanel",

                                role:
                                    "groove",

                                construction,

                                target:
                                    "continuousBottom",

                                continuous,

                                startX,

                                endX

                            }

                        }
                    );

                }
            );

    }

};




/* =========================================================
 * Hauptroutine
 * ========================================================= */

export const compileCnc = (
    cabinet,
    parts,
    defaultConfig
) => {

    /*
     * CNC-Struktur zurücksetzen
     */

    parts.forEach(
        part => {

            ensureCnc(part);

            part.CNC.operations = [];

        }
    );


    /*
     * Alle verschachtelten Sections
     * auflösen.
     */

    const sections =
        flattenSections(
            cabinet.sections ?? []
        );


    const config =
        getCncConfig(
            cabinet,
            defaultConfig
        );

    console.log("CNC Config", config);
    /*
     * Section-Funktionen
     *
     * Fachböden
     * Legrabox
     */

    compileSectionFunctions({

        cabinet,

        parts,

        sections,

        config

    });


    /*
     * Bestehende Spax-/Verbinderlogik
     */

    compileSpax({

        cabinet,

        parts,

        sections,

        config

    });

    compileFrontAttachments({
        cabinet,
        parts,
        config
    });

    /*
     * Rückwand
     */

    compileBackPanelGroove({
    cabinet,
    parts,
    config
});


    compileBackPanel({

        cabinet,
        parts

    });


    return parts;

};


/* =========================================================
 * Sections flach darstellen
 * ========================================================= */
