

import React from "react";
import {
    isFiniteNumber,
    getSelectedFill,
    getSelectedStroke
} from "./operationUtils";

export default function Shelf({
    operation,
    operationId,
    selected,
    onSelect
}) {

    const start =
        Number(operation.start);

    const end =
        Number(operation.end);

    const spacing =
        Number(
            operation.spacing ??
            32
        );

    const y1 =
        Number(
            operation.frontOffset ??
            operation.y ??
            0
        );

    const y2 =
        Number(
            operation.backOffset ??
            operation.y ??
            0
        );


    if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        !Number.isFinite(y1) ||
        spacing <= 0
    ) {
        return null;
    }


    const holes = [];

    const maxHoles = 1000;

    let x = start;

    let counter = 0;


    while (
        x <= end + 0.001 &&
        counter < maxHoles
    ) {

        holes.push({x:x, y:y1});
        holes.push({x:x, y:y2});

        x += spacing;

        counter++;
    }


    return (
        <g>

            {holes.map(
                (
                    hole,
                    index
                ) => (

                    <circle
                        key={
                            `${operationId}-${index}`
                        }
                        cx={hole.x}
                        cy={hole.y}
                        r={
                            selected
                                ? 3
                                : 2.2
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