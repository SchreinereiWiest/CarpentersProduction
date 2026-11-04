

import {
    getPartWidth
} from "./operationUtils.js";

export default function Milling({
    operation,
    part,
    operationId,
    selected,
    onSelect
}) {

    const partWidth =
        getPartWidth(part);

    if (operation.type === "ARC") {
        const x1 = Number(operation.startX);
        const y1 = Number(operation.startY);
        const x2 = Number(operation.endX);
        const y2 = Number(operation.endY);
        const centerX = Number(operation.centerX);
        const centerY = Number(operation.centerY);
        const radius = Number(operation.radius) || Math.hypot(x1 - centerX, y1 - centerY);
        if ([x1, y1, x2, y2, centerX, centerY, radius].some(value => !Number.isFinite(value)) || radius <= 0) {
            return null;
        }
        const startAngle = Math.atan2(y1 - centerY, x1 - centerX);
        const endAngle = Math.atan2(y2 - centerY, x2 - centerX);
        const clockwise = operation.direction !== "counterclockwise";
        let sweep = endAngle - startAngle;
        if (clockwise) while (sweep <= 0) sweep += Math.PI * 2;
        else while (sweep >= 0) sweep -= Math.PI * 2;
        const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
        const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} ${clockwise ? 1 : 0} ${x2} ${y2}`;

        return (
            <path
                d={path}
                fill="none"
                stroke={selected ? "#f97316" : "#c084fc"}
                strokeWidth={selected ? 4 : 3}
                className="cursor-pointer"
                onClick={event => {
                    event.stopPropagation();
                    onSelect?.(operationId);
                }}
            />
        );
    }


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
