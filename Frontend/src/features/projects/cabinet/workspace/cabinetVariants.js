import { cloneCabinetWithFreshIds } from "@Engine/cabinet/cabinet.js";
import { createId } from "@Engine/shared/id.js";

const countOf = cabinet => Math.max(1, Math.floor(Number(cabinet?.quantity) || 1));
const baseNameOf = cabinet => String(cabinet?.linkedCabinetBaseName ?? cabinet?.name ?? "Korpus")
    .replace(/\s*[·-]\s*Variante\s+\d+$/iu, "");

const withGroupLinks = (members, groupId, baseName) => {
    const ids = members.map(cabinet => cabinet.id);
    return members.map((cabinet, index) => ({
        ...cabinet,
        quantity: 1,
        linkedCabinetGroupId: groupId,
        linkedCabinetBaseName: baseName,
        linkedCabinetIds: ids.filter(id => id !== cabinet.id),
        variantIndex: index + 1
    }));
};

export const expandCabinetVariants = (savedCabinets = []) => {
    const expanded = [];
    savedCabinets.forEach(cabinet => {
        const quantity = countOf(cabinet);
        const groupId = cabinet.linkedCabinetGroupId ?? (quantity > 1 ? createId() : null);
        const first = { ...cabinet, quantity: 1, ...(groupId ? { linkedCabinetGroupId: groupId } : {}) };
        expanded.push(first);
        for (let index = 1; index < quantity; index += 1) {
            const clone = cloneCabinetWithFreshIds(cabinet);
            expanded.push({
                ...clone,
                id: cabinet.variantInstanceIds?.[index] ?? clone.id,
                name: `${baseNameOf(cabinet)} · Variante ${index + 1}`,
                quantity: 1,
                linkedCabinetGroupId: groupId
            });
        }
    });

    const groups = new Map();
    expanded.forEach(cabinet => {
        if (!cabinet.linkedCabinetGroupId) return;
        const members = groups.get(cabinet.linkedCabinetGroupId) ?? [];
        members.push(cabinet);
        groups.set(cabinet.linkedCabinetGroupId, members);
    });
    const linkedById = new Map();
    groups.forEach((members, groupId) => {
        withGroupLinks(members, groupId, baseNameOf(members[0])).forEach(cabinet => linkedById.set(cabinet.id, cabinet));
    });
    return expanded.map(cabinet => linkedById.get(cabinet.id) ?? cabinet);
};

export const getCabinetVariantCount = (cabinet, cabinets = []) => {
    if (!cabinet?.linkedCabinetGroupId) return countOf(cabinet);
    return Math.max(1, cabinets.filter(item => item.linkedCabinetGroupId === cabinet.linkedCabinetGroupId).length);
};

export const resizeCabinetVariantGroup = (cabinets, cabinetId, desiredCount) => {
    const source = cabinets.find(cabinet => cabinet.id === cabinetId);
    if (!source) return { cabinets, added: [], removedIds: [] };
    const targetCount = Math.max(1, Math.floor(Number(desiredCount) || 1));
    const groupId = source.linkedCabinetGroupId ?? createId();
    const currentMembers = source.linkedCabinetGroupId
        ? cabinets.filter(cabinet => cabinet.linkedCabinetGroupId === source.linkedCabinetGroupId)
        : [source];
    const ordered = [...currentMembers].sort((left, right) => Number(left.variantIndex ?? 0) - Number(right.variantIndex ?? 0));
    const retained = ordered.slice(0, targetCount);
    const added = [];
    for (let index = retained.length; index < targetCount; index += 1) {
        added.push({
            ...cloneCabinetWithFreshIds(source),
            name: `${baseNameOf(source)} · Variante ${index + 1}`,
            quantity: 1,
            linkedCabinetGroupId: groupId
        });
    }
    const nextMembers = targetCount === 1
        ? [...retained, ...added].map(cabinet => {
            const standalone = { ...cabinet };
            delete standalone.linkedCabinetGroupId;
            delete standalone.linkedCabinetBaseName;
            delete standalone.linkedCabinetIds;
            delete standalone.variantInstanceIds;
            delete standalone.variantIndex;
            return { ...standalone, quantity: 1 };
        })
        : withGroupLinks([...retained, ...added], groupId, baseNameOf(source));
    const nextById = new Map(nextMembers.map(cabinet => [cabinet.id, cabinet]));
    const removedIds = ordered.slice(targetCount).map(cabinet => cabinet.id);
    const memberIds = new Set(ordered.map(cabinet => cabinet.id));
    const nextCabinets = cabinets
        .filter(cabinet => !removedIds.includes(cabinet.id))
        .map(cabinet => nextById.get(cabinet.id) ?? cabinet);
    nextMembers.forEach(cabinet => {
        if (!memberIds.has(cabinet.id)) nextCabinets.push(cabinet);
    });
    return { cabinets: nextCabinets, added: nextMembers.filter(cabinet => added.some(item => item.id === cabinet.id)), removedIds };
};

const normalizedValue = (value, root = false) => {
    if (Array.isArray(value)) return value.map(item => normalizedValue(item));
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.keys(value).sort().flatMap(key => {
        if (["id", "parentId", "linkedCabinetGroupId", "linkedCabinetBaseName", "linkedCabinetIds", "variantInstanceIds", "variantIndex", "quantity"].includes(key)) return [];
        if (root && key === "name") return [];
        return [[key, normalizedValue(value[key])]];
    }));
};

const comparisonKey = cabinet => JSON.stringify(normalizedValue({
    ...cabinet,
    name: String(cabinet?.name ?? "").replace(/\s*[·-]\s*Variante\s+\d+$/iu, "")
}));

export const compactCabinetVariantsForSave = (cabinets = []) => {
    const groups = new Map();
    cabinets.forEach(cabinet => {
        const key = cabinet.linkedCabinetGroupId ? `group:${cabinet.linkedCabinetGroupId}` : `cabinet:${cabinet.id}`;
        const members = groups.get(key) ?? [];
        members.push(cabinet);
        groups.set(key, members);
    });

    return [...groups.values()].flatMap(members => {
        if (members.length === 1 && !members[0].linkedCabinetGroupId) {
            return [{ ...members[0], quantity: countOf(members[0]) }];
        }
        const buckets = new Map();
        members.forEach(cabinet => {
            const key = comparisonKey(cabinet);
            const bucket = buckets.get(key) ?? [];
            bucket.push(cabinet);
            buckets.set(key, bucket);
        });
        const records = [...buckets.values()].map(bucket => ({
            ...bucket[0],
            quantity: bucket.length,
            variantInstanceIds: bucket.map(cabinet => cabinet.id),
            linkedCabinetGroupId: members[0].linkedCabinetGroupId,
            linkedCabinetBaseName: baseNameOf(members[0])
        }));
        const ids = records.map(cabinet => cabinet.id);
        return records.map((cabinet, index) => ({
            ...cabinet,
            name: records.length === 1 ? baseNameOf(members[0]) : (cabinet.name || `${baseNameOf(members[0])} · Variante ${index + 1}`),
            linkedCabinetIds: ids.filter(id => id !== cabinet.id),
            variantIndex: index + 1
        }));
    });
};
