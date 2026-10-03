

import React from "react";
import {
    getPartWidth
} from "./operationUtils";

export default function Milling({
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
     * XG0
     * ========================================================
     */

    if (
        operation.type ===
        "XG0"
    ) {

        const x =
            Number(
                operation.x ??
                operation.startX ??
                0
            );

        const y =
            Number(
                operation.y ??
                operation.startY ??
                0
            );


        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y)
        ) {
            return null;
        }


        return (
            <circle
                cx={x}
                cy={y}
                r={
                    selected
                        ? 5
                        : 4
                }
                fill={
                    selected
                        ? "#f97316"
                        : "#7c3aed"
                }
                stroke="#ddd6fe"
                strokeWidth="1"
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


    /*
     * ========================================================
     * XL2P
     * ========================================================
     */

    if (
        operation.type ===
        "XL2P"
    ) {

        const x1 =
            Number(
                operation.startX ??
                operation.x ??
                0
            );

        const y1 =
            Number(
                operation.startY ??
                operation.y ??
                0
            );

        const x2 =
            Number(
                operation.endX ??
                partWidth
            );

        const y2 =
            Number(
                operation.endY ??
                y1
            );


        if (
            !Number.isFinite(x1) ||
            !Number.isFinite(y1) ||
            !Number.isFinite(x2) ||
            !Number.isFinite(y2)
        ) {
            return null;
        }


        return (
            <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={
                    selected
                        ? "#f97316"
                        : "#a78bfa"
                }
                strokeWidth={
                    selected
                        ? 4
                        : 3
                }
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


    return null;
}