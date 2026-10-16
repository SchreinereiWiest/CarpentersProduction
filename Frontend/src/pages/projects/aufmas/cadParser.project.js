export function toFloat(value) {
    if (value === undefined || value === null) return null;
    return Number.parseFloat(value.toString().replace(",", "."));
}

export function parseCadJson(data) {
    const groups = {};

    data.forEach(item => {
        const parentId = item.PID.substring(0, 3);
        const childId = item.PID.substring(3, 6);
        const parsedItem = {
            ...item,
            L: toFloat(item.L),
            B: toFloat(item.B),
            T: toFloat(item.T),
            X: toFloat(item.X),
            Y: toFloat(item.Y),
            Z: toFloat(item.Z),
            RX: toFloat(item.RX),
            RY: toFloat(item.RY),
            RZ: toFloat(item.RZ),
            OX: toFloat(item.OX),
            OY: toFloat(item.OY),
            OZ: toFloat(item.OZ)
        };

        if (!groups[parentId]) groups[parentId] = null;

        if (childId === "000") {
            groups[parentId] = { ...parsedItem, Children: [] };
        } else {
            if (!groups[parentId]) {
                groups[parentId] = { PID: `${parentId}000`, Children: [] };
            }
            groups[parentId].Children.push(parsedItem);
        }
    });

    return Object.values(groups);
}
