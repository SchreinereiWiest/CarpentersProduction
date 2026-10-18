


/*
========================================================
GRID
========================================================
*/

export function Grid({ viewBox }) {

    const gridSize = 50;

    const startX =
        Math.floor(
            viewBox.x / gridSize
        ) *
        gridSize;

    const startY =
        Math.floor(
            viewBox.y / gridSize
        ) *
        gridSize;


    const endX =
        Math.ceil(
            (
                viewBox.x +
                viewBox.width
            ) /
            gridSize
        ) *
        gridSize;


    const endY =
        Math.ceil(
            (
                viewBox.y +
                viewBox.height
            ) /
            gridSize
        ) *
        gridSize;


    const verticalLines = [];

    for (
        let x = startX;
        x <= endX;
        x += gridSize
    ) {

        verticalLines.push(
            <line
                key={`x-${x}`}
                x1={x}
                y1={startY}
                x2={x}
                y2={endY}
                stroke="#2d2d2d"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
            />
        );
    }


    const horizontalLines = [];

    for (
        let y = startY;
        y <= endY;
        y += gridSize
    ) {

        horizontalLines.push(
            <line
                key={`y-${y}`}
                x1={startX}
                y1={y}
                x2={endX}
                y2={y}
                stroke="#2d2d2d"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
            />
        );
    }


    return (
        <g
            pointerEvents="none"
        >
            {verticalLines}
            {horizontalLines}
        </g>
    );
}