
export function area(width, height) {

    return width * height;

}

export function clone(obj) {

    return JSON.parse(JSON.stringify(obj));

}

export function randomBool(chance = 0.5) {

    return Math.random() < chance;

}

export function canFit(rect, width, height) {

    return (width <= rect.width && height <= rect.height);

}


export function hasEdge(edge) {
    return edge !== "" && edge !== "Standardmaterial" ? edge : "";
}

export function addEdgeKey(plate) {
    plate.edgeKey = [
            hasEdge(plate.ELID),
            hasEdge(plate.ERID),
            hasEdge(plate.ETID),
            hasEdge(plate.EBID)
        ].join("|");

    return plate;
}
