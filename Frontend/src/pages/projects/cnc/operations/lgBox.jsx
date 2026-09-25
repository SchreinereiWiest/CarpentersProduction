

import { Circle } from "./elements/circle";

export default function LgBox({
    operation,
    height,
    width,
    operationId,
    selectedOperationId,
    onSelectOperation
}) {

    if (
        operation.type !== "LgBox"
    ) {
        return null;
    }


    const selected =
        operationId ===
        selectedOperationId;


    const x =
        Number(operation.x);

    const yOffset =
        Number(
            operation.yOffset
        ) || 0;


    const diameter =
        Number(
            operation.diameter
        ) || 5;


    const radius =
        diameter / 2;


    /*
     * Feste Positionen der Legrabox-
     * Lochreihe.
     *
     * 37
     * 69
     * 192
     * 224
     * 256
     */

    const holePositions = [
        37,
        37 + 32,
        192,
        192 + 32,
        192 + 32 * 2
    ];


    if (
        !Number.isFinite(x)
    ) {
        return null;
    }


    return (
        <g
            onClick={(event) => {

                event.stopPropagation();

                onSelectOperation?.(
                    operation
                );

            }}
            style={{
                cursor: "pointer"
            }}
        >

            {holePositions.map(
                (
                    holeY,
                    index
                ) => {

                    const y =
                        holeY +
                        yOffset;


                    /*
                     * Optional:
                     * außerhalb des Bauteils
                     * nichts darstellen
                     */

                    if (
                        Number.isFinite(height) &&
                        (
                            y < 0 ||
                            y > Number(height)
                        )
                    ) {
                        return null;
                    }


                    return (
                        <Circle
                            key={
                                `${operationId}-${index}`
                            }
                            position={{
                                x,
                                y
                            }}
                            radius={
                                radius
                            }
                            selected={
                                selected
                            }
                        />
                    );
                }
            )}

        </g>
    );
}