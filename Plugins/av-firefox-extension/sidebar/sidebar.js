"use strict";

const byId = id => document.getElementById(id);
const elements = {
    notice: byId("notice"),
    empty: byId("empty-state"),
    jobPanel: byId("job-panel"),
    status: byId("job-status"),
    count: byId("job-count"),
    progress: byId("progress-bar"),
    message: byId("job-message"),
    currentCard: byId("current-card"),
    currentSku: byId("current-sku"),
    currentName: byId("current-name"),
    pauseResume: byId("pause-resume"),
    skipCurrent: byId("skip-current"),
    resultList: byId("result-list"),
    reviewSetting: byId("review-setting"),
    entrySelect: byId("editor-entry"),
    targetSku: byId("editor-target-sku"),
    productUrl: byId("editor-product-url"),
    name: byId("editor-name"),
    description: byId("editor-description"),
    price: byId("editor-price"),
    unit: byId("editor-unit"),
    image: byId("editor-image"),
    submitJob: byId("submit-job"),
    submitHint: byId("submit-hint"),
    cancelJob: byId("cancel-job"),
    mappingCount: byId("mapping-count"),
    mappingList: byId("mapping-list"),
    currentShopName: byId("current-shop-name"),
    compareCurrentPage: byId("compare-current-page"),
    clearPanel: byId("clear-panel")
};
elements.capturePage = byId("capture-page");
elements.saveManual = byId("save-manual");

let state = { job: null, mappings: {}, knownShops: [], currentShop: null, settings: { reviewBeforeSubmit: true } };
let editorEntryId = null;

const statusLabels = {
    running: "Läuft",
    paused: "Pausiert",
    review: "Prüfung",
    submitted: "Übertragen",
    cancelled: "Abgebrochen",
    error: "Fehler"
};

const showNotice = (message, kind = "") => {
    elements.notice.textContent = message;
    elements.notice.className = `notice ${kind}`.trim();
    elements.notice.hidden = !message;
    if (message) setTimeout(() => {
        if (elements.notice.textContent === message) elements.notice.hidden = true;
    }, 6000);
};

const send = async (type, payload = {}) => {
    try {
        const response = await browser.runtime.sendMessage({ type, ...payload });
        if (response?.job !== undefined) {
            state = response;
            render();
        }
        return response;
    } catch (error) {
        showNotice(error.message || "Aktion konnte nicht ausgeführt werden", "error");
        throw error;
    }
};

const button = (label, action, title = "") => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "mini-button";
    item.textContent = label;
    item.title = title;
    item.addEventListener("click", action);
    return item;
};

const getResult = entryId => state.job?.results?.find(result => result.entryId === entryId) || null;
const getEntry = entryId => state.job?.entries?.find(entry => entry.entryId === entryId) || null;

const markSelectedResult = () => {
    for (const row of elements.resultList.querySelectorAll(".result-row")) {
        row.classList.toggle("selected", row.dataset.entryId === editorEntryId);
    }
};

const loadEditor = entryId => {
    const entry = getEntry(entryId);
    if (!entry) return;
    editorEntryId = entry.entryId;
    elements.entrySelect.value = entry.entryId;
    const result = getResult(entry.entryId);
    const data = result?.ok ? result.data || {} : {};
    const mapping = state.mappings?.[entry.entryId] || {};
    elements.targetSku.value = mapping.targetSku || data.productSku || entry.sku || "";
    elements.productUrl.value = mapping.productUrl || data.productUrl || "";
    elements.name.value = data.name || entry.name || "";
    elements.description.value = data.description || "";
    elements.price.value = data.netPrice ?? "";
    elements.unit.value = data.unit || "Stk.";
    elements.image.value = data.imageUrl || "";
    markSelectedResult();
};

const renderEditorOptions = job => {
    const prior = editorEntryId;
    elements.entrySelect.replaceChildren();
    for (const entry of job.entries) {
        const option = document.createElement("option");
        option.value = entry.entryId;
        option.textContent = `${entry.supplierName || "Shop"} · ${entry.sku} · ${entry.name || "Ohne Bezeichnung"}`;
        elements.entrySelect.append(option);
    }
    const fallback = job.entries[job.index]?.entryId || job.entries[0]?.entryId || null;
    const selected = job.entries.some(entry => entry.entryId === prior) ? prior : fallback;
    if (selected && selected !== editorEntryId) loadEditor(selected);
    else if (selected) elements.entrySelect.value = selected;
};

const renderResults = job => {
    elements.resultList.replaceChildren();
    const byResult = new Map(job.results.map(result => [result.entryId, result]));
    for (const entry of job.entries) {
        const result = byResult.get(entry.entryId);
        const row = document.createElement("div");
        row.className = "result-row";
        row.dataset.entryId = entry.entryId;
        row.tabIndex = 0;
        row.setAttribute("role", "button");
        row.setAttribute("aria-label", `${entry.sku} in der manuellen Korrektur anzeigen`);
        row.title = "Treffer in der manuellen Korrektur anzeigen";
        const openInEditor = () => {
            loadEditor(entry.entryId);
            byId("editor-entry").scrollIntoView({ behavior: "smooth", block: "center" });
        };
        row.addEventListener("click", event => {
            if (!event.target.closest("button")) openInEditor();
        });
        row.addEventListener("keydown", event => {
            if (["Enter", " "].includes(event.key) && event.target === row) {
                event.preventDefault();
                openInEditor();
            }
        });
        const copy = document.createElement("div");
        copy.className = "result-copy";
        const title = document.createElement("strong");
        const dot = document.createElement("span");
        dot.className = `result-dot ${result ? result.ok ? "" : "failed" : "pending"}`.trim();
        title.append(dot, document.createTextNode(entry.sku));
        const detail = document.createElement("span");
        detail.textContent = result
            ? result.ok ? `${entry.supplierName || "Shop"} · ${result.data?.name || entry.name}${result.manual ? " · manuell" : ""}` : `${entry.supplierName || "Shop"} · ${result.error}`
            : `${entry.supplierName || "Shop"} · ${entry.entryId === job.entries[job.index]?.entryId ? "Wird verarbeitet …" : "Ausstehend"}`;
        copy.append(title, detail);
        const actions = document.createElement("div");
        actions.className = "result-actions";
        actions.append(button("Bearbeiten", openInEditor));
        if (result && ["running", "paused", "review"].includes(job.status)) {
            actions.append(button("↻", () => void send("RETRY_ENTRY", { entryId: entry.entryId }), "Erneut abrufen"));
        }
        row.append(copy, actions);
        elements.resultList.append(row);
    }
    markSelectedResult();
};

const renderMappings = () => {
    const mappings = Object.values(state.mappings || {}).sort((left, right) => String(left.sourceSku).localeCompare(String(right.sourceSku), "de", { numeric: true }));
    elements.mappingCount.textContent = String(mappings.length);
    elements.mappingList.replaceChildren();
    if (mappings.length === 0) {
        const empty = document.createElement("div");
        empty.className = "mapping-empty";
        empty.textContent = "Noch keine manuellen Verknüpfungen gespeichert.";
        elements.mappingList.append(empty);
        return;
    }
    for (const mapping of mappings) {
        const row = document.createElement("div");
        row.className = "mapping-row";
        const copy = document.createElement("div");
        copy.className = "mapping-copy-main";
        const title = document.createElement("strong");
        title.textContent = `${mapping.sourceSku} → ${mapping.targetSku || mapping.sourceSku}`;
        const detail = document.createElement("span");
        detail.textContent = `${mapping.supplierName || "Shop"} · ${mapping.label || mapping.productUrl || "Produkt"}`;
        copy.append(title, detail);
        row.append(copy, button("Löschen", () => void send("DELETE_MAPPING", { entryId: mapping.entryId })));
        elements.mappingList.append(row);
    }
};

const render = () => {
    const job = state.job;
    elements.reviewSetting.checked = state.settings?.reviewBeforeSubmit !== false;
    elements.empty.hidden = Boolean(job);
    elements.jobPanel.hidden = !job;
    renderMappings();
    if (!job) {
        elements.currentShopName.textContent = state.currentShop?.supplierName || "Kein bekannter Shop aktiv";
        elements.compareCurrentPage.disabled = !state.currentShop;
        return;
    }

    const done = job.results.length;
    const total = job.entries.length;
    const current = job.entries[job.index] || null;
    const activeJob = ["running", "paused", "review"].includes(job.status);
    elements.currentShopName.textContent = activeJob
        ? current?.supplierName || job.currentShopName || state.currentShop?.supplierName || "Kein Shop aktiv"
        : state.currentShop?.supplierName || "Kein bekannter Shop aktiv";
    elements.status.textContent = statusLabels[job.status] || job.status || "Bereit";
    elements.status.dataset.status = job.status || "";
    elements.count.textContent = `${done} / ${total}`;
    elements.progress.style.width = `${total ? Math.min(100, (done / total) * 100) : 0}%`;
    elements.message.textContent = job.message || "";
    elements.currentCard.hidden = !current || !["running", "paused"].includes(job.status);
    elements.currentSku.textContent = current?.sku || "–";
    elements.currentName.textContent = current?.name || "Ohne Bezeichnung";
    elements.pauseResume.textContent = job.status === "paused" ? "Fortsetzen" : "Pausieren";
    elements.pauseResume.disabled = !["running", "paused"].includes(job.status);
    elements.skipCurrent.disabled = !current || !["running", "paused"].includes(job.status);
    renderResults(job);
    renderEditorOptions(job);

    const complete = done === total;
    const editable = ["running", "paused", "review"].includes(job.status);
    elements.entrySelect.disabled = !editable;
    elements.capturePage.disabled = !editable;
    elements.saveManual.disabled = !editable;
    elements.submitJob.disabled = !complete || job.status !== "review";
    elements.submitHint.textContent = job.status === "submitted"
        ? "Die Daten wurden an CarpentersProduction übertragen."
        : complete ? "Alle Ergebnisse sind vollständig und können übertragen werden." : `${total - done} Artikel benötigen noch ein Ergebnis.`;
    elements.cancelJob.disabled = !["running", "paused", "review"].includes(job.status);
    elements.compareCurrentPage.disabled = !editable && !state.currentShop;
};

const loadState = async () => {
    state = await browser.runtime.sendMessage({ type: "GET_STATE" });
    render();
};

byId("open-shop").addEventListener("click", () => void send("OPEN_SHOP"));
byId("empty-open-shop").addEventListener("click", () => void send("OPEN_SHOP"));
elements.reviewSetting.addEventListener("change", event => void send("SET_REVIEW_SETTING", { value: event.target.checked }));
elements.pauseResume.addEventListener("click", () => void send(state.job?.status === "paused" ? "RESUME_JOB" : "PAUSE_JOB"));
elements.skipCurrent.addEventListener("click", () => void send("SKIP_ENTRY", { entryId: state.job?.entries?.[state.job.index]?.entryId }));
elements.entrySelect.addEventListener("change", event => loadEditor(event.target.value));

elements.capturePage.addEventListener("click", async () => {
    try {
        const capture = await send("CAPTURE_PAGE");
        const data = capture.data || {};
        elements.targetSku.value = capture.productSku || data.productSku || elements.targetSku.value;
        elements.productUrl.value = capture.productUrl || data.productUrl || elements.productUrl.value;
        elements.name.value = data.name || elements.name.value;
        elements.description.value = data.description || "";
        elements.price.value = data.netPrice ?? "";
        elements.unit.value = data.unit || "Stk.";
        elements.image.value = data.imageUrl || "";
        showNotice("Produktdaten aus der geöffneten Shopseite übernommen.", "success");
    } catch {}
});

elements.saveManual.addEventListener("click", async () => {
    const entryId = elements.entrySelect.value;
    if (!entryId || !elements.name.value.trim()) {
        showNotice("Bitte Katalogartikel und Name angeben.", "error");
        return;
    }
    try {
        await send("SAVE_MANUAL_RESULT", {
            entryId,
            data: {
                name: elements.name.value,
                description: elements.description.value,
                netPrice: elements.price.value === "" ? null : Number(elements.price.value),
                unit: elements.unit.value,
                imageUrl: elements.image.value
            },
            mapping: {
                targetSku: elements.targetSku.value,
                productUrl: elements.productUrl.value
            }
        });
        showNotice("Produktdaten und Verknüpfung gespeichert.", "success");
    } catch {}
});

elements.submitJob.addEventListener("click", () => void send("SUBMIT_JOB"));
elements.cancelJob.addEventListener("click", () => {
    if (confirm("Den laufenden Product-Fetch-Abruf wirklich abbrechen?")) void send("CANCEL_JOB");
});

elements.compareCurrentPage.addEventListener("click", async () => {
    try {
        const response = await send("COMPARE_CURRENT_PAGE");
        if (response?.comparedEntryId) loadEditor(response.comparedEntryId);
        showNotice(response?.added
            ? "Artikel wurde aus der aktuellen Seite neu in die Prüfliste aufgenommen."
            : "Aktuelle Seite wurde mit dem vorhandenen Prüflistenartikel abgeglichen.", "success");
    } catch {}
});

elements.clearPanel.addEventListener("click", () => {
    if (state.job && !confirm("Prüfliste und aktuellen Abruf wirklich aus dem Panel entfernen? Gespeicherte Verknüpfungen bleiben erhalten.")) return;
    editorEntryId = null;
    void send("CLEAR_PANEL");
});

browser.runtime.onMessage.addListener(message => {
    if (message?.type !== "STATE_UPDATED" || !message.state) return;
    state = message.state;
    render();
});

browser.storage.onChanged.addListener(changes => {
    if (changes.carpentersProductFetchJob || changes.carpentersProductFetchMappings || changes.carpentersProductFetchSettings || changes.carpentersProductFetchShops) {
        void loadState();
    }
});

void loadState().catch(error => showNotice(error.message || "Erweiterungsstatus konnte nicht geladen werden", "error"));
