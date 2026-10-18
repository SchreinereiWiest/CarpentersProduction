const MISSING = Symbol("missing");
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const comparable = value => value === MISSING ? "__MISSING__" : value;
const equal = (left, right) => JSON.stringify(comparable(left)) === JSON.stringify(comparable(right));
const stableIdArray = value => Array.isArray(value)
    && value.every(item => isObject(item) && item.id != null);

const displayValue = value => value === MISSING ? undefined : value;

export function createThreeWayMerge(base, local, remote, choices = {}) {
    const conflicts = [];
    const automatic = [];

    const mergeValue = (baseValue, localValue, remoteValue, path) => {
        if (equal(localValue, remoteValue)) return localValue;
        if (equal(localValue, baseValue)) {
            automatic.push({ path, source: "server" });
            return remoteValue;
        }
        if (equal(remoteValue, baseValue)) {
            automatic.push({ path, source: "local" });
            return localValue;
        }

        if (isObject(localValue) && isObject(remoteValue)) {
            const result = {};
            const keys = new Set([
                ...Object.keys(isObject(baseValue) ? baseValue : {}),
                ...Object.keys(localValue),
                ...Object.keys(remoteValue)
            ]);
            keys.forEach(key => {
                const child = mergeValue(
                    isObject(baseValue) && key in baseValue ? baseValue[key] : MISSING,
                    key in localValue ? localValue[key] : MISSING,
                    key in remoteValue ? remoteValue[key] : MISSING,
                    path ? `${path}.${key}` : key
                );
                if (child !== MISSING) result[key] = child;
            });
            return result;
        }

        if (stableIdArray(localValue) && stableIdArray(remoteValue)
            && (baseValue === MISSING || stableIdArray(baseValue))) {
            const baseMap = new Map((baseValue === MISSING ? [] : baseValue).map(item => [String(item.id), item]));
            const localMap = new Map(localValue.map(item => [String(item.id), item]));
            const remoteMap = new Map(remoteValue.map(item => [String(item.id), item]));
            const ids = [...new Set([...baseMap.keys(), ...localMap.keys(), ...remoteMap.keys()])];
            return ids.map(id => mergeValue(
                baseMap.get(id) ?? MISSING,
                localMap.get(id) ?? MISSING,
                remoteMap.get(id) ?? MISSING,
                `${path}[id=${id}]`
            )).filter(value => value !== MISSING);
        }

        const conflictPath = path || "Dokument";
        conflicts.push({
            path: conflictPath,
            base: displayValue(baseValue),
            local: displayValue(localValue),
            remote: displayValue(remoteValue)
        });
        return choices[conflictPath] === "server" ? remoteValue : localValue;
    };

    const merged = mergeValue(base ?? MISSING, local ?? MISSING, remote ?? MISSING, "");
    return { merged: merged === MISSING ? null : merged, conflicts, automatic };
}

export const formatMergeValue = value => {
    if (value === undefined) return "Nicht vorhanden";
    if (value === null) return "null";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
};
