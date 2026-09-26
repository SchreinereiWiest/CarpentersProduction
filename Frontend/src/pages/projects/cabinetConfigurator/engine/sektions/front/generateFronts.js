import { createId } from "../../../components/cabinetEditor";
import { calculateSplitSizes } from "../calcSplitSizes";

export const generateFronts = (
    spec,
    direction,
    activeCabinet,
    updateActiveCabinet,
    setSelectedElement
) => {

    const cabinet =
        activeCabinet;

    if (!cabinet) {
        return;
    }


    // =====================================================
    // Fuge zwischen den Fronten
    // =====================================================

    const gap =
        Math.max(
            0,
            Number(
                cabinet.frontGap ?? 3
            )
        );


    // =====================================================
    // Äußere Fugen
    // =====================================================

    const gapLeft =
        Math.max(
            0,
            Number(
                cabinet.frontGapLeft ?? 0
            )
        );

    const gapRight =
        Math.max(
            0,
            Number(
                cabinet.frontGapRight ?? 0
            )
        );

    const gapTop =
        Math.max(
            0,
            Number(
                cabinet.frontGapTop ?? 0
            )
        );

    const gapBottom =
        Math.max(
            0,
            Number(
                cabinet.frontGapBottom ?? 0
            )
        );


    const cabinetWidth =
        Number(
            cabinet.width
        );

    const cabinetHeight =
        Number(
            cabinet.height
        );


    if (
        !Number.isFinite(cabinetWidth) ||
        !Number.isFinite(cabinetHeight) ||
        cabinetWidth <= 0 ||
        cabinetHeight <= 0
    ) {
        return;
    }


    // =====================================================
    // Verfügbare Außenfläche
    // =====================================================

    const availableWidth =
        cabinetWidth -
        gapLeft -
        gapRight;

    const availableHeight =
        cabinetHeight -
        gapTop -
        gapBottom;


    if (
        availableWidth <= 0 ||
        availableHeight <= 0
    ) {
        console.error(
            "Äußere Frontfugen sind größer als die Frontfläche.",
            {
                cabinetWidth,
                cabinetHeight,
                gapLeft,
                gapRight,
                gapTop,
                gapBottom
            }
        );

        return;
    }


    // =====================================================
    // Aufteilbare Dimension
    // =====================================================

    const totalSize =
        direction === "vertical"
            ? availableHeight
            : availableWidth;


    const sizes =
        calculateSplitSizes(
            totalSize,
            spec,
            gap
        );


    if (
        sizes.length === 0
    ) {
        console.warn(
            "Keine gültigen Frontmaße gefunden.",
            {
                spec,
                totalSize,
                gap
            }
        );

        return;
    }


    console.log(
        "Front-Aufteilung:",
        {
            spec,
            direction,

            totalSize,

            gap,

            gapLeft,
            gapRight,
            gapTop,
            gapBottom,

            sizes
        }
    );


    // =====================================================
    // Fronten erzeugen
    // =====================================================

    let position = 0;


    const fronts =
        sizes.map(
            (
                size,
                index
            ) => {

                const numericSize =
                    Number(size);


                if (
                    !Number.isFinite(
                        numericSize
                    ) ||
                    numericSize <= 0
                ) {
                    return null;
                }


                const isFirst =
                    index === 0;

                const isLast =
                    index ===
                    sizes.length - 1;


                const front = {

                    id:
                        createId(),

                    type:
                        "front",

                    name:
                        `Front ${index + 1}`,

                    materialId:
                        cabinet.frontMaterialId,


                    // =================================================
                    // Position
                    // =================================================

                    x:
                        direction === "vertical"
                            ? gapLeft
                            : gapLeft + position,

                    y:
                        direction === "vertical"
                            ? gapTop + position
                            : gapTop,


                    // =================================================
                    // Größe
                    // =================================================

                    width:
                        direction === "vertical"
                            ? availableWidth
                            : numericSize,

                    height:
                        direction === "vertical"
                            ? numericSize
                            : availableHeight,


                    // =================================================
                    // Tatsächliche Fugen
                    // =================================================

                    gapTop:
                        direction === "vertical"
                            ? (
                                isFirst
                                    ? gapTop
                                    : gap
                            )
                            : gapTop,

                    gapBottom:
                        direction === "vertical"
                            ? (
                                isLast
                                    ? gapBottom
                                    : gap
                            )
                            : gapBottom,

                    gapLeft:
                        direction === "horizontal"
                            ? (
                                isFirst
                                    ? gapLeft
                                    : gap
                            )
                            : gapLeft,

                    gapRight:
                        direction === "horizontal"
                            ? (
                                isLast
                                    ? gapRight
                                    : gap
                            )
                            : gapRight
                };


                position +=
                    numericSize +
                    gap;


                return front;
            }
        );


    const validFronts =
        fronts.filter(Boolean);


    if (
        validFronts.length === 0
    ) {
        return;
    }


    updateActiveCabinet({
        fronts:
            validFronts
    });


    setSelectedElement(null);
};