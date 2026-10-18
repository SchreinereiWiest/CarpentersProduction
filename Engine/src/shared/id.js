export function createId() {
    return Date.now() + Math.random();
}

export function createStringId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

let fallbackCounter = 0;

const fallbackBytes = () => {
    fallbackCounter = (fallbackCounter + 1) >>> 0;
    const bytes = new Uint8Array(16);
    const timestamp = Date.now();
    for (let index = 0; index < bytes.length; index += 1) {
        const timeByte = Math.floor(timestamp / (2 ** ((index % 6) * 8))) & 0xff;
        const counterByte = (fallbackCounter >>> ((index % 4) * 8)) & 0xff;
        bytes[index] = Math.floor(Math.random() * 256) ^ timeByte ^ counterByte;
    }
    return bytes;
};

/** Runtime-neutrale UUID-Erzeugung mit Fallback für unsichere Browserkontexte. */
export const createUuid = () => {
    const runtimeCrypto = globalThis.crypto;
    if (typeof runtimeCrypto?.randomUUID === "function") return runtimeCrypto.randomUUID();

    const bytes = new Uint8Array(16);
    if (typeof runtimeCrypto?.getRandomValues === "function") runtimeCrypto.getRandomValues(bytes);
    else bytes.set(fallbackBytes());

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
