


export default function edgeGroupingSort(plates) {

    return [...plates].sort((a, b) => {

        // zuerst Material

        if ((a.MID || "") !== (b.MID || "")) {

            return (a.MID || "").localeCompare(b.MID || "");

        }

        // danach Kantenbild

        if ((a.Kante || "") !== (b.Kante || "")) {

            return (a.Kante || "").localeCompare(b.Kante || "");

        }

        // danach längste Seite

        const longA = Math.max(a.L, a.B);
        const longB = Math.max(b.L, b.B);

        if (longA !== longB)
            return longB - longA;

        return (b.L * b.B) - (a.L * a.B);

    });

}