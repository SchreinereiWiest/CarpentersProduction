(() => {
    "use strict";

    if (globalThis.__carpentersHaefeleBridgeLoaded) return;
    globalThis.__carpentersHaefeleBridgeLoaded = true;
    const CHANNEL = "carpenters:haefele";

    const sendToApplication = message => window.postMessage({
        channel: CHANNEL,
        direction: "to-application",
        message
    }, window.location.origin);

    window.addEventListener("message", event => {
        if (event.source !== window || event.origin !== window.location.origin) return;
        if (event.data?.channel !== CHANNEL || event.data?.direction !== "to-extension") return;
        const message = event.data.message;
        if (!message || typeof message !== "object") return;
        if (message.type === "ping") {
            sendToApplication({ type: "ready", requestId: message.requestId });
            return;
        }
        if (message.type !== "start") return;
        browser.runtime.sendMessage({
            type: "START_JOB",
            requestId: message.requestId,
            entries: Array.isArray(message.entries) ? message.entries : []
        }).catch(error => sendToApplication({
            type: "error",
            requestId: message.requestId,
            error: error.message || "Erweiterung konnte nicht gestartet werden"
        }));
    });

    browser.runtime.onMessage.addListener(message => {
        if (message?.type !== "APP_EVENT") return;
        sendToApplication(message.payload || {});
    });
})();
