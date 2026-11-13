"use strict";

const JOB_KEY = "carpentersProductFetchJob";
const MAPPINGS_KEY = "carpentersProductFetchMappings";
const SETTINGS_KEY = "carpentersProductFetchSettings";
const SHOPS_KEY = "carpentersProductFetchShops";
const APP_CONNECTION_KEY = "carpentersProductFetchAppConnection";
const ACTIVE_STATUSES = new Set(["running", "paused", "review"]);

const readStored = async () => browser.storage.local.get([JOB_KEY, MAPPINGS_KEY, SETTINGS_KEY, SHOPS_KEY, APP_CONNECTION_KEY]);
const readJob = async () => (await readStored())[JOB_KEY] || null;
const readMappings = async () => (await readStored())[MAPPINGS_KEY] || {};
const readSettings = async () => {
    const stored = await readStored();
    return {
        reviewBeforeSubmit: true,
        ...(stored[SETTINGS_KEY] || {})
    };
};

const publicState = async () => {
    const stored = await readStored();
    const knownShops = Array.isArray(stored[SHOPS_KEY]) ? stored[SHOPS_KEY] : [];
    return {
        job: stored[JOB_KEY] || null,
        mappings: stored[MAPPINGS_KEY] || {},
        knownShops,
        currentShop: await detectCurrentShop(knownShops),
        settings: {
            reviewBeforeSubmit: true,
            ...(stored[SETTINGS_KEY] || {})
        }
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
const compareArticleNumber = (left, right) => String(left || "").localeCompare(String(right || ""), "de", { numeric: true, sensitivity: "base" });

const safeShopUrl = value => {
    if (!value) return "";
    try {
        const url = new URL(String(value));
        return url.protocol === "https:" && !url.username && !url.password ? url.toString() : "";
    } catch { return ""; }
};

const hostname = value => {
    try { return new URL(value).hostname.toLocaleLowerCase("de"); } catch { return ""; }
};

const sameShopHost = (left, right) => {
    const leftHost = hostname(left);
    const rightHost = hostname(right);
    return Boolean(leftHost && rightHost && (
        leftHost === rightHost || leftHost.endsWith(`.${rightHost}`) || rightHost.endsWith(`.${leftHost}`)
    ));
};

const sanitizeKnownShops = value => (Array.isArray(value) ? value : [])
    .map(shop => ({
        supplierId: cleanText(shop?.supplierId, 100),
        supplierName: cleanText(shop?.supplierName || "Lieferant", 500),
        shopUrl: safeShopUrl(shop?.shopUrl)
    }))
    .filter(shop => shop.supplierId && shop.shopUrl)
    .filter((shop, index, shops) => shops.findIndex(candidate => candidate.supplierId === shop.supplierId) === index);

const knownShopForUrl = (url, shops) => shops.find(shop => sameShopHost(url, shop.shopUrl)) || null;

const detectCurrentShop = async shops => {
    try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const shop = knownShopForUrl(tab?.url, shops);
        return shop ? { ...shop, tabId: tab.id, pageUrl: tab.url } : null;
    } catch {
        return null;
    }
};

const safeProductUrl = (value, entry) => {
    const candidate = safeShopUrl(value);
    return candidate && sameShopHost(candidate, entry?.shopUrl) ? candidate : "";
};

const sanitizeProductData = value => {
    const price = value?.netPrice === null || value?.netPrice === undefined || value?.netPrice === ""
        ? null
        : Number(value.netPrice);
    return {
        name: cleanText(value?.name, 500),
        description: cleanText(value?.description, 20000),
        unit: cleanText(value?.unit || "Stk.", 50) || "Stk.",
        imageUrl: safeShopUrl(value?.imageUrl),
        netPrice: Number.isFinite(price) && price >= 0 ? price : null,
        productSku: cleanText(value?.productSku, 120),
        productUrl: safeShopUrl(value?.productUrl)
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

const currentEntry = job => job.entries[job.index] || null;
const shopLabel = entry => entry?.supplierName || "Shop";

const finishJob = async job => {
    job.status = "submitted";
    job.finishedAt = new Date().toISOString();
    job.message = `${job.results.length} Ergebnisse wurden an CarpentersProduction übertragen.`;
    job.results = orderedResults(job);
    await writeJob(job);
    await sendAppEvent(job, { type: "complete", results: job.results, standalone: Boolean(job.standalone) });
    try { await browser.tabs.update(job.appTabId, { active: true }); } catch {}
};

const failJob = async (job, error, status = "error") => {
    job.status = status;
    job.message = String(error || "Unbekannter Erweiterungsfehler");
    job.finishedAt = new Date().toISOString();
    await writeJob(job);
    await sendAppEvent(job, { type: "error", error: job.message, standalone: Boolean(job.standalone) });
};

const ensureShopPageScript = async tabId => {
    await browser.scripting.executeScript({ target: { tabId }, files: ["shop-page.js"] });
};

const processCurrentPage = async (job, tabId) => {
    if (!job || job.status !== "running" || job.shopTabId !== tabId) return;
    const entry = currentEntry(job);
    if (!entry) return;
    const mappings = await readMappings();
    const mapping = mappings[entry.entryId] || null;
    try {
        await ensureShopPageScript(tabId);
        await browser.tabs.sendMessage(tabId, {
            type: "PROCESS_ITEM",
            entry: {
                ...entry,
                lookupSku: mapping?.targetSku || entry.sku
            },
            phase: job.phase
        });
    } catch {
        // Nach einer Navigation wird die Auswertung beim vollständigen Laden erneut angestoßen.
    }
};

const completeExtraction = async job => {
    if (job.reviewBeforeSubmit) {
        job.status = "review";
        await setProgress(job, `${job.results.length} Ergebnisse warten in der Sidebar auf Prüfung.`);
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
    const mappingUrl = safeProductUrl(mappings[entry.entryId]?.productUrl, entry);
    const startUrl = mappingUrl || safeShopUrl(entry.shopUrl);
    if (!startUrl) {
        upsertResult(job, {
            entryId: entry.entryId,
            supplierId: entry.supplierId,
            sku: entry.sku,
            ok: false,
            error: `Für ${shopLabel(entry)} ist keine gültige HTTPS-Shopadresse eingestellt`
        });
        await openCurrentItem(job);
        return;
    }
    job.phase = mappingUrl ? "product" : "home";
    job.currentShopName = shopLabel(entry);
    await setProgress(job, `${shopLabel(entry)}: ${job.results.length} von ${job.entries.length} Artikeln verarbeitet · ${entry.sku}`);
    await browser.tabs.update(job.shopTabId, { url: startUrl });
    setTimeout(() => { void processCurrentPage(job, job.shopTabId); }, 1200);
};

const activateShopTab = async (job, requestedUrl = "") => {
    if (Number.isInteger(job?.shopTabId)) {
        const tab = await browser.tabs.get(job.shopTabId).catch(() => null);
        if (tab) {
            await browser.tabs.update(tab.id, { active: true });
            await browser.windows.update(tab.windowId, { focused: true }).catch(() => {});
            return tab;
        }
    }
    const targetUrl = safeShopUrl(requestedUrl || currentEntry(job)?.shopUrl);
    if (!targetUrl) throw new Error("Keine gültige Shopadresse verfügbar");
    const tabs = await browser.tabs.query({});
    const tab = tabs.find(candidate => sameShopHost(candidate.url, targetUrl)) || await browser.tabs.create({ url: targetUrl, active: true });
    if (tab) await browser.tabs.update(tab.id, { active: true });
    return tab;
};

const capturePage = async job => {
    if (!Number.isInteger(job?.shopTabId)) throw new Error("Kein Shop-Tab ist mit dem Abruf verbunden");
    await ensureShopPageScript(job.shopTabId);
    const capture = await browser.tabs.sendMessage(job.shopTabId, { type: "CAPTURE_PAGE" });
    if (!capture?.ok) throw new Error(capture?.error || "Auf der geöffneten Shopseite wurden keine Produktdaten gefunden");
    return capture;
};

const entryForCurrentShop = async job => {
    const tab = await browser.tabs.get(job.shopTabId).catch(() => null);
    const current = currentEntry(job);
    if (current && sameShopHost(tab?.url, current.shopUrl)) return current;
    const jobEntry = job.entries.find(entry => sameShopHost(tab?.url, entry.shopUrl));
    if (jobEntry) return jobEntry;
    const stored = await readStored();
    const shop = knownShopForUrl(tab?.url, Array.isArray(stored[SHOPS_KEY]) ? stored[SHOPS_KEY] : []);
    return shop ? {
        supplierId: shop.supplierId,
        supplierName: shop.supplierName,
        shopUrl: shop.shopUrl
    } : null;
};

const createStandaloneJob = async () => {
    const stored = await readStored();
    const knownShops = Array.isArray(stored[SHOPS_KEY]) ? stored[SHOPS_KEY] : [];
    const currentShop = await detectCurrentShop(knownShops);
    if (!currentShop) throw new Error("Die aktuelle Seite gehört zu keinem in CP konfigurierten Extension-Lieferanten");
    const appTabId = stored[APP_CONNECTION_KEY]?.appTabId;
    const appTab = Number.isInteger(appTabId) ? await browser.tabs.get(appTabId).catch(() => null) : null;
    if (!appTab) throw new Error("CarpentersProduction ist nicht verbunden. Bitte /Purchasing einmal öffnen oder neu laden.");
    const settings = await readSettings();
    const job = {
        requestId: `standalone-${crypto.randomUUID()}`,
        appTabId,
        shopTabId: currentShop.tabId,
        entries: [],
        index: -1,
        phase: "product",
        results: [],
        status: "review",
        standalone: true,
        reviewBeforeSubmit: settings.reviewBeforeSubmit,
        currentShopName: currentShop.supplierName,
        startedAt: new Date().toISOString(),
        message: `${currentShop.supplierName}: Aktuelle Produktseite kann in die Prüfliste aufgenommen werden.`
    };
    await writeJob(job);
    return job;
};

const saveMapping = async (entry, data, productSku, productUrl) => {
    const mappings = await readMappings();
    mappings[entry.entryId] = {
        entryId: entry.entryId,
        supplierId: entry.supplierId,
        supplierName: entry.supplierName,
        sourceSku: entry.sku,
        targetSku: cleanText(productSku || entry.sku, 120),
        productUrl: safeProductUrl(productUrl, entry),
        label: data.name,
        updatedAt: new Date().toISOString()
    };
    await writeMappings(mappings);
};

const compareCurrentPage = async job => {
    const supplierEntry = await entryForCurrentShop(job);
    if (!supplierEntry) throw new Error("Die aktuelle Seite gehört zu keinem Lieferanten dieses Abrufs");
    const capture = await capturePage(job);
    const data = sanitizeProductData(capture.data || {});
    const productSku = cleanText(capture.productSku || data.productSku, 120);
    const productUrl = safeProductUrl(capture.productUrl || data.productUrl, supplierEntry);
    if (!productSku || !data.name) throw new Error("Artikelnummer oder Bezeichnung konnten auf der aktuellen Seite nicht erkannt werden");

    const mappings = await readMappings();
    const normalized = normalizeSku(productSku);
    let entry = job.entries.find(candidate => (
        candidate.supplierId === supplierEntry.supplierId && (
            normalizeSku(candidate.sku) === normalized ||
            normalizeSku(mappings[candidate.entryId]?.targetSku) === normalized ||
            normalizeSku(job.results.find(result => result.entryId === candidate.entryId)?.data?.productSku) === normalized
        )
    ));
    const added = !entry;
    if (!entry) {
        entry = {
            entryId: crypto.randomUUID(),
            supplierId: supplierEntry.supplierId,
            supplierName: supplierEntry.supplierName,
            shopUrl: supplierEntry.shopUrl,
            sku: productSku,
            name: data.name,
            newEntry: true
        };
        job.entries.push(entry);
    }
    data.productSku = productSku;
    data.productUrl = productUrl;
    upsertResult(job, {
        entryId: entry.entryId,
        supplierId: entry.supplierId,
        sku: entry.sku,
        newEntry: Boolean(entry.newEntry),
        ok: true,
        data,
        manual: true
    });
    await saveMapping(entry, data, productSku, productUrl);
    const continueAutomatically = job.status === "running" && currentEntry(job)?.entryId === entry.entryId;
    if (pendingIndex(job) < 0 && job.status !== "submitted") job.status = "review";
    await writeJob(job);
    if (continueAutomatically && job.status === "running") await openCurrentItem(job);
    return { ...(await publicState()), comparedEntryId: entry.entryId, added };
};

const sidebarMessage = async message => {
    let job = await readJob();
    if (message.type === "GET_STATE") return publicState();
    if (message.type === "CLEAR_PANEL") {
        if (job && ACTIVE_STATUSES.has(job.status)) {
            await sendAppEvent(job, { type: "error", error: "Product Fetch wurde über „Panel leeren“ beendet" });
        }
        await browser.storage.local.remove(JOB_KEY);
        await notifySidebar();
        return publicState();
    }
    if (message.type === "OPEN_SHOP") {
        if (job) await activateShopTab(job);
        else {
            const stored = await readStored();
            const knownShops = Array.isArray(stored[SHOPS_KEY]) ? stored[SHOPS_KEY] : [];
            const currentShop = await detectCurrentShop(knownShops);
            const target = currentShop || knownShops[0];
            if (!target) throw new Error("In CP ist noch kein Extension-Lieferant mit Shopadresse konfiguriert");
            if (!currentShop) await browser.tabs.create({ url: target.shopUrl, active: true });
        }
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
    if (message.type === "COMPARE_CURRENT_PAGE" && (!job || !ACTIVE_STATUSES.has(job.status))) job = await createStandaloneJob();
    if (!job) throw new Error("Kein Product-Fetch-Abruf vorhanden");
    if (!ACTIVE_STATUSES.has(job.status) && [
        "PAUSE_JOB", "RESUME_JOB", "SKIP_ENTRY", "RETRY_ENTRY", "CAPTURE_PAGE",
        "COMPARE_CURRENT_PAGE", "SAVE_MANUAL_RESULT", "SUBMIT_JOB", "CANCEL_JOB"
    ].includes(message.type)) {
        throw new Error("Dieser Product-Fetch-Abruf ist bereits abgeschlossen");
    }

    if (message.type === "PAUSE_JOB") {
        if (job.status === "running") {
            job.status = "paused";
            await setProgress(job, "Product Fetch pausiert. Eine bereits laufende Seitenauswertung kann noch abgeschlossen werden.");
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
            newEntry: Boolean(entry.newEntry),
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
    if (message.type === "CAPTURE_PAGE") return capturePage(job);
    if (message.type === "COMPARE_CURRENT_PAGE") return compareCurrentPage(job);
    if (message.type === "SAVE_MANUAL_RESULT") {
        const entry = job.entries.find(item => item.entryId === message.entryId);
        if (!entry) throw new Error("Artikel wurde im aktuellen Job nicht gefunden");
        const data = sanitizeProductData(message.data);
        if (!data.name) throw new Error("Eine Bezeichnung ist erforderlich");
        data.productSku = cleanText(message.mapping?.targetSku || data.productSku || entry.sku, 120);
        data.productUrl = safeProductUrl(message.mapping?.productUrl || data.productUrl, entry);
        upsertResult(job, {
            entryId: entry.entryId,
            supplierId: entry.supplierId,
            sku: entry.sku,
            newEntry: Boolean(entry.newEntry),
            ok: true,
            data,
            manual: true
        });
        await saveMapping(entry, data, data.productSku, data.productUrl);
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
        await failJob(job, "Product Fetch wurde in der Firefox-Sidebar abgebrochen", "cancelled");
        return publicState();
    }
    throw new Error("Unbekannte Sidebar-Aktion");
};

browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message?.type === "CONFIGURE_SHOPS") {
        if (!Number.isInteger(sender.tab?.id)) throw new Error("CarpentersProduction-Tab wurde nicht erkannt");
        const shops = sanitizeKnownShops(message.shops);
        await browser.storage.local.set({
            [SHOPS_KEY]: shops,
            [APP_CONNECTION_KEY]: { appTabId: sender.tab.id, updatedAt: new Date().toISOString() }
        });
        await notifySidebar();
        return { configured: shops.length };
    }

    if ([
        "GET_STATE", "CLEAR_PANEL", "OPEN_SHOP", "SET_REVIEW_SETTING", "PAUSE_JOB", "RESUME_JOB",
        "SKIP_ENTRY", "RETRY_ENTRY", "DELETE_MAPPING", "CAPTURE_PAGE", "COMPARE_CURRENT_PAGE",
        "SAVE_MANUAL_RESULT", "SUBMIT_JOB", "CANCEL_JOB"
    ].includes(message?.type)) return sidebarMessage(message);

    if (message?.type === "START_JOB") {
        const current = await readJob();
        if (current && ACTIVE_STATUSES.has(current.status)) throw new Error("Es läuft bereits ein Product-Fetch-Abruf");
        const entries = (Array.isArray(message.entries) ? message.entries : [])
            .filter(entry => entry?.entryId && entry?.supplierId && String(entry?.sku || "").trim() && safeShopUrl(entry?.shopUrl))
            .slice(0, 10000)
            .sort((left, right) => (
                String(left.supplierName || "").localeCompare(String(right.supplierName || ""), "de") ||
                compareArticleNumber(left.sku, right.sku)
            ));
        if (entries.length === 0) throw new Error("Keine Artikel mit gültiger Shopadresse zum Abrufen vorhanden");
        const settings = await readSettings();
        const job = {
            requestId: String(message.requestId || ""),
            appTabId: sender.tab?.id,
            shopTabId: null,
            entries,
            index: 0,
            phase: "home",
            results: [],
            status: "running",
            reviewBeforeSubmit: settings.reviewBeforeSubmit,
            startedAt: new Date().toISOString(),
            message: "Product Fetch wird vorbereitet."
        };
        if (!Number.isInteger(job.appTabId)) throw new Error("CarpentersProduction-Tab wurde nicht erkannt");
        const storedConfiguration = await readStored();
        await browser.storage.local.set({
            [SHOPS_KEY]: sanitizeKnownShops([
                ...(Array.isArray(storedConfiguration[SHOPS_KEY]) ? storedConfiguration[SHOPS_KEY] : []),
                ...entries.map(entry => ({
                supplierId: entry.supplierId,
                supplierName: entry.supplierName,
                shopUrl: entry.shopUrl
                }))
            ]),
            [APP_CONNECTION_KEY]: { appTabId: job.appTabId, updatedAt: new Date().toISOString() }
        });
        const tab = await activateShopTab(job, entries[0].shopUrl);
        job.shopTabId = tab.id;
        await writeJob(job);
        await openCurrentItem(job);
        return { accepted: true };
    }

    const job = await readJob();
    if (!job || sender.tab?.id !== job.shopTabId) return;
    if (message?.type === "PAGE_READY") {
        await processCurrentPage(job, sender.tab.id);
        return;
    }
    if (message?.type === "LOGIN_REQUIRED") {
        await setProgress(job, `${shopLabel(currentEntry(job))}: Bitte im geöffneten Tab anmelden. Der Abruf läuft danach weiter.`);
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
        if (existing?.manual) {
            if (job.status === "running" && currentEntry(job)?.entryId === entry.entryId) await openCurrentItem(job);
            return;
        }
        upsertResult(job, {
            entryId: entry.entryId,
            supplierId: entry.supplierId,
            sku: entry.sku,
            newEntry: Boolean(entry.newEntry),
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

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status !== "complete") return;
    void readJob().then(job => {
        if (job?.status === "running" && job.shopTabId === tabId) return processCurrentPage(job, tabId);
        return null;
    }).finally(() => notifySidebar());
});

browser.tabs.onActivated.addListener(() => { void notifySidebar(); });

browser.tabs.onRemoved.addListener(async tabId => {
    const job = await readJob();
    if (job && ACTIVE_STATUSES.has(job.status) && tabId === job.shopTabId) await failJob(job, "Der aktuelle Shop-Tab wurde geschlossen");
    else if (job && ACTIVE_STATUSES.has(job.status) && tabId === job.appTabId) {
        job.status = "cancelled";
        job.message = "Der CarpentersProduction-Tab wurde geschlossen.";
        await writeJob(job);
    } else await notifySidebar();
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
    if (job) await activateShopTab(job).catch(() => {});
};

browser.action.onClicked.addListener(tab => {
    // Muss synchron im Benutzerereignis beginnen, sonst verweigert Firefox das Öffnen.
    void browser.sidebarAction.open();
    void openSidebarAndShop(tab);
});
