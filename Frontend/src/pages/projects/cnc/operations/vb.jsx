

import React from "react";
import {
    getPartHeight,
    isFiniteNumber,
    getSelectedFill,
    getSelectedStroke
} from "./operationUtils";

export default function VB({
    operation,
    part,
    operationId,
    selected,
    onSelect
}) {

    const partHeight =
        getPartHeight(part);


    /*
     * ========================================================
     * X-Position
     * ========================================================
     *
     * Die Verbindung liegt an einer bestimmten Position
     * entlang L.
     */

    let x = null;


    if (
        isFiniteNumber(
            operation.x
        )
    ) {

        x =
            Number(
                operation.x
            );

    } else if (
        isFiniteNumber(
            operation.position
        )
    ) {

        x =
            Number(
                operation.position
            );
    }


    if (
        x === null
    ) {
        return null;
    }


    /*
     * ========================================================
     * Y-Start
     * ========================================================
     *
     * Neuer Wert:
     *
     * rowStart
     *
     * Fallback:
     *
     * connector = 50
     * screw     = 60
     *
     * Das entspricht dem alten CNC-Programm:
     *
     * Dübel:
     *     y=50
     *
     * Schraube:
     *     y=60
     */

    let rowStart;


    if (
        isFiniteNumber(
            operation.rowStart
        )
    ) {

        rowStart =
            Number(
                operation.rowStart
            );

    } else if (
        isFiniteNumber(
            operation.y
        )
    ) {

        rowStart =
            Number(
                operation.y
            );

    } else {

        rowStart =
            operation.pattern ===
                "spax"
                ? 60
                : 50;
    }


    /*
     * ========================================================
     * Anzahl / Raster
     * ========================================================
     */

    const count =
        Math.max(
            1,
            Number(
                operation.count ??
                3
            )
        );


    /*
     * Original:
     *
     * R=(DY-100)/3
     *
     * Deshalb:
     */

    const spacing =
        isFiniteNumber(
            operation.spacing
        )
            ? Number(
                operation.spacing
            )
            : Math.max(
                0,
                (
                    partHeight -
                    100
                ) / 3
            );


    /*
     * ========================================================
     * Bohrungen
     * ========================================================
     */

    const points =
        Array.from(
            {
                length: count
            },
            (_, index) => ({
                x,
                y:
                    rowStart +
                    index * spacing
            })
        );


    const diameter =
        Math.max(
            2,
            Number(
                operation.diameter ??
                5
            )
        );


    return (
        <g>

            {points.map(
                (
                    point,
                    index
                ) => (

                    <circle
                        key={
                            `${operationId}-${index}`
                        }
                        cx={
                            point.x
                        }
                        cy={
                            point.y
                        }
                        r={
                            selected
                                ? diameter / 2 + 2
                                : diameter / 2
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
                        strokeWidth="1"
                        className="cursor-pointer"
                        onClick={(event) => {

                            event.stopPropagation();

                            onSelect?.(
                                operationId
                            );
                        }}
                    />

                )
            )}

        </g>
    );
}