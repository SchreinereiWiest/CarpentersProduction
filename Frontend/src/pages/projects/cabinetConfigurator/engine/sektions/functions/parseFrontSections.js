import { getAvailableCabinetArea } from "./getAvailableCabinetArea";

export function createId() {
    return Date.now() + Math.random();
}

export const frontsToSections = (
    fronts = [],
    cabinet
) => {

    if (
        !Array.isArray(fronts) ||
        fronts.length === 0 ||
        !cabinet
    ) {
        return [];
    }


    const thickness =
        Number(
            cabinet.thickness ?? 0
        );

    const cabinetWidth =
        Number(cabinet.width);

    const cabinetHeight =
        Number(cabinet.height);

    const defaultGap =
        Number(
            cabinet.sectionGap ?? 3
        );


    if (
        !Number.isFinite(thickness) ||
        !Number.isFinite(cabinetWidth) ||
        !Number.isFinite(cabinetHeight)
    ) {
        return [];
    }


    const availableArea =
        getAvailableCabinetArea(
            cabinet
        );


    if (
        availableArea.width <= 0 ||
        availableArea.height <= 0
    ) {
        return [];
    }

    const innerWidth =
        availableArea.width;


    const innerHeight =
        availableArea.height;


    const convertLevel = (
        sourceFronts,
        parentSection = null
    ) => {

        if (
            !Array.isArray(sourceFronts) ||
            sourceFronts.length === 0
        ) {
            return [];
        }


        const sortedFronts =
            [...sourceFronts].sort(
                (a, b) => {

                    if (
                        Number(a.x) !==
                        Number(b.x)
                    ) {
                        return (
                            Number(a.x) -
                            Number(b.x)
                        );
                    }

                    return (
                        Number(a.y) -
                        Number(b.y)
                    );
                }
            );


        let direction = "vertical";


        if (
            sortedFronts.length > 1
        ) {

            const first =
                sortedFronts[0];

            const second =
                sortedFronts[1];


            if (
                Number(first.x) !==
                Number(second.x)
            ) {
                direction = "horizontal";
            }
        }


        let totalStart;
        let totalEnd;


        // =====================================================
        // NESTED SECTION
        // =====================================================

        if (parentSection) {

            if (
                direction === "vertical"
            ) {

                totalStart =
                    Number(
                        parentSection.y
                    );

                totalEnd =
                    Number(
                        parentSection.y
                    ) +
                    Number(
                        parentSection.height
                    );

            } else {

                totalStart =
                    Number(
                        parentSection.x
                    );

                totalEnd =
                    Number(
                        parentSection.x
                    ) +
                    Number(
                        parentSection.width
                    );
            }

        }


        // =====================================================
        // ROOT LEVEL
        // =====================================================

        else {

            if (
                direction === "vertical"
            ) {

                /*
                 * Genau dieselbe Innengeometrie wie
                 * createAvailableSection().
                 */

                totalStart =
                    availableArea.top;

                totalEnd =
                    availableArea.bottom;

            } else {

                totalStart =
                    availableArea.x;

                totalEnd =
                    availableArea.x +
                    availableArea.width;

            }
        }


        const totalSize =
            totalEnd -
            totalStart;


        if (
            !Number.isFinite(totalSize) ||
            totalSize <= 0
        ) {
            return [];
        }


        const getGap = (
            front,
            side
        ) => {

            const value =
                Number(
                    front?.[side]
                );

            if (
                Number.isFinite(value) &&
                value >= 0
            ) {
                return value;
            }

            return defaultGap;
        };


        const sections = [];


        sortedFronts.forEach(
            (
                front,
                index
            ) => {

                const isFirst =
                    index === 0;

                const isLast =
                    index ===
                    sortedFronts.length - 1;


                const frontX =
                    Number(front.x);

                const frontY =
                    Number(front.y);

                const frontWidth =
                    Number(front.width);

                const frontHeight =
                    Number(front.height);


                if (
                    !Number.isFinite(frontX) ||
                    !Number.isFinite(frontY) ||
                    !Number.isFinite(frontWidth) ||
                    !Number.isFinite(frontHeight)
                ) {
                    return;
                }


                // =================================================
                // VERTIKAL
                // =================================================

                if (
                    direction === "vertical"
                ) {

                    const frontTop =
                        frontY;

                    const frontBottom =
                        frontY +
                        frontHeight;


                    let gapAbove = 0;

if (!isFirst) {

    const previous =
        sortedFronts[index - 1];

    const previousBottom =
        Number(previous.y) +
        Number(previous.height);

    const geometricGap =
        frontTop -
        previousBottom;

    gapAbove =
        geometricGap >= 0
            ? geometricGap
            : Math.max(
                getGap(
                    previous,
                    "gapBottom"
                ),
                getGap(
                    front,
                    "gapTop"
                )
            );
}


let gapBelow = 0;

if (!isLast) {

    const next =
        sortedFronts[index + 1];

    const nextTop =
        Number(next.y);

    const geometricGap =
        nextTop -
        frontBottom;

    gapBelow =
        geometricGap >= 0
            ? geometricGap
            : Math.max(
                getGap(
                    front,
                    "gapBottom"
                ),
                getGap(
                    next,
                    "gapTop"
                )
            );
}


                    const sectionY =
                        isFirst
                            ? totalStart +
                              gapAbove / 2
                            : frontTop -
                              gapAbove / 2;


                    const sectionBottom =
                        isLast
                            ? totalEnd -
                              gapBelow / 2
                            : frontBottom +
                              gapBelow / 2;


                    const x =
                        parentSection
                            ? Number(
                                parentSection.x
                            )
                            : availableArea.x;


                    const width =
                        parentSection
                            ? Number(
                                parentSection.width
                            )
                            : innerWidth;


                    const sectionHeight =
                        sectionBottom -
                        sectionY;


                    if (
                        !Number.isFinite(sectionY) ||
                        !Number.isFinite(sectionBottom) ||
                        !Number.isFinite(sectionHeight) ||
                        width <= 0 ||
                        sectionHeight <= 0
                    ) {
                        return;
                    }


                    const section = {

                        id:
                            createId(),

                        type:
                            "section",

                        name:
                            "Section",

                        parentId:
                            parentSection?.id ??
                            null,

                        frontId:
                            front.id,

                        x,

                        y:
                            sectionY,

                        width,

                        height:
                            sectionHeight,

                        children: []
                    };


                    if (
                        front.children &&
                        front.children.length > 0
                    ) {

                        section.children =
                            convertLevel(
                                front.children,
                                section
                            );
                    }


                    sections.push(
                        section
                    );

                    return;
                }


                // =================================================
                // HORIZONTAL
                // =================================================

                const frontLeft =
                    frontX;

                const frontRight =
                    frontX +
                    frontWidth;


                let gapLeft = 0;


                if (isFirst) {

                    gapLeft =
                        getGap(
                            front,
                            "gapLeft"
                        );

                } else {

                    const previous =
                        sortedFronts[
                            index - 1
                        ];

                    const previousRight =
                        Number(
                            previous.x
                        ) +
                        Number(
                            previous.width
                        );

                    const geometricGap =
                        frontLeft -
                        previousRight;


                    gapLeft =
                        geometricGap >= 0
                            ? geometricGap
                            : Math.max(
                                getGap(
                                    previous,
                                    "gapRight"
                                ),
                                getGap(
                                    front,
                                    "gapLeft"
                                )
                            );
                }


                let gapRight = 0;


                if (isLast) {

                    gapRight =
                        getGap(
                            front,
                            "gapRight"
                        );

                } else {

                    const next =
                        sortedFronts[
                            index + 1
                        ];

                    const nextLeft =
                        Number(
                            next.x
                        );

                    const geometricGap =
                        nextLeft -
                        frontRight;


                    gapRight =
                        geometricGap >= 0
                            ? geometricGap
                            : Math.max(
                                getGap(
                                    front,
                                    "gapRight"
                                ),
                                getGap(
                                    next,
                                    "gapLeft"
                                )
                            );
                }


                const sectionX =
                    isFirst
                        ? totalStart +
                          gapLeft / 2
                        : frontLeft -
                          gapLeft / 2;


                const sectionRight =
                    isLast
                        ? totalEnd -
                          gapRight / 2
                        : frontRight +
                          gapRight / 2;


                const y =
                    parentSection
                        ? Number(
                            parentSection.y
                        )
                        : availableArea.y;


                const height =
                    parentSection
                        ? Number(
                            parentSection.height
                        )
                        : innerHeight;


                const sectionWidth =
                    sectionRight -
                    sectionX;


                if (
                    !Number.isFinite(sectionX) ||
                    !Number.isFinite(sectionRight) ||
                    !Number.isFinite(sectionWidth) ||
                    sectionWidth <= 0 ||
                    height <= 0
                ) {
                    return;
                }


                const section = {

                    id:
                        createId(),

                    type:
                        "section",

                    name:
                        "Section",

                    parentId:
                        parentSection?.id ??
                        null,

                    frontId:
                        front.id,

                    x:
                        sectionX,

                    y,

                    width:
                        sectionWidth,

                    height,

                    children: []
                };


                if (
                    front.children &&
                    front.children.length > 0
                ) {

                    section.children =
                        convertLevel(
                            front.children,
                            section
                        );
                }


                sections.push(
                    section
                );

            }
        );


        return sections;
    };


    return convertLevel(
        fronts
    );
};