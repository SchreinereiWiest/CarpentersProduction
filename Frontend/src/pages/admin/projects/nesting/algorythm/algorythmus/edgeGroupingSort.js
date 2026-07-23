
function hasEdge(edge) {
    return edge !== "" && edge !== "Standardmaterial" ? edge : "";
}

export default function edgeGroupingSort(plates, setting, sheets) {

    let EdgeSort = plates;
    let Sort = plates;
    //a > B swap
    EdgeSort.sort((a, b) => {

        a.rotate=null;

        a.edgeKey = [
            hasEdge(a.ELID),
            hasEdge(a.ERID),
            hasEdge(a.ETID),
            hasEdge(a.EBID)
        ].join("|");

        b.edgeKey = [
            hasEdge(b.ELID),
            hasEdge(b.ERID),
            hasEdge(b.ETID),
            hasEdge(b.EBID)
        ].join("|");

        if (a.edgeKey != b.edgeKey) {

            return (a.edgeKey).localeCompare(b.edgeKey);

        } else {

            if (a.L >= a.B) {
            a.edgeDirection = hasEdge(a.ELID) || hasEdge(a.ERID) ? "length" : "width";
            } else {
                a.edgeDirection = hasEdge(a.ETID) || hasEdge(a.EBID) ? "length" : "width";
            }

            if (b.L >= b.B) {
                b.edgeDirection = hasEdge(b.ELID) || hasEdge(b.ERID) ? "length" : "width";
            } else {
                b.edgeDirection = hasEdge(b.ETID) || hasEdge(b.EBID) ? "length" : "width";
            }

            if (a.edgeDirection != b.edgeDirection) {
                return (a.edgeDirection).localeCompare(b.edgeDirection);
            } else {

                return a.B - b.B;

            }

        }


    });

    // console.log(EdgeSort);
    return EdgeSort;

}