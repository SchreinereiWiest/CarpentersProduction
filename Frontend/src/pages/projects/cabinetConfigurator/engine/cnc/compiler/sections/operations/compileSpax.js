import {
    ensureCnc,
    addOperation,
    getSource,
    isSidePart,
    isMiddleWallPart,
    isNear,
    getPartPosition,
    getConnectorHoleCount
} from "../../cncHelpers";

/* =========================================================
 * Bohrmuster
 *
 * Unterhalb des Schwellenwertes:
 *     3 Löcher
 *
 * Ab dem Schwellenwert:
 *     4 Löcher
 *
 * start/end bleiben immer unverändert.
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
        !Number.isFinite(
            numericTotal
        ) ||
        !Number.isFinite(
            numericStart
        ) ||
        !Number.isFinite(
            numericEnd
        ) ||
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
 * Vertikale Bauteile
 * ========================================================= */

const getVerticalMemberInstances = (
    part,
    cabinet
) => {

    const source =
        getSource(part);


    const cabinetWidth =
        Number(
            cabinet.width
        ) || 0;


    const cabinetHeight =
        Number(
            cabinet.height
        ) || 0;


    const thickness =
        Number(
            cabinet.thickness
        ) || 19;


    /*
     * =====================================================
     * Seiten
     * =====================================================
     */

    if (
        isSidePart(part)
    ) {

        const configuredInstances =
            Array.isArray(
                source.instances
            ) &&
            source.instances.length > 0
                ? source.instances
                : [
                    {
                        id: "left",
                        side: "left",
                        continuous:
                            source.continuous ??
                            true
                    },
                    {
                        id: "right",
                        side: "right",
                        continuous:
                            source.continuous ??
                            true
                    }
                ];


        return configuredInstances.map(
            instance => {

                const isRight =
                    instance.side ===
                    "right";


                let x =
                    Number(
                        instance.x
                    );


                if (
                    !Number.isFinite(x)
                ) {

                    const centerX =
                        Number(
                            instance.centerX
                        );


                    if (
                        Number.isFinite(
                            centerX
                        )
                    ) {

                        x =
                            centerX -
                            thickness / 2;

                    } else {

                        x =
                            isRight
                                ? cabinetWidth -
                                  thickness
                                : 0;

                    }

                }


                const instanceWidth =
                    Number(
                        instance.width
                    );


                return {

                    id:
                        instance.id ??
                        instance.side,

                    side:
                        instance.side ??
                        (
                            isRight
                                ? "right"
                                : "left"
                        ),

                    x,

                    y:
                        Number(
                            instance.y ?? 0
                        ),

                    width:
                        Number.isFinite(
                            instanceWidth
                        )
                            ? instanceWidth
                            : thickness,

                    height:
                        Number(
                            instance.height ??
                            cabinetHeight
                        ),

                    continuous:
                        instance.continuous ??
                        source.continuous ??
                        true,

                    part

                };

            }
        );

    }


    /*
     * =====================================================
     * Vertikale Mittelwand
     * =====================================================
     */

    if (
        isMiddleWallPart(part) &&
        source.orientation ===
            "vertical"
    ) {

        const position =
            getPartPosition(
                part
            );


        const x =
            Number(
                source.x ??
                position.x
            );


        const y =
            Number(
                source.y ??
                position.y ??
                0
            );


        const width =
            Number(
                source.width ??
                part.T ??
                thickness
            );


        const height =
            Number(
                source.height ??
                part.L ??
                0
            );


        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            !Number.isFinite(width) ||
            !Number.isFinite(height)
        ) {

            return [];

        }


        return [

            {

                id:
                    source.wallId ??
                    part.PID,

                side:
                    "middle",

                x,

                y,

                width,

                height,

                /*
                 * Mittelwand:
                 * Instance-Wert bevorzugen,
                 * danach Source-Wert.
                 */

                continuous:
                    source.continuous ??
                    true,

                part

            }

        ];

    }


    return [];

};

/* =========================================================
 * Horizontale Plattengeometrie
 * ========================================================= */

const getHorizontalPanelGeometry = ({
    panel,
    cabinet
}) => {

    const part =
        panel?.part;


    if (
        !part
    ) {
        return null;
    }


    const source =
        getSource(part);


    const thickness =
        Number(
            cabinet.thickness
        ) || 19;


    const cabinetWidth =
        Number(
            cabinet.width
        ) || 0;


    /*
     * =====================================================
     * Deckel / Boden
     * =====================================================
     */

    if (
        panel.type === "top" ||
        panel.type === "bottom"
    ) {

        const instances =
            Array.isArray(
                source.instances
            )
                ? source.instances
                : [];


        /*
         * Exakte physische Instanz verwenden
         */

        const instance =
            instances.find(
                candidate =>
                    String(
                        candidate.id
                    ) ===
                    String(
                        panel.instanceId
                    )
            ) ??
            instances.find(
                candidate =>
                    candidate.role ===
                    panel.type
            );


        let x =
            Number(
                instance?.x
            );


        if (
            !Number.isFinite(x)
        ) {

            x =
                panel.type === "bottom" &&
                source.continuous === true
                    ? 0
                    : thickness;

        }


        let width =
            Number(
                instance?.width
            );


        if (
            !Number.isFinite(width)
        ) {

            width =
                Number(
                    part.L
                );


        }


        if (
            !Number.isFinite(width)
        ) {

            width =
                cabinetWidth -
                2 * thickness;

        }


        return {

            x,

            width,

            left:
                x,

            right:
                x + width,

            centerX:
                x +
                width / 2

        };

    }


    /*
     * =====================================================
     * Horizontale Mittelwand
     * =====================================================
     */

    if (
        panel.type ===
        "middleWall"
    ) {

        const position =
            getPartPosition(
                part
            );


        const x =
            Number(
                source.x ??
                position.x ??
                0
            );


        const width =
            Number(
                source.width ??
                part.L ??
                0
            );


        return {

            x,

            width,

            left:
                x,

            right:
                x + width,

            centerX:
                x +
                width / 2

        };

    }


    return null;

};


/* =========================================================
 * Ermitteln, an welcher Seite die Verbindung liegt
 * ========================================================= */

const getHorizontalSideForMember = ({
    panel,
    memberGeometry,
    member,
    cabinet
}) => {

    const panelGeometry =
        getHorizontalPanelGeometry({
            panel,
            cabinet
        });


    if (
        !panelGeometry
    ) {
        return null;
    }


    const memberLeft =
        Number(
            memberGeometry.x
        );


    const memberWidth =
        Number(
            memberGeometry.width
        ) || 0;


    const memberRight =
        memberLeft +
        memberWidth;


    const memberCenter =
        memberLeft +
        memberWidth / 2;


    /*
     * =====================================================
     * Seiten
     * =====================================================
     */

    if (
        isSidePart(member)
    ) {

        const configuredSide =
            memberGeometry.side;


        if (
            configuredSide === "left" ||
            configuredSide === "right"
        ) {

            const overlaps =
                panelGeometry.left <=
                    memberRight + 0.5 &&
                panelGeometry.right >=
                    memberLeft - 0.5;


            if (
                overlaps
            ) {

                return configuredSide;

            }

        }


        /*
         * Normaler Korpus:
         * Seite grenzt an die Platte.
         */

        if (
            isNear(
                panelGeometry.left,
                memberRight
            )
        ) {

            return "left";

        }


        if (
            isNear(
                panelGeometry.right,
                memberLeft
            )
        ) {

            return "right";

        }


        return null;

    }

    // console.log(panel, memberGeometry, member, panel);
    if (
        isMiddleWallPart(member)
    ) {

        const insidePanel =
            memberCenter >=
                panelGeometry.left - 0.5 &&
            memberCenter <=
                panelGeometry.right + 0.5;


        if (
            insidePanel
        ) {

            return "middle";

        }

    }


    /*
     * =====================================================
     * Normale Mittelwand-Verbindung
     *
     * Wenn die horizontale Platte nicht durchgehend ist,
     * bleibt die bisherige Grenzlogik erhalten.
     * =====================================================
     */

    if (
        isNear(
            panelGeometry.left,
            memberRight
        )
    ) {

        return "left";

    }


    if (
        isNear(
            panelGeometry.right,
            memberLeft
        )
    ) {

        return "right";

    }


    return null;

};


/* =========================================================
 * Fläche der vertikalen Platte
 * ========================================================= */

const getBoundaryFaceForPanel = ({
    panel,
    member,
    memberGeometry,
    cabinet
}) => {

    /*
     * Seiten haben ausschließlich Face A.
     */

    if (
        isSidePart(member)
    ) {

        return "A";

    }


    if (
        !isMiddleWallPart(member)
    ) {

        return "A";

    }


    const source =
        getSource(member);


    if (
        source.orientation !==
        "vertical"
    ) {

        return "A";

    }


    const panelGeometry =
        getHorizontalPanelGeometry({
            panel,
            cabinet
        });


    if (!panelGeometry) {
        return "A";
    }


    const memberLeft =
        Number(
            memberGeometry.x
        );


    const memberRight =
        memberLeft +
        Number(
            memberGeometry.width
        );


    /*
     * Panel rechts von Mittelwand
     * => rechte Wandseite B
     */

    if (
        isNear(
            panelGeometry.right,
            memberLeft
        )
    ) {

        return "B";

    }


    /*
     * Panel links von Mittelwand
     * => linke Wandseite A
     */

    if (
        isNear(
            panelGeometry.left,
            memberRight
        )
    ) {

        return "A";

    }


    return "A";

};


/* =========================================================
 * Tatsächliche Verbindung zwischen horizontal
 * und vertikal
 * ========================================================= */

const resolvePanelBoundary = ({
    panel,
    member,
    memberGeometry,
    cabinet
}) => {

    const panelGeometry =
        getHorizontalPanelGeometry({
            panel,
            cabinet
        });


    if (
        !panelGeometry
    ) {
        return null;
    }


    const panelThickness =
        Number(
            panel.part?.T ??
            cabinet.thickness ??
            19
        );


    const panelCenterY =
        Number(
            panel.centerY
        );


    if (
        !Number.isFinite(
            panelCenterY
        )
    ) {
        return null;
    }


    const panelTop =
        panelCenterY -
        panelThickness / 2;


    const panelBottom =
        panelCenterY +
        panelThickness / 2;


    const memberTop =
        Number(
            memberGeometry.y
        );


    const memberBottom =
        memberTop +
        Number(
            memberGeometry.height
        );


    /*
     * =====================================================
     * Vertikale Überschneidung / Berührung prüfen
     * =====================================================
     */

    if (
        panelBottom <
            memberTop - 0.5 ||
        panelTop >
            memberBottom + 0.5
    ) {

        return null;

    }


    /*
     * =====================================================
     * Räumliche Beziehung bestimmen
     *
     * left
     * right
     * middle
     * =====================================================
     */

    const horizontalSide =
        getHorizontalSideForMember({

            panel,

            member,

            memberGeometry,

            cabinet

        });


    if (
        !horizontalSide
    ) {

        return null;

    }


    const face =
        getBoundaryFaceForPanel({

            panel,

            member,

            memberGeometry,

            cabinet

        });


    return {

        type:
            isSidePart(member)
                ? "side"
                : "middleWall",

        part:
            member,

        memberGeometry,

        memberInstanceId:
            memberGeometry.id,

        horizontalSide,

        face

    };

};


// Hilfsfunktion Horizontal Joint

const getVerticalJointPosition = ({
    panel,
    boundary
}) => {

    const member =
        boundary?.part;

    const geometry =
        boundary?.memberGeometry;


    if (
        !geometry
    ) {

        return Number(
            panel?.centerY
        );

    }


    /*
     * Seiten laufen über die komplette
     * Korpus-Höhe.
     *
     * Hier entspricht panel.centerY bereits
     * der lokalen Position.
     */

    if (
        isSidePart(member)
    ) {

        return Number(
            panel.centerY
        );

    }


    const memberY =
        Number(
            geometry.y
        ) || 0;


    const memberHeight =
        Number(
            geometry.height
        );


    if (
        !Number.isFinite(
            memberHeight
        )
    ) {

        return Number(
            panel.centerY
        );

    }


    /*
     * Bei einer Mittelwand:
     *
     * Deckel:
     *     obere Kante der Mittelwand = 0
     *
     * Boden:
     *     untere Kante der Mittelwand = height
     *
     * Damit verwenden wir nicht mehr
     * die globale Korpusposition.
     */

    if (
        panel.type === "top"
    ) {

        return 0;

    }


    if (
        panel.type === "bottom"
    ) {

        return memberHeight;

    }


    /*
     * Fallback für andere horizontale Bauteile.
     *
     * Globale Y-Position in lokale Position
     * des vertikalen Bauteils umrechnen.
     */

    const localPosition =
        Number(
            panel.centerY
        ) -
        memberY;


    return Math.max(
        0,
        Math.min(
            memberHeight,
            localPosition
        )
    );

};

/* =========================================================
 * Horizontaler Verbinder
 *=======================================================
*/

const compileHorizontalJoint = ({
    panel,
    boundary,
    config,
    screwEnabled
}) => {

    if (
        !panel?.part ||
        !boundary?.part
    ) {
        console.log("Missing panel or boundary part for horizontal joint compilation.");
        return;

    }


    const verticalPart =
        boundary.part;


    const horizontalPart =
        panel.part;


    /*
     * Globale Position der horizontalen Platte.
     *
     * Wird weiterhin für das horizontale Bauteil
     * benötigt.
     */

    const verticalPosition =
        Number(
            panel.centerY
        );

        // console.log(boundary);

    /*
     * Lokale Position auf dem vertikalen Bauteil.
     *
     * Bei Seiten:
     *     panel.centerY
     *
     * Bei Mittelwänden:
     *     top    -> 0
     *     bottom -> member.height
     */

    const verticalJointPosition =
        getVerticalJointPosition({
            panel,
            boundary
        });


    const thickness =
        Number(
            horizontalPart.T ??
            config.thickness ??
            19
        ) || 19;


    const connectorThreshold =
        Number(
            config.spax.connector
                .holeCountThreshold ??
            300
        );


    let verticalContinuous =
        boundary.memberGeometry
            ?.continuous === true;


    const horizontalContinuous =
        panel.continuous === true;


    /*
     * =====================================================
     * Sonderfall:
     *
     * Durchgehender Boden +
     * vertikale Mittelwand
     *
     * Boden = durchgehend
     * Mittelwand = nicht durchgehend
     * =====================================================
     */

    // if (
    //     panel.type === "bottom"  &&
    //     isMiddleWallPart(
    //         verticalPart
    //     )
    // ) {

    //     verticalContinuous =
    //         false;

    // }


    /* =====================================================
     * FALL 1
     *
     * Vertikales Bauteil ist durchgehend
     * ===================================================== */

    // console.log("panel:", panel, "boundary:", boundary);

    if (
        verticalContinuous
    ) {

        /*
         * -------------------------------------------------
         * VB – 8 mm Verbinder
         *
         * Jetzt lokale Position verwenden.
         * -------------------------------------------------
         */

        const connectorHoleCount =
            getConnectorHoleCount(
                verticalPart.B,
                connectorThreshold
            );

        const connectorPattern =
            createDrillPattern({

                total:
                    Number(
                        verticalPart.B
                    ),

                start:
                    config.spax.connector
                        .startOffset,

                end:
                    config.spax.connector
                        .endOffset,

                count:
                    connectorHoleCount

            });


        addOperation(
            verticalPart,
            {

                type:
                    "VB",

                face:
                    boundary.face,

                position:
                    verticalJointPosition,

                rowStart:
                    config.spax.connector
                        .startOffset,

                rowEnd:
                    config.spax.connector
                        .endOffset,

                count:
                    connectorPattern.length,

                spacing:
                    connectorPattern.length >= 2
                        ? connectorPattern[1] -
                          connectorPattern[0]
                        : 0,

                positions:
                    connectorPattern,

                diameter:
                    config.spax.connector
                        .diameter,

                depth:
                    config.spax.connector
                        .depth,

                pattern:
                    "connector",

                source: {

                    type:
                        "joint",

                    role:
                        "spax",

                    panelType:
                        panel.type,

                    panelInstance:
                        panel.instanceId,

                    memberInstance:
                        boundary.memberInstanceId,

                    continuousPart:
                        "vertical",

                    operation:
                        "connector"

                }

            }
        );


        /*
         * -------------------------------------------------
         * VB – 5,1 mm Spax
         * -------------------------------------------------
         */

        if (
            screwEnabled
        ) {

            const screwHoleCount =
                getConnectorHoleCount(
                    verticalPart.B,
                    connectorThreshold
                );


            const screwPattern =
                createDrillPattern({

                    total:
                        Number(
                            verticalPart.B
                        ),

                    start:
                        config.spax.screw
                            .startOffset,

                    end:
                        config.spax.screw
                            .endOffset,

                    count:
                        screwHoleCount

                });


            addOperation(
                verticalPart,
                {

                    type:
                        "VB",

                    face:
                        boundary.face,

                    position:
                        verticalJointPosition,

                    rowStart:
                        config.spax.screw
                            .startOffset,

                    rowEnd:
                        config.spax.screw
                            .endOffset,

                    count:
                        screwPattern.length,

                    spacing:
                        screwPattern.length >= 2
                            ? screwPattern[1] -
                              screwPattern[0]
                            : 0,

                    positions:
                        screwPattern,

                    diameter:
                        config.spax.screw
                            .diameter,

                    depth:
                        config.spax.screw
                            .depth,

                    pattern:
                        "spax",

                    source: {

                        type:
                            "joint",

                        role:
                            "spax",

                        panelType:
                            panel.type,

                        panelInstance:
                            panel.instanceId,

                        memberInstance:
                            boundary.memberInstanceId,

                        continuousPart:
                            "vertical",

                        operation:
                            "spax"

                    }

                }
            );

        }


        /*
         * -------------------------------------------------
         * VBH auf horizontalem Bauteil
         * -------------------------------------------------
         */

        const horizontalHoleCount =
            getConnectorHoleCount(
                horizontalPart.B,
                connectorThreshold
            );


        const horizontalPattern =
            createDrillPattern({

                total:
                    Number(
                        horizontalPart.B
                    ),

                start:
                    config.spax.horizontal
                        .startOffset,

                end:
                    config.spax.horizontal
                        .endOffset,

                count:
                    horizontalHoleCount

            });


        const horizontalPosition =
            boundary.horizontalSide ===
                "right"

                ? Number(
                    horizontalPart.L
                ) -
                  thickness / 2

                : thickness / 2;


        addOperation(
            horizontalPart,
            {

                type:
                    "VBH",

                face:
                    "A",

                side:
                    boundary.horizontalSide,

                position:
                    horizontalPosition,

                count:
                    horizontalPattern.length,

                positions:
                    horizontalPattern,

                spacing:
                    horizontalPattern.length >= 2
                        ? horizontalPattern[1] -
                          horizontalPattern[0]
                        : 0,

                rowStart:
                    config.spax.horizontal
                        .startOffset,

                rowEnd:
                    config.spax.horizontal
                        .endOffset,

                diameter:
                    config.spax.horizontal
                        .diameter,

                depth:
                    config.spax.horizontal
                        .depth,

                source: {

                    type:
                        "joint",

                    role:
                        "spax",

                    panelType:
                        panel.type,

                    panelInstance:
                        panel.instanceId,

                    memberInstance:
                        boundary.memberInstanceId,

                    continuousPart:
                        "vertical",

                    operation:
                        "horizontalConnector"

                }

            }
        );


        return;

    }


    /* =====================================================
     * FALL 2
     *
     * Horizontales Bauteil ist durchgehend
     * ===================================================== */

    //randposition verbinder
    
    let continuousPosition =
        null;

    console.log("panel:", panel, "boundary:", boundary.horizontalSide);
    if (
        boundary.horizontalSide ===
        "left"
    ) {

        continuousPosition =
            thickness / 2;

    }

    else if (
        boundary.horizontalSide ===
        "right"
    ) {

        continuousPosition =
            Number(
                horizontalPart.L
            ) -
            thickness / 2;

    }

    else if (
        boundary.horizontalSide ===
        "middle"
    ) {

        continuousPosition =
            Number(
                boundary.memberGeometry.x
            ) +
            Number(
                boundary.memberGeometry.width
            ) / 2;

    }


    if (
        !Number.isFinite(
            continuousPosition
        )
    ) {

        return;

    }


    /*
     * -----------------------------------------------------
     * VB auf dem durchgehenden horizontalen Bauteil
     * -----------------------------------------------------
     */

    const connectorHoleCount =
        getConnectorHoleCount(
            horizontalPart.B,
            connectorThreshold
        );


    const connectorPattern =
        createDrillPattern({

            total:
                Number(
                    horizontalPart.B
                ),

            start:
                config.spax.connector
                    .startOffset,

            end:
                config.spax.connector
                    .endOffset,

            count:
                connectorHoleCount

        });


    addOperation(
        horizontalPart,
        {

            type:
                "VB",

            face:
                "A",

            position:
                continuousPosition,

            rowStart:
                config.spax.connector
                    .startOffset,

            rowEnd:
                config.spax.connector
                    .endOffset,

            count:
                connectorPattern.length,

            spacing:
                connectorPattern.length >= 2
                    ? connectorPattern[1] -
                      connectorPattern[0]
                    : 0,

            positions:
                connectorPattern,

            diameter:
                config.spax.connector
                    .diameter,

            depth:
                config.spax.connector
                    .depth,

            pattern:
                "connector",

            source: {

                type:
                    "joint",

                role:
                    "spax",

                panelType:
                    panel.type,

                panelInstance:
                    panel.instanceId,

                memberInstance:
                    boundary.memberInstanceId,

                continuousPart:
                    "horizontal",

                operation:
                    "connector"

            }

        }
    );


    /*
     * -----------------------------------------------------
     * Spax auf horizontalem durchgehendem Bauteil
     * -----------------------------------------------------
     */

    if (
        screwEnabled
    ) {

        const screwHoleCount =
            getConnectorHoleCount(
                horizontalPart.B,
                connectorThreshold
            );


        const screwPattern =
            createDrillPattern({

                total:
                    Number(
                        horizontalPart.B
                    ),

                start:
                    config.spax.screw
                        .startOffset,

                end:
                    config.spax.screw
                        .endOffset,

                count:
                    screwHoleCount

            });


        addOperation(
            horizontalPart,
            {

                type:
                    "VB",

                face:
                    "A",

                position:
                    continuousPosition,

                rowStart:
                    config.spax.screw
                        .startOffset,

                rowEnd:
                    config.spax.screw
                        .endOffset,

                count:
                    screwPattern.length,

                spacing:
                    screwPattern.length >= 2
                        ? screwPattern[1] -
                          screwPattern[0]
                        : 0,

                positions:
                    screwPattern,

                diameter:
                    config.spax.screw
                        .diameter,

                depth:
                    config.spax.screw
                        .depth,

                pattern:
                    "spax",

                source: {

                    type:
                        "joint",

                    role:
                        "spax",

                    panelType:
                        panel.type,

                    panelInstance:
                        panel.instanceId,

                    memberInstance:
                        boundary.memberInstanceId,

                    continuousPart:
                        "horizontal",

                    operation:
                        "spax"

                }

            }
        );

    }


    /*
     * -----------------------------------------------------
     * VBH auf nicht durchgehendem vertikalem Bauteil
     * -----------------------------------------------------
     *
     * Hier ist jetzt der entscheidende Unterschied:
     *
     * Die Position wird NICHT mehr aus
     * panel.centerY (globale Korpus-Y-Position)
     * übernommen.
     *
     * Bei einer Mittelwand:
     *
     * Deckel -> 0
     * Boden -> member.height
     * -----------------------------------------------------
     */

    const horizontalHoleCount =
        getConnectorHoleCount(
            verticalPart.B,
            connectorThreshold
        );


    const horizontalPattern =
        createDrillPattern({

            total:
                Number(
                    verticalPart.B
                ),

            start:
                config.spax.horizontal
                    .startOffset,

            end:
                config.spax.horizontal
                    .endOffset,

            count:
                horizontalHoleCount
        });

    addOperation(
        verticalPart,
        {

            type:
                "VBH",

            face:
                boundary.face,

            side: boundary.horizontalSide !== "middle" ? boundary.horizontalSide :panel.type === "top" ? "left" : panel.type === "bottom" ? "right" : boundary.horizontalSide,

            position:
                verticalJointPosition,

            count:
                horizontalPattern.length,

            positions:
                horizontalPattern,

            spacing:
                horizontalPattern.length >= 2
                    ? horizontalPattern[1] -
                      horizontalPattern[0]
                    : 0,

            rowStart:
                config.spax.horizontal
                    .startOffset,

            rowEnd:
                config.spax.horizontal
                    .endOffset,

            diameter:
                config.spax.horizontal
                    .diameter,

            depth:
                config.spax.horizontal
                    .depth,

            source: {

                type:
                    "joint",

                role:
                    "spax",

                panelType:
                    panel.type,

                panelInstance:
                    panel.instanceId,

                memberInstance:
                    boundary.memberInstanceId,

                continuousPart:
                    "horizontal",

                operation:
                    "horizontalConnector"

            }

        }
    );

};


/* =========================================================
 * Horizontale Platten sammeln
 * ========================================================= */

const getHorizontalPanels = ({
    parts,
    sections
}) => {

    const panels = [];


    /*
     * =====================================================
     * Deckel / Boden
     * =====================================================
     */

    const horizontalParts =
        parts.filter(
            part =>
                getSource(part).role ===
                "horizontalPanel"
        );


    horizontalParts.forEach(
        part => {

            const source =
                getSource(part);


            const instances =
                Array.isArray(
                    source.instances
                )
                    ? source.instances
                    : [];


            instances.forEach(
                instance => {

                    if (
                        instance.role !== "top" &&
                        instance.role !== "bottom"
                    ) {

                        return;

                    }


                    const y =
                        Number(
                            instance.y
                        );


                    const height =
                        Number(
                            instance.height ??
                            part.T ??
                            19
                        );


                    const centerY =
                        Number(
                            instance.centerY
                        );


                    panels.push({

                        type:
                            instance.role,

                        part,

                        centerY:
                            Number.isFinite(
                                centerY
                            )
                                ? centerY
                                : y +
                                  height / 2,

                        instanceId:
                            instance.id,

                        /*
                         * NEU
                         */
                        continuous:
                            instance.continuous ??
                            source.continuous ??
                            false

                    });

                }
            );

        }
    );


    /*
     * =====================================================
     * Horizontale Mittelwände
     * =====================================================
     */

    sections.forEach(
        section => {

            const functions =
                Array.isArray(
                    section.functionConfig
                )
                    ? section.functionConfig
                    : [];


            functions
                .filter(
                    func =>
                        func.type ===
                            "middleWall" &&
                        (
                            func.orientation ??
                            "horizontal"
                        ) ===
                            "horizontal"
                )
                .forEach(
                    wall => {

                        const part =
                            parts.find(
                                candidate => {

                                    const source =
                                        getSource(
                                            candidate
                                        );


                                    return (
                                        isMiddleWallPart(
                                            candidate
                                        ) &&
                                        source.wallId ===
                                            wall.id &&
                                        source.orientation ===
                                            "horizontal"
                                    );

                                }
                            );


                        if (!part) {
                            return;
                        }


                        const position =
                            getPartPosition(
                                part
                            );


                        const source =
                            getSource(
                                part
                            );


                        const y =
                            Number(
                                source.y ??
                                position.y
                            );


                        const height =
                            Number(
                                source.height ??
                                part.T ??
                                19
                            );


                        const centerY =
                            Number(
                                source.centerY
                            );


                        panels.push({

                            type:
                                "middleWall",

                            part,

                            centerY:
                                Number.isFinite(
                                    centerY
                                )
                                    ? centerY
                                    : y +
                                      height / 2,

                            instanceId:
                                wall.id,

                            sectionId:
                                section.id,

                            wallId:
                                wall.id,

                            continuous:
                                source.continuous ??
                                true

                        });

                    }
                );

        }
    );


    return panels;

};


/* =========================================================
 * Vertikale Mitglieder
 * ========================================================= */

const getVerticalMembers = (
    parts
) => {

    return parts.filter(
        part => {

            if (
                isSidePart(part)
            ) {

                return true;

            }


            return (
                isMiddleWallPart(part) &&
                getSource(part)
                    .orientation ===
                    "vertical"
            );

        }
    );

};


/* =========================================================
 * Hauptroutine
 * ========================================================= */

export const compileSpax = ({
    cabinet,
    parts,
    sections,
    config
}) => {

    /*
     * Die 8-mm-Verbinder werden immer erzeugt.
     *
     * cabinet.spax steuert ausschließlich,
     * ob zusätzlich die 5-mm-Spaxbohrungen
     * erzeugt werden.
     */

    const screwEnabled =
        cabinet.spax === true &&
        config.spax.enabled === true;


    const panels =
        getHorizontalPanels({
            parts,
            sections
        });


    const verticalMembers =
        getVerticalMembers(
            parts
        );


    panels.forEach(
        panel => {

            verticalMembers.forEach(
                member => {

                    const instances =
                        getVerticalMemberInstances(
                            member,
                            cabinet
                        );


                    instances.forEach(
                        memberGeometry => {

                            const boundary =
                                resolvePanelBoundary({

                                    panel,

                                    member,

                                    memberGeometry,

                                    cabinet

                                });


                            if (
                                !boundary
                            ) {
                                return;
                            }


                            compileHorizontalJoint({

                                panel,

                                boundary,

                                config,

                                screwEnabled

                            });

                        }
                    );

                }
            );

        }
    );

};