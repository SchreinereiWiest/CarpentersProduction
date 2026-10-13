export function createId() {
    return Date.now() + Math.random();
}

export function createStringId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
