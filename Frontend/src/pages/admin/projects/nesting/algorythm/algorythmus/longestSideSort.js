

export default function longestSideSort(plates) {

    return [...plates].sort((a, b) => {

        a.rotate=null;

        const longA = Math.max(a.L, a.B);
        const longB = Math.max(b.L, b.B);

        if (longA !== longB)
            return longB - longA;

        return (b.L * b.B) - (a.L * a.B);

    });

}