

import React from "react";
import {
    getPartWidth
} from "./operationUtils";


export default function Groove({
    operation,
    part,
    operationId,
    selected,
    onSelect
}) {

    const partWidth =
        getPartWidth(part);


    /*
     * ========================================================
     * RNT – Rückwandnut
     * ========================================================
     *
     * X / endX:
     *     Start und Ende der Nut in X-Richtung
     *
     * Y:
     *     Position der Nut auf der Platte
     *
     * Beispiel:
     *
     * X     = 3
     * endX  = DX - 3
     * Y     = 20
     *
     * Bei "oben offen":
     *
     * X     = -20
     * endX  = DX - 3
     */


    if (
        operation.type !== "RNT"
    ) {

        return null;

    }


    const x1 =
        Number(
            operation.x ?? 0
        );


    const y =
        Number(
            operation.y ?? 0
        );


    const x2 =
        Number(
            operation.endX ??
            partWidth
        );


    if (
        !Number.isFinite(x1) ||
        !Number.isFinite(y) ||
        !Number.isFinite(x2)
    ) {

        return null;

    }


    return (
        <line
            x1={x1}
            y1={y}
            x2={x2}
            y2={y}

            stroke={
                selected
                    ? "#f97316"
                    : "#22c55e"
            }

            strokeWidth={
                selected
                    ? 5
                    : 3
            }

            strokeLinecap="round"

            className="cursor-pointer"

            onClick={(event) => {

                event.stopPropagation();

                onSelect?.(
                    operationId
                );

            }}
        />
    );

}