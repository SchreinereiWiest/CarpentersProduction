
import { hasEdge, addEdgeKey } from "../helper/helpers";

export function sortPlates(plates) {

    return plates
        .map(addEdgeKey)
        .sort((a, b) => {

            if (a.edgeKey != b.edgeKey) {

            return (a.edgeKey).localeCompare(b.edgeKey);

        } else {
            return a.B - b.B;
           
        }
           
        });
}
