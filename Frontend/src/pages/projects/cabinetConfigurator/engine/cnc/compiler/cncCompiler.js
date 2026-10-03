import {
    createId,
    ensureCnc,
    addOperation,
    flattenSections,
    getCncConfig,
    getSource,
    isBottomPart,
    isSidePart,
    isMiddleWallPart,
    getConnectorHoleCount
} from "./cncHelpers";

import { compileSectionFunctions } from "./sections/compileSectionFunctions";

import { getVerticalMembers, getMemberInstances } from "./sections/resolveSections";

import { compileSpax } from "./sections/operations/compileSpax";



/* =========================================================
 * Lochmuster
 * ========================================================= */

const createDrillPattern = ({
    total,
    start,
    end,
    count = 4
}) => {

    const numericTotal =
        Number(total);

    const numericStart =
        Number(start);

    const numericEnd =
        Number(end);

    if (
        !Number.isFinite(numericTotal) ||
        !Number.isFinite(numericStart) ||
        !Number.isFinite(numericEnd) ||
        count < 2
    ) {
        return [];
    }

    const available =
        Math.max(
            0,
            numericTotal -
            numericStart -
            numericEnd
        );

    const spacing =
        available /
        (count - 1);

    return Array.from(
        {
            length: count
        },
        (_, index) =>
            numericStart +
            index * spacing
    );

};


/* =========================================================
 * Rückwand
 * ========================================================= */

const compileBackPanel = ({
    cabinet,
    parts,
    config
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
     * Nut
     */

    // if (
    //     construction === "groove" ||
    //     construction === "nut8" ||
    //     construction === "nut"
    // ) {

    //     targets.forEach(
    //         part => {

    //             addOperation(
    //                 part,
    //                 {

    //                     type: "NUT8",

    //                     face: "A",

    //                     frontOffset:
    //                         config.backPanel
    //                             .groove
    //                             .frontOffset,

    //                     backOffset:
    //                         config.backPanel
    //                             .groove
    //                             .backOffset,

    //                     depth:
    //                         config.backPanel
    //                             .groove
    //                             .depth,

    //                     source: {

    //                         type: "backPanel",

    //                         role: "groove",

    //                         construction

    //                     }

    //                 }
    //             );

    //         }
    //     );

    // }


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

                        type: "XG0",

                        face: "A",

                        x: -20,
                        y: part.B - 7,
                        z: 13,

                        toolDepth: 114,

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

                        type: "XL2P",

                        face: "A",

                        startX: -20,

                        endX:
                            Number(
                                part.L
                            ) + 20,

                        y: part.B - 7,
                        z: 13,

                        toolDepth: 114,

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

                        type: "XG0",

                        face: "A",

                        x: 16,
                        y: -20,
                        z: 16,

                        toolDepth: 114,

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

                        type: "XL2P",

                        face: "A",

                        x: 16,
                        y: part.B - 9,

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

                        type: "XL2P",

                        face: "A",

                        x:
                            Number(
                                part.L
                            ) + 20,

                        y: 9,

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

                        type: "XL2P",

                        face: "A",

                        x:
                            Number(
                                part.L
                            ) + 20,

                        y: part.B - 20,

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
        config.backPanel.groove.rnt;


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

                            type:
                                "RNT",

                            face:
                                "A",

                            /*
                             * Fahrtrichtung immer X
                             */

                            axis:
                                "X",

                            x:
                                startX,

                            endX,

                            /*
                             * Werte aus deinem
                             * Original-RNT:
                             *
                             * Y=20
                             * Z=9
                             * B=8.3
                             * T=81
                             * C=0
                             */

                            y:
                                part.B - grooveConfig.y,

                            z:
                                grooveConfig.z,

                            width:
                                grooveConfig.width,

                            tool:
                                grooveConfig.tool,

                            c:
                                grooveConfig.c,

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

                            condition:
                                "NUT8=1",

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

                            type:
                                "RNT",

                            face:
                                "A",

                            axis:
                                "X",

                            x:
                                startX,

                            endX,

                            y:
                                part.B - grooveConfig.y,

                            z:
                                grooveConfig.z,

                            width:
                                grooveConfig.width,

                            tool:
                                grooveConfig.tool,

                            c:
                                grooveConfig.c,

                            frontOffset:
                                config.backPanel
                                    .groove
                                    .frontOffset,

                            backOffset:
                                config.backPanel
                                    .groove
                                    .backOffset,

                            condition:
                                "NUT8=1",

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

                            type:
                                "RNT",

                            face:
                                "A",

                            axis:
                                "X",

                            x:
                                startX,

                            endX,

                            y:
                                part.W - grooveConfig.y,

                            z:
                                grooveConfig.z,

                            width:
                                grooveConfig.width,

                            tool:
                                grooveConfig.tool,

                            c:
                                grooveConfig.c,

                            frontOffset:
                                config.backPanel
                                    .groove
                                    .frontOffset,

                            backOffset:
                                config.backPanel
                                    .groove
                                    .backOffset,

                            condition:
                                "NUT8=1",

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
 * Durchgehender Boden
 *
 * Diese Funktion ergänzt die bestehende compileSpax()-Logik.
 *
 * Wenn der Boden durchgehend ist, muss er nicht nur an
 * der linken/rechten Seite verbunden werden, sondern auch
 * an allen vertikalen Mittelwänden.
 * ========================================================= */

const compileContinuousBottom = ({
    cabinet,
    parts,
    sections,
    config
}) => {

    const continuous =
        String(
            cabinet.backPanel?.continuous ??
            "side"
        ).toLowerCase();


    if (
        continuous !== "bottom"
    ) {
        return;
    }


    const bottomPart =
        parts.find(
            part =>
                isBottomPart(part)
        );


    if (
        !bottomPart
    ) {
        return;
    }


    const bottomSource =
        getSource(
            bottomPart
        );


    const bottomInstances =
        Array.isArray(
            bottomSource.instances
        )
            ? bottomSource.instances
            : [];


    const bottomInstance =
        bottomInstances.find(
            instance =>
                instance.role === "bottom" ||
                instance.id === "bottom"
        );


    if (
        !bottomInstance
    ) {
        return;
    }


    if (
        bottomInstance.continuous !== true
    ) {
        return;
    }


    /*
     * =====================================================
     * Nur interne vertikale Mittelwände
     *
     * Seiten werden bereits von compileSpax behandelt.
     * =====================================================
     */

    const verticalMembers =
        getVerticalMembers(
            parts
        );


    verticalMembers

        .filter(
            part =>
                isMiddleWallPart(part)
        )

        .forEach(
            part => {

                const instances =
                    getMemberInstances({
                        part,
                        cabinet,
                        sections
                    });


                instances.forEach(
                    instance => {

                        const memberLeft =
                            Number(
                                instance.x
                            );


                        const memberWidth =
                            Number(
                                instance.width
                            ) || 0;


                        const memberCenter =
                            memberLeft +
                            memberWidth / 2;


                        const bottomLeft =
                            Number(
                                bottomInstance.x ?? 0
                            );


                        const bottomWidth =
                            Number(
                                bottomInstance.width ??
                                bottomPart.L
                            ) || 0;


                        /*
                         * Mittelwand muss innerhalb
                         * des durchgehenden Bodens liegen.
                         */

                        if (
                            memberCenter <
                                bottomLeft - 0.5 ||
                            memberCenter >
                                bottomLeft +
                                bottomWidth +
                                0.5
                        ) {

                            return;

                        }


                        /*
                         * =================================================
                         * VBH auf dem Boden
                         *
                         * Position lokal auf Boden:
                         * Mittelpunkt der Mittelwand
                         * =================================================
                         */

                        const horizontalPositions =
                            createDrillPattern({

                                total:
                                    Number(
                                        bottomPart.B
                                    ),

                                start:
                                    config.spax
                                        .horizontal
                                        .startOffset,

                                end:
                                    config.spax
                                        .horizontal
                                        .endOffset,

                                count:
                                    getConnectorHoleCount(
                                        bottomPart.B,
                                        Number(
                                            config.spax
                                                .connector
                                                .holeCountThreshold ??
                                            300
                                        )
                                    )

                            });


                        if (
                            horizontalPositions.length === 0
                        ) {
                            return;
                        }


                        addOperation(
                            bottomPart,
                            {

                                type:
                                    "VBH",

                                face:
                                    "A",

                                diameter:
                                    config.spax
                                        .horizontal
                                        .diameter,

                                depth:
                                    config.spax
                                        .horizontal
                                        .depth,

                                count:
                                    horizontalPositions.length,

                                positions:
                                    horizontalPositions,

                                spacing:
                                    horizontalPositions.length >= 2
                                        ? horizontalPositions[1] -
                                          horizontalPositions[0]
                                        : 0,

                                position:
                                    memberCenter,

                                source: {

                                    type:
                                        "joint",

                                    role:
                                        "spax",

                                    panelType:
                                        "bottom",

                                    memberType:
                                        "middlewall",

                                    memberId:
                                        instance.id,

                                    memberCenterX:
                                        memberCenter,

                                    instanceId:
                                        bottomInstance.id,

                                    continuous:
                                        true

                                }

                            }
                        );


                        /*
                         * =================================================
                         * VB auf der Mittelwand
                         * =================================================
                         */

                        const memberHeight =
                            Number(
                                instance.height
                            ) || 0;


                        const verticalPosition =
                            memberHeight -
                            (
                                Number(
                                    cabinet.thickness
                                ) || 19
                            ) / 2;


                        const verticalPositions =
                            createDrillPattern({

                                total:
                                    Number(
                                        instance.height
                                    ) || 0,

                                start:
                                    config.spax
                                        .connector
                                        .startOffset,

                                end:
                                    config.spax
                                        .connector
                                        .endOffset,

                                count:
                                    horizontalPositions.length

                            });


                        /*
                         * A und B weiterhin nur für
                         * Mittelwände.
                         */

                        [
                            "A",
                            "B"
                        ].forEach(
                            face => {

                                addOperation(
                                    part,
                                    {

                                        type:
                                            "VB",

                                        face,

                                        pattern:
                                            "connector",

                                        diameter:
                                            config.spax
                                                .connector
                                                .diameter,

                                        depth:
                                            config.spax
                                                .connector
                                                .depth,

                                        count:
                                            horizontalPositions.length,

                                        positions:
                                            horizontalPositions,

                                        spacing:
                                            horizontalPositions.length >= 2
                                                ? horizontalPositions[1] -
                                                  horizontalPositions[0]
                                                : 0,

                                        position:
                                            verticalPosition,

                                        rowStart:
                                            config.spax
                                                .connector
                                                .startOffset,

                                        rowEnd:
                                            config.spax
                                                .connector
                                                .endOffset,

                                        source: {

                                            type:
                                                "joint",

                                            role:
                                                "spax",

                                            panelType:
                                                "bottom",

                                            instanceId:
                                                bottomInstance.id,

                                            memberType:
                                                "middlewall",

                                            memberId:
                                                instance.id,

                                            memberFace:
                                                face,

                                            continuous:
                                                true

                                        }

                                    }
                                );

                            }
                        );

                    }
                );

            }
        );

};


// ---------------------------------






/* =========================================================
 * Hauptroutine
 * ========================================================= */

export const compileCnc = (
    cabinet,
    parts
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
            cabinet
        );


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

        parts,

        config

    });


    return parts;

};


/* =========================================================
 * Sections flach darstellen
 * ========================================================= */

