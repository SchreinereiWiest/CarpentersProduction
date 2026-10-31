const CHANNEL = "carpenters:haefele";

const requestId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

const waitForResponse = ({ id, acceptedTypes, timeoutMs, onProgress }) => new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
        window.removeEventListener("message", listener);
        reject(new Error("Die Häfele-Firefox-Erweiterung antwortet nicht. Bitte das Add-on unter about:debugging neu laden und anschließend diesen Einkauf-Tab neu laden oder das Add-on-Symbol einmal bei aktivem Einkauf-Tab anklicken."));
    }, timeoutMs);
    const listener = event => {
        if (event.source !== window || event.origin !== window.location.origin) return;
        if (event.data?.channel !== CHANNEL || event.data?.direction !== "to-application") return;
        const message = event.data.message || {};
        if (message.requestId !== id) return;
        if (message.type === "progress") {
            onProgress?.(message.message || "Häfele wird verarbeitet …");
            return;
        }
        if (!acceptedTypes.includes(message.type)) return;
        window.clearTimeout(timeout);
        window.removeEventListener("message", listener);
        if (message.type === "error") reject(new Error(message.error || "Häfele-Erweiterung meldete einen Fehler"));
        else resolve(message);
    };
    window.addEventListener("message", listener);
});

const send = message => window.postMessage({
    channel: CHANNEL,
    direction: "to-extension",
    message
}, window.location.origin);

export const fetchWithHaefeleFirefoxExtension = async (entries, onProgress) => {
    const pingId = requestId();
    const ready = waitForResponse({ id: pingId, acceptedTypes: ["ready", "error"], timeoutMs: 1500 });
    send({ type: "ping", requestId: pingId });
    await ready;

    const jobId = requestId();
    const result = waitForResponse({
        id: jobId,
        acceptedTypes: ["complete", "error"],
        timeoutMs: 8 * 60 * 60 * 1000,
        onProgress
    });
    send({
        type: "start",
        requestId: jobId,
        entries: entries.map(entry => ({
            entryId: entry.id,
            supplierId: entry.supplierId,
            sku: entry.sku,
            name: entry.name
        }))
    });
    const response = await result;
    return Array.isArray(response.results) ? response.results : [];
};
