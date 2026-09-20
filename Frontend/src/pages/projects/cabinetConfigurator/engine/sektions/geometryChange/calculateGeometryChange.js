export const calculateGeometryChange = (
    element,
    property,
    value
) => {
    const x = Number(element.x);
    const y = Number(element.y);
    const width = Number(element.width);
    const height = Number(element.height);

    if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        !Number.isFinite(value) ||
        value < 0
    ) {
        return null;
    }

    switch (property) {

        // X ändern
        // rechte Kante bleibt gleich
        case "x": {
            const right = x + width;
            const newWidth = right - value;

            if (newWidth <= 0) {
                return null;
            }

            return {
                x: value,
                width: newWidth
            };
        }


        // Breite ändern
        // rechte Kante bleibt gleich
        case "width": {
            const right = x + width;
            const newX = right - value;

            if (value <= 0 || newX < 0) {
                return null;
            }

            return {
                x: newX,
                width: value
            };
        }


        // Y ändern
        // untere Kante bleibt gleich
        case "y": {
            const bottom = y + height;
            const newHeight = bottom - value;

            if (newHeight <= 0) {
                return null;
            }

            return {
                y: value,
                height: newHeight
            };
        }


        // Höhe ändern
        // untere Kante bleibt gleich
        case "height": {
            const bottom = y + height;
            const newY = bottom - value;

            if (value <= 0 || newY < 0) {
                return null;
            }

            return {
                y: newY,
                height: value
            };
        }


        default:
            return null;
    }
};