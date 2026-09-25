import { Circle } from "./elements/circle";
import { cncToSvg } from "../cncEngine/cncCoordinates";

export default function Shelf({
    operation,
    height,
    width,
    operationId,
    selectedOperationId,
    onSelectOperation
}) {

    const selected =
        operationId === selectedOperationId;

    if (
        operation.type !== "shelf"
    ) {
        return null;
    }

    const diameter =
        Number(operation.diameter) || 5;

    const radius =
        diameter / 2;

    const top =
        Number(operation.top) || 0;

    const bottom =
        Number(operation.bottom) || 0;

    const spacing =
        Number(operation.spacing) || 37;

    /*
     * CNC X = B / Tiefe
     */
    const cncX =
        Number(operation.frontOffset) || 0;

    const cncX2 =
        Number(width - operation.backOffset) || 0;

    const end =
        Number(height) - bottom;

    if (
        end < top ||
        spacing <= 0
    ) {
        return null;
    }

    const circles = [];

    for (
        let cncY = top;
        cncY <= end;
        cncY += spacing
    ) {

        const position =
            cncToSvg(
                cncX,
                cncY,
                {
                    L: height,
                    B: width
                }
            );

        const position2 =
            cncToSvg(
                cncX2,
                cncY,
                {
                    L: height,
                    B: width
                }
            );

        if (!position) {
            continue;
        }

        circles.push(
            <g
                key={`${operationId}-${cncY}`}
                onClick={(event) => {

                    event.stopPropagation();

                    onSelectOperation?.(
                        operation
                    );
                }}
            >

                <Circle
                    position={position}
                    radius={radius}
                    selected={selected}
                />

                <Circle
                    position={position2}
                    radius={radius}
                    selected={selected}
                />

            </g>
        );
    }

    return (
        <g>
            {circles}
        </g>
    );
}