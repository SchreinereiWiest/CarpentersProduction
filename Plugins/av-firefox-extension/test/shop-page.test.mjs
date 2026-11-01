import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const frontendRequire = createRequire(new URL("../../../Frontend/package.json", import.meta.url));
const { JSDOM } = frontendRequire("jsdom");

const script = await readFile(new URL("../shop-page.js", import.meta.url), "utf8");
const url = "https://www.haefele.de/de/produkt/schubkasten-garnitur/63776333/?MasterSKU=P-00869999";
const dom = new JSDOM(`<!doctype html>
    <html><head>
        <title>Schubkasten-Garnitur</title>
        <meta property="og:title" content="Schubkasten-Garnitur, Blum Legrabox pure">
        <script type="application/ld+json">{
            "@context": "https://schema.org",
            "@type": "Product",
            "sku": "P-00869999",
            "name": "Schubkasten-Garnitur, Blum Legrabox pure"
        }</script>
    </head><body>
        <main>
            <h1>Schubkasten-Garnitur, Blum Legrabox pure</h1>
            <p>Tragkraft: 40 kg, Stahl, seidenweiß, Nennlänge: 450 mm</p>
            <p>Art.-Nr. 637.76.333 Artikelnummer kopiert</p>
            <div id="price-panel"></div>
            <section>
                <h2>Stückliste</h2>
                <p>Art.-Nr. 550.68.704</p>
                <p>Art.-Nr. 550.64.545</p>
            </section>
        </main>
    </body></html>`, {
    url,
    runScripts: "outside-only"
});

Object.defineProperty(dom.window.HTMLElement.prototype, "innerText", {
    configurable: true,
    get() { return this.textContent; },
    set(value) { this.textContent = value; }
});
Object.defineProperty(dom.window.HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() { return 100; }
});
Object.defineProperty(dom.window.HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get() { return 20; }
});

const messages = [];
let onMessage;
dom.window.browser = {
    runtime: {
        onMessage: { addListener(listener) { onMessage = listener; } },
        async sendMessage(message) { messages.push(message); }
    }
};

dom.window.eval(script);
setTimeout(() => {
    dom.window.document.querySelector("#price-panel").textContent = "36,83 € pro Garnitur (GR) Nettopreis";
}, 1000);

onMessage({
    type: "PROCESS_ITEM",
    phase: "product",
    entry: { entryId: "entry-1", sku: "P-00869999" }
});

const deadline = Date.now() + 9000;
let result;
while (Date.now() < deadline && !result) {
    await new Promise(resolve => setTimeout(resolve, 100));
    result = messages.find(message => message.type === "ITEM_RESULT");
}

assert.ok(result, "automatic processing must report an item result");
assert.equal(result.ok, true);
assert.equal(result.data.productSku, "63776333");
assert.equal(result.data.netPrice, 36.83);
assert.equal(result.data.unit, "GR");
assert.equal(result.data.name, "Schubkasten-Garnitur, Blum Legrabox pure");

console.log("Product Fetch automatic Häfele extraction: ok");

const genericDom = new JSDOM(`<!doctype html>
    <html><head>
        <title>Senkkopfschraube</title>
        <script type="application/ld+json">{
            "@context": "https://schema.org",
            "@type": "Product",
            "sku": "0123456",
            "name": "Senkkopfschraube",
            "description": "Verzinkt",
            "offers": { "@type": "Offer", "price": "14.95" }
        }</script>
    </head><body><main><h1>Senkkopfschraube</h1><p>Art.-Nr. 0123456</p></main></body></html>`, {
    url: "https://eshop.wuerth.de/Schrauben/Senkkopfschraube/0123456.cyid/1401.cgid/de/DE/EUR/",
    runScripts: "outside-only"
});
Object.defineProperty(genericDom.window.HTMLElement.prototype, "innerText", {
    configurable: true,
    get() { return this.textContent; }
});
Object.defineProperty(genericDom.window.HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() { return 100; }
});
Object.defineProperty(genericDom.window.HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get() { return 20; }
});
const genericMessages = [];
let genericOnMessage;
genericDom.window.browser = {
    runtime: {
        onMessage: { addListener(listener) { genericOnMessage = listener; } },
        async sendMessage(message) { genericMessages.push(message); }
    }
};
genericDom.window.eval(script);
genericOnMessage({
    type: "PROCESS_ITEM",
    phase: "product",
    entry: { entryId: "entry-2", sku: "0123456" }
});
const genericDeadline = Date.now() + 9000;
let genericResult;
while (Date.now() < genericDeadline && !genericResult) {
    await new Promise(resolve => setTimeout(resolve, 100));
    genericResult = genericMessages.find(message => message.type === "ITEM_RESULT");
}
assert.ok(genericResult, "generic shop processing must report an item result");
assert.equal(genericResult.ok, true);
assert.equal(genericResult.data.productSku, "0123456");
assert.equal(genericResult.data.netPrice, 14.95);
assert.equal(genericResult.data.name, "Senkkopfschraube");

console.log("Product Fetch automatic generic shop extraction: ok");
