

function getRandomHexColor() {
    return (
        "#" +
        Math.floor(
            Math.random() * 16777215
        )
            .toString(16)
            .padStart(6, "0")
    );
}

export function processContent(content) {

        const duplicates = new Map();

        content.forEach(item => {

            const color = getRandomHexColor();

            // Nur Bauteile mit BPID behalten
            const filteredChildren = (item.Children || [])
                .filter(child => child.BPID !== "");

            // ===== Children innerhalb eines Objekts zusammenfassen =====

            const mergedChildrenMap = new Map();

            filteredChildren.forEach(child => {

                const childKey = JSON.stringify({
                    L: child.L,
                    B: child.B,
                    T: child.T,
                    MID: child.MID,
                    Kante: child.Kante,
                    Maserung: child.Maserung
                });

                if (!mergedChildrenMap.has(childKey)) {

                    mergedChildrenMap.set(childKey, {
                        ...child,
                        Anzahl: Number(child.Anzahl),
                        color: color
                    });

                } else {

                    mergedChildrenMap.get(childKey).Anzahl += Number(child.Anzahl);

                }

            });

            const mergedChildren = [...mergedChildrenMap.values()];

            // ===== Vergleichsschlüssel der Oberobjekte =====

            const normalizedChildren = mergedChildren
                .map(child => ({
                    L: child.L,
                    B: child.B,
                    T: child.T,
                    MID: child.MID,
                }))
                .sort((a, b) => {
                    if (a.L !== b.L) return a.L - b.L;
                    if (a.B !== b.B) return a.B - b.B;
                    if (a.T !== b.T) return a.T - b.T;
                    return (a.MID || "").localeCompare(b.MID || "");
                });

            const key = JSON.stringify({
                L: item.L,
                B: item.B,
                T: item.T,
                children: normalizedChildren
            });

            // ===== Oberobjekte zusammenfassen =====

            if (!duplicates.has(key)) {

                duplicates.set(key, {
                    ...item,
                    Anzahl: Number(item.Anzahl),
                    Children: mergedChildren
                });

            } else {

                duplicates.get(key).Anzahl += Number(item.Anzahl);

            }

        });

        return [...duplicates.values()].map(item => ({
        ...item,
        Children: item.Children.map(child => ({
            ...child,
            Anzahl: Number(child.Anzahl) * Number(item.Anzahl)
        }))
    }));
    };
