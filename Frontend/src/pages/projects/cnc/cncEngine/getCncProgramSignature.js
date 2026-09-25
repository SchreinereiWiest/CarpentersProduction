

export const getCncProgramSignature = (part) => {

    if (!part) {
        return "";
    }

    const normalize = (value) => {

        if (Array.isArray(value)) {
            return value.map(normalize);
        }

        if (
            value !== null &&
            typeof value === "object"
        ) {
            return Object.keys(value)
                .sort()
                .reduce((result, key) => {
                    result[key] = normalize(value[key]);
                    return result;
                }, {});
        }

        // Zahlen und numerische Strings vereinheitlichen
        if (
            typeof value === "string" &&
            value.trim() !== "" &&
            Number.isFinite(Number(value))
        ) {
            return Number(value);
        }

        return value;
    };

    /*
     * Diese Werte sind bauteilspezifisch und dürfen
     * die Gruppierung nicht beeinflussen.
     */
    const ignoredFields = [
        "PID",
        "BPID",
        "Objektname",
        "Anzahl",
        "Notiz",
        "color",
        "parentPID"
    ];

    const programData = {};

    Object.keys(part)
        .filter(key => !ignoredFields.includes(key))
        .forEach(key => {

            /*
             * Die CNC-Daten bilden den eigentlichen
             * Kern des Programms.
             */
            if (key === "CNC") {
                programData.CNC =
                    normalize(part.CNC ?? {});
                return;
            }

            /*
             * Geometrie gehört ebenfalls zur Signatur,
             * da ein CNC-Programm für 600 mm nicht automatisch
             * dasselbe Programm wie für 800 mm sein muss.
             */
            if (
                key === "L" ||
                key === "B" ||
                key === "T"
            ) {
                programData[key] =
                    normalize(part[key]);

                return;
            }

            /*
             * Material und Kanten werden ebenfalls berücksichtigt.
             * Falls wir später feststellen, dass sie für die
             * Programmgleichheit keine Rolle spielen, können wir
             * sie hier problemlos entfernen.
             */
            if (
                key === "MID" ||
                key === "Maserung" ||
                key === "ELID" ||
                key === "ERID" ||
                key === "ETID" ||
                key === "EBID"
            ) {
                programData[key] =
                    normalize(part[key]);
            }

        });

    return JSON.stringify(
        normalize(programData)
    );
};