import {
    getSource,
    isSidePart,
    isMiddleWallPart,
    isNear,
    getPartPosition
} from "../cncHelpers";
/* =========================================================
 * Vertikale Bauteile
 * ========================================================= */


// Helper function to get all vertical members (sides and middle walls) from a list of parts

export const getVerticalMembers = (parts) => {

    return parts.filter(part => {

        if (isSidePart(part)) {
            return true;
        }

        const source =
            getSource(part);

        const role =
            String(
                source.role ?? ""
            ).toLowerCase();

        return (
            role === "middlewall" &&
            source.orientation === "vertical"
        );

    });

};


/* =========================================================
 * Physische Instanzen eines vertikalen Bauteils
 * ========================================================= */

export const getMemberInstances = ({
    part,
    cabinet,
    sections = []
}) => {

    const source =
        getSource(part);

    const thickness =
        Number(
            cabinet.thickness
        ) || 19;

    const width =
        Number(
            cabinet.width
        ) || 0;

    const height =
        Number(
            cabinet.height
        ) || 0;


    /*
     * Seiten
     */

    if (isSidePart(part)) {

        const instances =
            Array.isArray(
                source.instances
            ) &&
            source.instances.length
                ? source.instances
                : [
                    {
                        id: "left",
                        side: "left"
                    },
                    {
                        id: "right",
                        side: "right"
                    }
                ];


        return instances.map(
            instance => {

                const right =
                    instance.side === "right";

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
                            right
                                ? width - thickness
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
                            right
                                ? "right"
                                : "left"
                        ),

                    x,

                    width:
                        Number.isFinite(
                            instanceWidth
                        )
                            ? instanceWidth
                            : thickness,

                    y: 0,

                    height

                };

            }
        );

    }


    /*
     * Vertikale Mittelwände
     */

    if (
        isMiddleWallPart(part) &&
        source.orientation === "vertical"
    ) {

        const position =
            getPartPosition(part);


        const section =
            sections.find(
                candidate =>
                    String(
                        candidate.id
                    ) ===
                    String(
                        source.sectionId
                    )
            );


        let x =
            Number(
                source.x
            );

        if (
            !Number.isFinite(x) &&
            section
        ) {

            x =
                Number(
                    section.x
                );

        }

        if (
            !Number.isFinite(x)
        ) {

            x =
                Number(
                    position.x
                );

        }


        let memberWidth =
            Number(
                source.width
            );

        if (
            !Number.isFinite(
                memberWidth
            ) &&
            section
        ) {

            memberWidth =
                Number(
                    section.width
                );

        }

        if (
            !Number.isFinite(
                memberWidth
            )
        ) {

            memberWidth =
                Number(
                    part.T
                ) || thickness;

        }


        let y =
            Number(
                source.y
            );

        if (
            !Number.isFinite(y) &&
            section
        ) {

            y =
                Number(
                    section.y
                );

        }

        if (
            !Number.isFinite(y)
        ) {

            y =
                Number(
                    position.y
                ) || 0;

        }


        let memberHeight =
            Number(
                source.height
            );

        if (
            !Number.isFinite(
                memberHeight
            ) &&
            section
        ) {

            memberHeight =
                Number(
                    section.height
                );

        }

        if (
            !Number.isFinite(
                memberHeight
            )
        ) {

            memberHeight =
                Number(
                    part.L
                ) || 0;

        }
        return [
            {

                id:
                    source.wallId ??
                    part.PID,

                x,

                width:
                    memberWidth,

                y,

                height:
                    memberHeight

            }
        ];

    }


    return [];

};


/* =========================================================
 * Sektionsgrenzen
 * ========================================================= */

export const getBoundary = ({
    section,
    side,
    cabinet,
    parts,
    sections = []
}) => {

    const sectionX =
        Number(
            section.x
        );

    const sectionRight =
        sectionX +
        Number(
            section.width
        );

    const cabinetWidth =
        Number(
            cabinet.width
        );

    const thickness =
        Number(
            cabinet.thickness
        ) || 19;

    const innerLeft =
        thickness;

    const innerRight =
        cabinetWidth -
        thickness;


    const verticalMembers =
        getVerticalMembers(
            parts
        );


    /*
     * Linke äußere Seite
     */

    if (
        side === "left" &&
        isNear(
            sectionX,
            innerLeft
        )
    ) {

        const part =
            parts.find(
                part =>
                    isSidePart(part)
            );

        if (!part) {
            return null;
        }

        return {
            part,
            face: "A"
        };

    }


    /*
     * Rechte äußere Seite
     */

    if (
        side === "right" &&
        isNear(
            sectionRight,
            innerRight
        )
    ) {

        const part =
            parts.find(
                part =>
                    isSidePart(part)
            );

        if (!part) {
            return null;
        }

        return {
            part,
            face: "A"
        };

    }


    /*
     * Innere Mittelwände
     *
     * Linke Grenze:
     * --------------------------------
     * Wand liegt rechts der Grenze
     * => rechte Wandseite = B
     *
     * Wand liegt links der Grenze
     * => linke Wandseite = A
     */

    for (
        const part of verticalMembers
    ) {

        if (
            isSidePart(part)
        ) {
            continue;
        }


        const instances =
            getMemberInstances({
                part,
                cabinet,
                sections
            });


        for (
            const instance of instances
        ) {

            const left =
                Number(
                    instance.x
                );

            const right =
                left +
                Number(
                    instance.width
                );


            if (
                side === "left" &&
                isNear(
                    right,
                    sectionX
                )
            ) {

                return {
                    part,
                    face: "B"
                };

            }


            if (
                side === "left" &&
                isNear(
                    left,
                    sectionX
                )
            ) {

                return {
                    part,
                    face: "A"
                };

            }


            /*
             * Rechte Grenze:
             *
             * Wand beginnt an der Grenze
             * => linke Wandseite = A
             *
             * Wand endet an der Grenze
             * => rechte Wandseite = B
             */

            if (
                side === "right" &&
                isNear(
                    left,
                    sectionRight
                )
            ) {

                return {
                    part,
                    face: "A"
                };

            }


            if (
                side === "right" &&
                isNear(
                    right,
                    sectionRight
                )
            ) {

                return {
                    part,
                    face: "B"
                };

            }

        }

    }


    return null;

};


export const resolveSectionBoundaries = ({
    section,
    cabinet,
    parts,
    sections = []
}) => {

    return {

        left:
            getBoundary({
                section,
                side: "left",
                cabinet,
                parts,
                sections
            }),

        right:
            getBoundary({
                section,
                side: "right",
                cabinet,
                parts,
                sections
            })

    };

};

