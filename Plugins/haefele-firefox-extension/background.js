"use strict";

const HAEFELE_HOME = "https://www.haefele.de/de/";
const JOB_KEY = "carpentersHaefeleJob";
const MAPPINGS_KEY = "carpentersHaefeleMappings";
const SETTINGS_KEY = "carpentersHaefeleSettings";
const ACTIVE_STATUSES = new Set(["running", "paused", "review"]);

const readStored = async () => browser.storage.local.get([JOB_KEY, MAPPINGS_KEY, SETTINGS_KEY]);
const readJob = async () => (await browser.storage.local.get(JOB_KEY))[JOB_KEY] || null;
const readMappings = async () => (await browser.storage.local.get(MAPPINGS_KEY))[MAPPINGS_KEY] || {};
const readSettings = async () => ({
    reviewBeforeSubmit: true,
    ...((await browser.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY] || {})
});

const publicState = async () => {
    const stored = await readStored();
    return {
        job: stored[JOB_KEY] || null,
        mappings: stored[MAPPINGS_KEY] || {},
        settings: { reviewBeforeSubmit: true, ...(stored[SETTINGS_KEY] || {}) }
    };
};

const notifySidebar = async () => {
    try { await browser.runtime.sendMessage({ type: "STATE_UPDATED", state: await publicState() }); } catch {}
};

const writeJob = async job => {
    job.updatedAt = new Date().toISOString();
    await browser.storage.local.set({ [JOB_KEY]: job });
    await notifySidebar();
    return job;
};

const writeMappings = async mappings => {
    await browser.storage.local.set({ [MAPPINGS_KEY]: mappings });
    await notifySidebar();
};

const sendAppEvent = async (job, payload) => {
    try {
        await browser.tabs.sendMessage(job.appTabId, {
            type: "APP_EVENT",
            payload: { requestId: job.requestId, ...payload }
        });
    } catch {
        // Der Anwendungstab kann während eines laufenden Jobs geschlossen sein.
    }
};

const setProgress = async (job, message) => {
    job.message = message;
    await writeJob(job);
    await sendAppEvent(job, { type: "progress", message });
};

const normalizeSku = value => String(value || "").replace(/[^\p{L}\p{N}]/gu, "").toLocaleLowerCase("de");
const cleanText = (value, maximum) => String(value ?? "").trim().slice(0, maximum);

const safeHaefeleUrl = value => {
    if (!value) return "";
    try {
        const url = new URL(String(value));
        const official = url.hostname === "haefele.de" || url.hostname.endsWith(".haefele.de");
        return url.protocol === "https:" && official ? url.toString() : "";
    } catch { return ""; }
};

const sanitizeProductData = value => {
    const price = value?.netPrice === null || value?.netPrice === undefined || value?.netPrice === ""
        ? null
        : Number(value.netPrice);
    return {
        name: cleanText(value?.name, 500),
        description: cleanText(value?.description, 20000),
        unit: cleanText(value?.unit || "Stk.", 50) || "Stk.",
        imageUrl: cleanText(value?.imageUrl, 2048),
        netPrice: Number.isFinite(price) && price >= 0 ? price : null
    };
};

const resultIndex = (job, entryId) => job.results.findIndex(result => result.entryId === entryId);
const upsertResult = (job, result) => {
    const index = resultIndex(job, result.entryId);
    if (index >= 0) job.results[index] = result;
    else job.results.push(result);
};

const pendingIndex = job => {
    const completed = new Set(job.results.map(result => result.entryId));
    return job.entries.findIndex(entry => !completed.has(entry.entryId));
};

const orderedResults = job => {
    const byId = new Map(job.results.map(result => [result.entryId, result]));
    return job.entries.map(entry => byId.get(entry.entryId)).filter(Boolean);
};

const finishJob = async job => {
    job.status = "submitted";
    job.finishedAt = new Date().toISOString();
    job.message = `${job.results.length} Ergebnisse wurden an CarpentersProduction übertragen.`;
    job.results = orderedResults(job);
    await writeJob(job);
    await sendAppEvent(job, { type: "complete", results: job.results });
    try { await browser.tabs.update(job.appTabId, { active: true }); } catch {}
};

const failJob = async (job, error, status = "error") => {
    job.status = status;
    job.message = String(error || "Unbekannter Erweiterungsfehler");
    job.finishedAt = new Date().toISOString();
    await writeJob(job);
    await sendAppEvent(job, { type: "error", error: job.message });
};

const currentEntry = job => job.entries[job.index] || null;

const processCurrentPage = async (job, tabId) => {
    if (!job || job.status !== "running" || job.haefeleTabId !== tabId) return;
    const entry = currentEntry(job);
    if (!entry) return;
    const mappings = await readMappings();
    const mapping = mappings[entry.entryId] || null;
    try {
        await browser.tabs.sendMessage(tabId, {
            type: "PROCESS_ITEM",
            entry: {
                ...entry,
                lookupSku: mapping?.targetSku || entry.sku
            },
            phase: job.phase
        });
    } catch {
        // Nach einer Navigation meldet PAGE_READY die Seite erneut an.
    }
};

const completeExtraction = async job => {
    if (job.reviewBeforeSubmit) {
        job.status = "review";
        await setProgress(job, `Häfele: ${job.results.length} Ergebnisse warten in der Sidebar auf Prüfung.`);
    } else {
        await finishJob(job);
    }
};

const openCurrentItem = async job => {
    if (job.status === "paused") {
        await writeJob(job);
        return;
    }
    job.index = pendingIndex(job);
    if (job.index < 0) {
        await completeExtraction(job);
        return;
    }
    job.status = "running";
    const entry = currentEntry(job);
    const mappings = await readMappings();
    const mappingUrl = safeHaefeleUrl(mappings[entry.entryId]?.productUrl);
    job.phase = mappingUrl ? "product" : "home";
    await setProgress(job, `Häfele: ${job.results.length} von ${job.entries.length} Artikeln verarbeitet · ${entry.sku}`);
    await browser.tabs.update(job.haefeleTabId, { url: mappingUrl || HAEFELE_HOME });
    setTimeout(() => { void processCurrentPage(job, job.haefeleTabId); }, 1200);
};

const activateHaefeleTab = async job => {
    if (Number.isInteger(job?.haefeleTabId)) {
        const tab = await browser.tabs.get(job.haefeleTabId).catch(() => null);
        if (tab) {
            await browser.tabs.update(tab.id, { active: true });
            await browser.windows.update(tab.windowId, { focused: true }).catch(() => {});
            return tab;
        }
    }
    const tabs = await browser.tabs.query({ url: "https://www.haefele.de/*" });
    const tab = tabs[0] || await browser.tabs.create({ url: HAEFELE_HOME, active: true });
    if (tabs[0]) await browser.tabs.update(tab.id, { active: true });
    return tab;
};

const sidebarMessage = async message => {
    const job = await readJob();
    if (message.type === "GET_STATE") return publicState();
    if (message.type === "OPEN_HAEFELE") {
        await activateHaefeleTab(job);
        return publicState();
    }
    if (message.type === "SET_REVIEW_SETTING") {
        const settings = { reviewBeforeSubmit: Boolean(message.value) };
        await browser.storage.local.set({ [SETTINGS_KEY]: settings });
        if (job && ACTIVE_STATUSES.has(job.status)) {
            job.reviewBeforeSubmit = settings.reviewBeforeSubmit;
            await writeJob(job);
        } else await notifySidebar();
        return publicState();
    }
    if (!job) throw new Error("Kein Häfele-Abruf vorhanden");
    if (!ACTIVE_STATUSES.has(job.status) && [
        "PAUSE_JOB", "RESUME_JOB", "SKIP_ENTRY", "RETRY_ENTRY", "CAPTURE_PAGE",
        "SAVE_MANUAL_RESULT", "SUBMIT_JOB", "CANCEL_JOB"
    ].includes(message.type)) {
        throw new Error("Dieser Häfele-Abruf ist bereits abgeschlossen");
    }

    if (message.type === "PAUSE_JOB") {
        if (job.status === "running") {
            job.status = "paused";
            await setProgress(job, "Häfele-Abruf pausiert. Eine bereits laufende Seitenauswertung kann noch abgeschlossen werden.");
        }
        return publicState();
    }
    if (message.type === "RESUME_JOB") {
        if (["paused", "review"].includes(job.status) && pendingIndex(job) >= 0) {
            job.status = "running";
            await openCurrentItem(job);
        }
        return publicState();
    }
    if (message.type === "SKIP_ENTRY") {
        const entry = job.entries.find(item => item.entryId === message.entryId) || currentEntry(job);
        if (!entry) throw new Error("Kein Artikel zum Überspringen ausgewählt");
        upsertResult(job, {
            entryId: entry.entryId,
            supplierId: entry.supplierId,
            sku: entry.sku,
            ok: false,
            error: "In der Firefox-Sidebar übersprungen",
            manual: true
        });
        await openCurrentItem(job);
        return publicState();
    }
    if (message.type === "RETRY_ENTRY") {
        const entry = job.entries.find(item => item.entryId === message.entryId);
        if (!entry) throw new Error("Artikel wurde im aktuellen Job nicht gefunden");
        job.results = job.results.filter(result => result.entryId !== entry.entryId);
        job.index = job.entries.findIndex(item => item.entryId === entry.entryId);
        job.status = "running";
        await openCurrentItem(job);
        return publicState();
    }
    if (message.type === "DELETE_MAPPING") {
        const mappings = await readMappings();
        delete mappings[message.entryId];
        await writeMappings(mappings);
        return publicState();
    }
    if (message.type === "CAPTURE_PAGE") {
        const capture = await browser.tabs.sendMessage(job.haefeleTabId, { type: "CAPTURE_PAGE" });
        if (!capture?.ok) throw new Error(capture?.error || "Auf der geöffneten Häfele-Seite wurden keine Produktdaten gefunden");
        return capture;
    }
    if (message.type === "SAVE_MANUAL_RESULT") {
        const entry = job.entries.find(item => item.entryId === message.entryId);
        if (!entry) throw new Error("Artikel wurde im aktuellen Job nicht gefunden");
        const data = sanitizeProductData(message.data);
        if (!data.name) throw new Error("Eine Bezeichnung ist erforderlich");
        upsertResult(job, {
            entryId: entry.entryId,
            supplierId: entry.supplierId,
            sku: entry.sku,
            ok: true,
            data,
            manual: true
        });
        const productUrl = safeHaefeleUrl(message.mapping?.productUrl);
        const targetSku = cleanText(message.mapping?.targetSku, 120);
        if (productUrl || targetSku) {
            const mappings = await readMappings();
            mappings[entry.entryId] = {
                entryId: entry.entryId,
                sourceSku: entry.sku,
                targetSku: targetSku || entry.sku,
                productUrl,
                label: data.name,
                updatedAt: new Date().toISOString()
            };
            await writeMappings(mappings);
        }
        if (job.status === "running" && currentEntry(job)?.entryId === entry.entryId) await openCurrentItem(job);
        else {
            if (pendingIndex(job) < 0) job.status = "review";
            await writeJob(job);
        }
        return publicState();
    }
    if (message.type === "SUBMIT_JOB") {
        if (job.status !== "review") throw new Error("Der Abruf ist noch nicht zur Übertragung freigegeben");
        if (pendingIndex(job) >= 0) throw new Error("Noch nicht alle Artikel besitzen ein Ergebnis");
        await finishJob(job);
        return publicState();
    }
    if (message.type === "CANCEL_JOB") {
        await failJob(job, "Häfele-Abruf wurde in der Firefox-Sidebar abgebrochen", "cancelled");
        return publicState();
    }
    throw new Error("Unbekannte Sidebar-Aktion");
};

browser.runtime.onMessage.addListener(async (message, sender) => {
    if ([
        "GET_STATE", "OPEN_HAEFELE", "SET_REVIEW_SETTING", "PAUSE_JOB", "RESUME_JOB",
        "SKIP_ENTRY", "RETRY_ENTRY", "DELETE_MAPPING", "CAPTURE_PAGE",
        "SAVE_MANUAL_RESULT", "SUBMIT_JOB", "CANCEL_JOB"
    ].includes(message?.type)) return sidebarMessage(message);

    if (message?.type === "START_JOB") {
        const current = await readJob();
        if (current && ACTIVE_STATUSES.has(current.status)) throw new Error("Es läuft bereits ein Häfele-Abruf");
        const entries = (Array.isArray(message.entries) ? message.entries : [])
            .filter(entry => entry?.entryId && String(entry?.sku || "").trim())
            .slice(0, 10000);
        if (entries.length === 0) throw new Error("Keine Häfele-Artikel zum Abrufen vorhanden");
        const tab = await activateHaefeleTab(null);
        const settings = await readSettings();
        const job = {
            requestId: String(message.requestId || ""),
            appTabId: sender.tab?.id,
            haefeleTabId: tab.id,
            entries,
            index: 0,
            phase: "home",
            results: [],
            status: "running",
            reviewBeforeSubmit: settings.reviewBeforeSubmit,
            startedAt: new Date().toISOString(),
            message: "Häfele-Abruf wird vorbereitet."
        };
        if (!Number.isInteger(job.appTabId)) throw new Error("CarpentersProduction-Tab wurde nicht erkannt");
        await writeJob(job);
        await openCurrentItem(job);
        return { accepted: true };
    }

    const job = await readJob();
    if (!job || sender.tab?.id !== job.haefeleTabId) return;
    if (message?.type === "PAGE_READY") {
        await processCurrentPage(job, sender.tab.id);
        return;
    }
    if (message?.type === "LOGIN_REQUIRED") {
        await setProgress(job, "Häfele: Bitte im geöffneten Tab anmelden. Der Abruf läuft danach weiter.");
        return;
    }
    if (message?.type === "NAVIGATING") {
        job.phase = message.phase || job.phase;
        await writeJob(job);
        return;
    }
    if (message?.type === "ITEM_RESULT") {
        const entry = job.entries.find(item => item.entryId === message.entryId) || currentEntry(job);
        if (!entry) return;
        const existing = job.results.find(result => result.entryId === entry.entryId);
        if (existing?.manual) return;
        upsertResult(job, {
            entryId: entry.entryId,
            supplierId: entry.supplierId,
            sku: entry.sku,
            ok: Boolean(message.ok),
            ...(message.ok
                ? { data: sanitizeProductData(message.data), manual: false }
                : { error: cleanText(message.error || "Artikel konnte nicht ausgelesen werden", 1000), manual: false })
        });
        if (job.status === "paused") await writeJob(job);
        else await openCurrentItem(job);
        return;
    }
    if (message?.type === "FATAL_ERROR") await failJob(job, message.error);
});

browser.tabs.onRemoved.addListener(async tabId => {
    const job = await readJob();
    if (!job || !ACTIVE_STATUSES.has(job.status)) return;
    if (tabId === job.haefeleTabId) await failJob(job, "Der Häfele-Tab wurde geschlossen");
    else if (tabId === job.appTabId) {
        job.status = "cancelled";
        job.message = "Der CarpentersProduction-Tab wurde geschlossen.";
        await writeJob(job);
    }
});

const isPurchasingPage = value => {
    try { return /^\/Purchasing\/?$/i.test(new URL(value).pathname); } catch { return false; }
};

const openSidebarAndShop = async tab => {
    if (Number.isInteger(tab?.id) && isPurchasingPage(tab.url)) {
        try {
            await browser.scripting.executeScript({ target: { tabId: tab.id }, files: ["app-bridge.js"] });
        } catch {}
    }
    const job = await readJob();
    await activateHaefeleTab(job);
};

browser.action.onClicked.addListener(tab => {
    // Muss synchron im Benutzerereignis beginnen, sonst verweigert Firefox das Öffnen.
    void browser.sidebarAction.open();
    void openSidebarAndShop(tab);
});
