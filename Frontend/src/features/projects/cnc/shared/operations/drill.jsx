import {
    isFiniteNumber,
    getSelectedFill,
    getSelectedStroke
} from "./operationUtils.js";


export default function Drill({
    operation,
    operationId,
    selected,
    onSelect
}) {

    /*
     * =====================================================
     * Erste Bohrung bestimmen
     * =====================================================
     */

    let x = null;
    let y = null;


    /*
     * X direkt angegeben
     */

    if (
        isFiniteNumber(
            operation.x
        )
    ) {

        x =
            Number(
                operation.x
            );

    }


    /*
     * Y direkt angegeben
     */

    if (
        isFiniteNumber(
            operation.y
        )
    ) {

        y =
            Number(
                operation.y
            );

    }

    


    if (
        x === null ||
        y === null
    ) {

        return null;

    }


    /* =====================================================
     * Wiederholungsparameter
     * ===================================================== */

    const repeatCount =
        Math.max(
            1,
            Math.floor(
                Number(
                    operation.R ??
                    operation.r ??
                    1
                )
            )
        );

    const hasGrid = operation.columns !== undefined || operation.rows !== undefined;
    const columns = Math.max(1, Math.floor(Number(operation.columns ?? 1)));
    const rows = Math.max(1, Math.floor(Number(operation.rows ?? 1)));


    const xOffset =
        Number(
            operation.XOffset ??
            operation.xOffset ??
            0
        );


    const yOffset =
        Number(
            operation.YOffset ??
            operation.yOffset ??
            0
        );


    const diameter =
        Math.max(
            2,
            Number(
                operation.diameter ??
                5
            )
        );


    const radius =
        diameter / 2;


    /*
     * =====================================================
     * Alle berechneten Bohrungen erzeugen
     * ===================================================== */

    const holes = hasGrid
        ? Array.from({ length: rows }, (_, row) =>
            Array.from({ length: columns }, (_, column) => ({
                x: x + column * xOffset,
                y: y + row * yOffset
            }))
        ).flat()
        : Array.from({ length: repeatCount }, (_, index) => ({
            x: x + index * xOffset,
            y: y + index * yOffset
        }));


    return (
        <>
            {
                holes.map(
                    (
                        hole,
                        index
                    ) => (

                        <circle
                            key={`${operationId}-${index}`}

                            cx={
                                hole.x
                            }

                            cy={
                                hole.y
                            }

                            r={
                                selected
                                    ? radius + 2
                                    : radius
                            }

                            fill={
                                getSelectedFill(
                                    selected
                                )
                            }

                            stroke={
                                getSelectedStroke(
                                    selected
                                )
                            }

                            strokeWidth={
                                selected
                                    ? 2
                                    : 1
                            }

                            className="cursor-pointer"

                            onClick={(event) => {

                                event.stopPropagation();

                                onSelect?.(
                                    operationId
                                );

                            }}

                        />

                    )
                )
            }
        </>
    );

}
