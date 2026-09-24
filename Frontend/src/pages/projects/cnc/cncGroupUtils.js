

const ignoredFields = new Set([
    "PID",
    "BPID",
    "Objektname",
    "Anzahl",
    "Notiz",
    "color"
]);

export function createId() {
        return Date.now() + Math.random();
    }

const sortObject = (value) => {

    if (Array.isArray(value)) {
        return value.map(sortObject);
    }

    if (
        value &&
        typeof value === "object"
    ) {
        return Object.keys(value)
            .sort()
            .reduce((result, key) => {

                if (!ignoredFields.has(key)) {
                    result[key] = sortObject(value[key]);
                }

                return result;

            }, {});
    }

    return value;
};
