import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../background.js", import.meta.url), "utf8");

test("sortiert Lieferanten und nimmt ein neues Produkt aus der aktuellen Seite auf", async () => {
    const stored = {};
    const listeners = [];
    const appEvents = [];
    let shopTab = null;
    const browser = {
        storage: {
            local: {
                async get(keys) {
                    const requested = Array.isArray(keys) ? keys : [keys];
                    return Object.fromEntries(requested.filter(key => key in stored).map(key => [key, stored[key]]));
                },
                async set(values) { Object.assign(stored, structuredClone(values)); },
                async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete stored[key]; }
            }
        },
        runtime: {
            onMessage: { addListener(listener) { listeners.push(listener); } },
            async sendMessage() {}
        },
        tabs: {
            async query() { return shopTab ? [shopTab] : []; },
            async create({ url }) { shopTab = { id: 10, windowId: 2, url }; return shopTab; },
            async get(id) { return id === shopTab?.id ? shopTab : { id, windowId: 1, url: "https://cp.example/Purchasing" }; },
            async update(id, values) {
                if (id === shopTab?.id) shopTab = { ...shopTab, ...values };
                return id === shopTab?.id ? shopTab : { id, windowId: 1, ...values };
            },
            async sendMessage(_id, message) {
                if (message?.type === "APP_EVENT") appEvents.push(message.payload);
                if (message?.type === "CAPTURE_PAGE") {
                    return {
                        ok: true,
                        productSku: "NEU-42",
                        productUrl: "https://www.haefele.de/de/produkt/neu/",
                        data: {
                            productSku: "NEU-42",
                            productUrl: "https://www.haefele.de/de/produkt/neu/",
                            name: "Neuer Beschlag",
                            description: "Erkannt",
                            unit: "Stk.",
                            netPrice: 12.5,
                            imageUrl: "https://www.haefele.de/image.jpg"
                        }
                    };
                }
                return undefined;
            },
            onUpdated: { addListener() {} },
            onActivated: { addListener() {} },
            onRemoved: { addListener() {} }
        },
        windows: { async update() {} },
        scripting: { async executeScript() {} },
        sidebarAction: { async open() {} },
        action: { onClicked: { addListener() {} } }
    };
    vm.runInNewContext(source, {
        browser,
        console,
        crypto,
        URL,
        Date,
        Intl,
        setTimeout() { return 0; },
        clearTimeout() {}
    });
    const onMessage = listeners[0];
    await onMessage({
        type: "START_JOB",
        requestId: "request-1",
        entries: [
            { entryId: "w-20", supplierId: "w", supplierName: "Würth", shopUrl: "https://eshop.wuerth.de/", sku: "20", name: "Zwanzig" },
            { entryId: "h-100", supplierId: "h", supplierName: "Häfele", shopUrl: "https://www.haefele.de/de/", sku: "100", name: "Hundert" },
            { entryId: "w-3", supplierId: "w", supplierName: "Würth", shopUrl: "https://eshop.wuerth.de/", sku: "3", name: "Drei" }
        ]
    }, { tab: { id: 1 } });

    assert.deepEqual(
        stored.carpentersProductFetchJob.entries.map(entry => entry.entryId),
        ["h-100", "w-3", "w-20"]
    );

    await onMessage({ type: "CLEAR_PANEL" }, {});
    await onMessage({
        type: "CONFIGURE_SHOPS",
        shops: [{ supplierId: "h", supplierName: "Häfele", shopUrl: "https://www.haefele.de/de/" }]
    }, { tab: { id: 1 } });
    const compared = await onMessage({ type: "COMPARE_CURRENT_PAGE" }, {});
    assert.equal(compared.added, true);
    assert.equal(compared.job.standalone, true);
    assert.equal(compared.job.entries.at(-1).sku, "NEU-42");
    assert.equal(compared.job.results.at(-1).newEntry, true);
    assert.equal(compared.job.results.at(-1).data.name, "Neuer Beschlag");
    await onMessage({ type: "SUBMIT_JOB" }, {});
    assert.equal(appEvents.at(-1).type, "complete");
    assert.equal(appEvents.at(-1).standalone, true);
});
