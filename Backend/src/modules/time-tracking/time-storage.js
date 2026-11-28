export function buildTimeWeekFileName(date) {
    return `weekData-${date}.json`;
}

export function buildTimeStorageObjectKey({ tenantId, userId, date }) {
    return `tenants/${tenantId}/time/${userId}/${buildTimeWeekFileName(date)}`;
}
