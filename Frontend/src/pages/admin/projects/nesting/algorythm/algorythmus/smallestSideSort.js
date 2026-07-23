

export default function smallestSideSort(plates) {

    return [...plates].sort((a, b) => {

        const smallA = Math.min(a.L, a.B);
        const smallB = Math.min(b.L, b.B);

        a.rotate = null;
        
        if (smallA !== smallB)
            return smallA - smallB;

        return (b.L * b.B) - (a.L * a.B);

    });

}