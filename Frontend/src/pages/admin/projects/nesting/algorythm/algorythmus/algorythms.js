import areaSort from "./areaSort";
import longestSideSort from "./longestSideSort";
import smallestSideSort from "./smallestSideSort";
import edgeGroupingSort from "./edgeGroupingSort";
import randomSort from "./randomSort";

export const sortingAlgorithms = [

    {
        name: "Area",
        sort: areaSort
    },

    {
        name: "Longest Side",
        sort: longestSideSort
    },

    {
        name: "Smallest Side",
        sort: smallestSideSort
    },

    {
        name: "Edge Grouping",
        sort: edgeGroupingSort
    },

    {
        name: "Random",
        sort: randomSort
    }

];