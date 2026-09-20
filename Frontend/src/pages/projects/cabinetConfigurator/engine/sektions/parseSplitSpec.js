export const parseSplitSpec = (spec) => {

    if (
        !spec ||
        typeof spec !== "string"
    ) {
        return [];
    }


    return spec
        .split(":")
        .map(value => value.trim())
        .filter(Boolean)

        .map(value => {

            /*
             * Feste Größe
             *
             * z.B. 145mm
             */

            if (/mm$/i.test(value)) {

                const size =
                    Number(
                        value
                            .replace(/mm$/i, "")
                            .trim()
                            .replace(",", ".")
                    );


                if (
                    !Number.isFinite(size) ||
                    size <= 0
                ) {
                    return null;
                }


                return {
                    type: "fixed",
                    value: size
                };
            }


            /*
             * Verhältnis
             *
             * z.B. 1 oder 2
             */

            const ratio =
                Number(
                    value
                        .replace(",", ".")
                );


            if (
                !Number.isFinite(ratio) ||
                ratio <= 0
            ) {
                return null;
            }


            return {
                type: "ratio",
                value: ratio
            };

        })

        .filter(Boolean);
};