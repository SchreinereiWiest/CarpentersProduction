

export default function areaSort(plates) {

    return [...plates].sort((a, b) => {

        a.rotate=null;

        const areaA = a.L * a.B;
        const areaB = b.L * b.B;

        return areaB - areaA;

    });

}