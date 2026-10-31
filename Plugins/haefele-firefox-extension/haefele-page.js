(() => {
    "use strict";

    const normalizeSku = value => String(value || "").replace(/[^\p{L}\p{N}]/gu, "").toLocaleLowerCase("de");
    const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
    const visible = element => Boolean(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
    const visiblePasswordField = () => [...document.querySelectorAll("input[type='password'], input[autocomplete='current-password']")].some(visible);
    const visibleLoginLink = () => [...document.querySelectorAll("a[href*='account/login' i], a[href*='/login/' i]")]
        .find(link => visible(link) && /anmelden|login|konto/i.test(link.textContent || link.getAttribute("aria-label") || ""));

    const pageHasChallenge = () => (
        /just a moment|einen moment|security check/i.test(document.title) ||
        Boolean(document.querySelector("#challenge-running, #challenge-form, iframe[src*='challenges.cloudflare.com']"))
    );

    const waitForChallenge = async () => {
        for (let attempt = 0; attempt < 180 && pageHasChallenge(); attempt += 1) await sleep(500);
        if (pageHasChallenge()) throw new Error("Cloudflare-Prüfung wurde nicht innerhalb von 90 Sekunden abgeschlossen");
    };

    const productObjects = () => [...document.querySelectorAll('script[type="application/ld+json"]')]
        .flatMap(script => {
            try {
                const flatten = value => {
                    if (Array.isArray(value)) return value.flatMap(flatten);
                    if (!value || typeof value !== "object") return [];
                    return [value, ...flatten(value["@graph"]), ...flatten(value.itemListElement)];
                };
                return flatten(JSON.parse(script.textContent || ""));
            } catch { return []; }
        })
        .filter(item => {
            const types = Array.isArray(item?.["@type"]) ? item["@type"] : [item?.["@type"]];
            return types.some(type => String(type || "").toLowerCase() === "product");
        });

    const content = selector => document.querySelector(selector)?.getAttribute("content") || "";
    const text = selectors => selectors.map(selector => document.querySelector(selector)?.textContent?.trim()).find(Boolean) || "";
    const priceNumber = value => {
        if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
        const raw = String(value ?? "").replace(/\u00a0/g, " ").trim();
        if (!raw) return null;
        const numberPattern = "-?\\d{1,3}(?:[. '\\s]\\d{3})*(?:,\\d{1,4})|-?\\d+(?:[.,]\\d{1,4})?";
        const currencyAfter = raw.match(new RegExp(`(${numberPattern})\\s*(?:€|EUR)`, "i"));
        const currencyBefore = raw.match(new RegExp(`(?:€|EUR)\\s*(${numberPattern})`, "i"));
        const plain = raw.match(new RegExp(`(${numberPattern})`, "i"));
        const token = (currencyAfter || currencyBefore || plain)?.[1];
        if (!token) return null;
        let normalized = token.replace(/[ '\s]/g, "");
        if (normalized.includes(",")) normalized = normalized.replace(/\./g, "").replace(",", ".");
        else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(normalized)) normalized = normalized.replace(/\./g, "");
        const number = Number(normalized);
        return Number.isFinite(number) && number >= 0 ? number : null;
    };

    const extractPrice = offers => {
        const candidates = [];
        const add = (value, score, source, context = "") => {
            const price = priceNumber(value);
            if (price === null) return;
            const words = `${context} ${value}`.toLocaleLowerCase("de");
            let weightedScore = score;
            if (/netto|net price|kundenpreis|ihr preis|einkaufspreis/.test(words)) weightedScore += 80;
            if (/brutto|uvp|listenpreis|statt/.test(words)) weightedScore -= 35;
            candidates.push({ value: price, score: weightedScore, source });
        };

        add(offers?.price ?? offers?.lowPrice, 10, "structured", "schema.org offer");
        add(content('meta[itemprop="price"]'), 25, "meta", "itemprop price");
        add(content('meta[property="product:price:amount"]'), 25, "meta", "product price");

        const bodyText = document.body?.innerText || "";
        const netPatterns = [
            /(?:netto(?:preis)?|kundenpreis|ihr preis|einkaufspreis)[^\d€]{0,60}(\d[\d. '\u00a0]*(?:,\d{1,4})?)\s*(?:€|EUR)/i,
            /(\d[\d. '\u00a0]*(?:,\d{1,4})?)\s*(?:€|EUR)[^\n]{0,35}(?:netto|kundenpreis|ihr preis)/i,
            /(\d[\d. '\u00a0]*(?:,\d{1,4})?)\s*(?:€|EUR)[\s\S]{0,140}(?:netto|kundenpreis|ihr preis)/i
        ];
        for (const pattern of netPatterns) {
            const match = bodyText.match(pattern);
            if (match) add(match[0], 120, "net-text", match[0]);
        }

        const priceSelectors = [
            '[itemprop="price"]',
            '[data-testid*="price" i]',
            '[data-test*="price" i]',
            '[data-qa*="price" i]',
            '[data-price]',
            '[class*="net-price" i]',
            '[class*="netprice" i]',
            '[class*="customer-price" i]',
            '[class*="price-value" i]',
            '[class*="product-price" i]',
            '[class*="price" i]',
            '[id*="price" i]'
        ];
        const seen = new Set();
        for (const element of document.querySelectorAll(priceSelectors.join(","))) {
            if (seen.has(element) || !visible(element)) continue;
            seen.add(element);
            const value = element.getAttribute("content") ||
                element.getAttribute("data-price") ||
                element.getAttribute("data-value") ||
                element.getAttribute("aria-label") ||
                element.textContent;
            const context = `${element.id} ${element.className || ""} ${element.parentElement?.textContent?.slice(0, 180) || ""}`;
            const baseScore = element.matches('[itemprop="price"], [data-price], [data-testid*="price" i], [data-test*="price" i], [data-qa*="price" i]') ? 55 : 40;
            add(value, baseScore, "visible-dom", context);
        }
        return candidates.sort((left, right) => right.score - left.score)[0] || { value: null, score: 0, source: "missing" };
    };

    const pageArticleIdentifiers = products => {
        const identifiers = [];
        const add = (value, source) => {
            const raw = String(value || "").trim();
            const normalized = normalizeSku(raw);
            if (normalized && !identifiers.some(item => item.normalized === normalized)) {
                identifiers.push({ raw, normalized, source });
            }
        };
        // Only the first structured product belongs to the current detail page.
        // Further Product entries can be component articles from a bill of materials.
        const pageProduct = products[0];
        add(pageProduct?.sku, "structured-sku");
        add(pageProduct?.productID, "structured-product-id");
        add(pageProduct?.mpn, "structured-mpn");
        const url = new URL(window.location.href);
        for (const parameter of ["MasterSKU", "mastersku", "SKU", "sku", "ArticleNumber"]) {
            add(url.searchParams.get(parameter), `url-${parameter}`);
        }
        for (const match of url.pathname.matchAll(/\/(\d{6,})(?:\/|$)/g)) add(match[1], "url-article-number");

        const bodyText = document.body?.innerText || document.body?.textContent || "";
        const articlePattern = /(?:Art(?:ikel)?\.?\s*-?\s*Nr\.?|Artikelnummer)\s*:?\s*([A-Z0-9][A-Z0-9.\-/]{2,})/i;
        const visibleArticle = bodyText.match(articlePattern);
        if (visibleArticle) add(visibleArticle[1], "visible-article-number");
        const articleElement = document.querySelector([
            '[itemprop="sku"]',
            '[data-testid*="article-number" i]',
            '[data-test*="article-number" i]',
            '[class*="article-number" i]',
            '[class*="articleNumber" i]'
        ].join(","));
        if (articleElement) add(articleElement.getAttribute("content") || articleElement.textContent, "article-element");
        return identifiers;
    };

    const extractUnit = () => {
        const bodyText = document.body?.innerText || document.body?.textContent || "";
        const afterPrice = bodyText.match(/(?:€|EUR)\s*(?:pro|je)\s*[^\n(]{0,40}\(([A-ZÄÖÜ]{1,8})\)/i);
        return afterPrice?.[1] || "Stk.";
    };

    const extractProduct = (expectedSku, { allowMismatch = false } = {}) => {
        const expected = normalizeSku(expectedSku);
        const products = productObjects();
        const identifiers = pageArticleIdentifiers(products);
        const pageIdentifiers = new Set(identifiers.map(item => item.normalized));
        const product = products.find(item => (
            [item.sku, item.productID, item.mpn].map(normalizeSku).filter(Boolean).some(value => pageIdentifiers.has(value))
        )) || products[0];
        const offers = Array.isArray(product?.offers) ? product.offers[0] : product?.offers;
        const visibleIdentifier = identifiers.find(item => ["visible-article-number", "article-element"].includes(item.source));
        const sku = String(visibleIdentifier?.raw || product?.sku || product?.productID || product?.mpn || identifiers[0]?.raw || "").trim();
        if (!allowMismatch && (!likelyProductPage() || !identifiers.some(item => item.normalized === expected))) return null;
        if (allowMismatch && !product && identifiers.length === 0) return null;
        const name = String(product?.name || content('meta[property="og:title"]') || text(["h1", '[itemprop="name"]']) || "").trim();
        if (!name) return null;
        const rawImage = typeof product?.image === "object" && !Array.isArray(product.image)
            ? product.image.url || product.image.contentUrl
            : Array.isArray(product?.image) ? product.image[0] : product?.image;
        const imageElement = document.querySelector('[itemprop="image"], main img[src], .product-detail img[src]');
        const price = extractPrice(offers);
        return {
            name,
            description: String(product?.description || content('meta[name="description"]') || text([
                '[itemprop="description"]', '[class*="product-description"]'
            ]) || "").trim(),
            imageUrl: String(rawImage || content('meta[property="og:image"]') || imageElement?.src || "").trim(),
            netPrice: price.value,
            unit: extractUnit(),
            productSku: sku,
            productUrl: window.location.href,
            priceConfidence: price.score,
            priceSource: price.source
        };
    };

    const likelyProductPage = () => (
        /\/(?:produkt|product)\//i.test(window.location.pathname) ||
        Boolean(document.querySelector('[itemtype*="schema.org/Product"], [data-testid*="product-detail" i], [class*="product-detail" i]'))
    );

    const waitForCompleteProduct = async (expectedSku, { allowMismatch = false, timeout = 15000 } = {}) => {
        const startedAt = Date.now();
        let best = null;
        let stablePrice = null;
        let stableSince = 0;
        while (Date.now() - startedAt < timeout) {
            const current = extractProduct(expectedSku, { allowMismatch });
            if (current) {
                if (!best || current.priceConfidence >= best.priceConfidence) best = current;
                else best = {
                    ...current,
                    netPrice: best.netPrice,
                    priceConfidence: best.priceConfidence,
                    priceSource: best.priceSource
                };
                if (current.netPrice !== null && current.priceConfidence >= 40) {
                    if (stablePrice !== current.netPrice) {
                        stablePrice = current.netPrice;
                        stableSince = Date.now();
                    }
                    const minimumPageTimeReached = Date.now() - startedAt >= 5000;
                    if (minimumPageTimeReached && Date.now() - stableSince >= 700) return best;
                }
            }
            await sleep(250);
        }
        return best;
    };

    const sendItemResult = (entry, payload) => browser.runtime.sendMessage({
        type: "ITEM_RESULT",
        entryId: entry.entryId,
        ...payload
    });

    const exactProductLink = sku => {
        const expected = normalizeSku(sku);
        return [...document.querySelectorAll("main a[href], a[href*='/de/product/'], a[href*='/de/produkt/']")].find(link => {
            const candidate = normalizeSku(`${link.textContent || ""} ${link.getAttribute("href") || ""}`);
            return candidate.includes(expected) && visible(link);
        });
    };

    const searchInput = () => [...document.querySelectorAll([
        "input[type='search']",
        "input[name='query']",
        "input[name*='search' i]",
        "input[placeholder*='Suche' i]"
    ].join(","))].find(visible);

    const processItem = async ({ entry, phase }) => {
        try {
            await waitForChallenge();
            if (visiblePasswordField()) {
                await browser.runtime.sendMessage({ type: "LOGIN_REQUIRED" });
                for (let attempt = 0; attempt < 600 && visiblePasswordField(); attempt += 1) await sleep(1000);
                if (visiblePasswordField()) {
                    await sendItemResult(entry, { ok: false, error: "Häfele-Anmeldung wurde nicht innerhalb von zehn Minuten abgeschlossen" });
                    return;
                }
                await processItem({ entry, phase: "home" });
                return;
            }
            const loginLink = phase === "home" ? visibleLoginLink() : null;
            if (loginLink) {
                await browser.runtime.sendMessage({ type: "NAVIGATING", phase: "login" });
                loginLink.click();
                await sleep(1500);
                await processItem({ entry, phase: "login" });
                return;
            }
            await sleep(500);
            const lookupSku = entry.lookupSku || entry.sku;
            let product = extractProduct(lookupSku);
            if (product || phase === "product" || likelyProductPage()) {
                product = await waitForCompleteProduct(lookupSku);
            }
            if (product) {
                await sendItemResult(entry, { ok: true, data: product });
                return;
            }
            if (phase === "product") {
                await sendItemResult(entry, { ok: false, error: "Die Häfele-Produktseite enthält keine eindeutigen Artikeldaten" });
                return;
            }
            let link = exactProductLink(lookupSku);
            if (!link && phase === "search-results") {
                const resultDeadline = Date.now() + 10000;
                while (Date.now() < resultDeadline && !link) {
                    const lateProduct = extractProduct(lookupSku);
                    if (lateProduct || likelyProductPage()) {
                        product = await waitForCompleteProduct(lookupSku);
                        if (product) {
                            await sendItemResult(entry, { ok: true, data: product });
                            return;
                        }
                    }
                    link = exactProductLink(lookupSku);
                    if (!link) await sleep(250);
                }
            }
            if (link) {
                await browser.runtime.sendMessage({ type: "NAVIGATING", phase: "product" });
                link.click();
                await sleep(1500);
                await processItem({ entry, phase: "product" });
                return;
            }
            if (phase === "search-results") {
                await sendItemResult(entry, { ok: false, error: "Kein eindeutiger Häfele-Artikel zur Artikelnummer gefunden" });
                return;
            }
            const input = searchInput();
            if (!input) {
                await sendItemResult(entry, { ok: false, error: "Häfele-Suchfeld wurde nicht gefunden" });
                return;
            }
            input.focus();
            input.value = String(entry.lookupSku || entry.sku).trim();
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
            await browser.runtime.sendMessage({ type: "NAVIGATING", phase: "search-results" });
            const form = input.closest("form");
            if (form?.requestSubmit) form.requestSubmit();
            else input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
            await sleep(1500);
            await processItem({ entry, phase: "search-results" });
        } catch (error) {
            await sendItemResult(entry, { ok: false, error: error.message || "Häfele-Seite konnte nicht verarbeitet werden" });
        }
    };

    let processing = false;
    browser.runtime.onMessage.addListener(message => {
        if (message?.type === "CAPTURE_PAGE") {
            return waitForCompleteProduct("", { allowMismatch: true, timeout: 15000 }).then(product => product
                ? { ok: true, data: product, productSku: product.productSku, productUrl: product.productUrl }
                : { ok: false, error: "Die geöffnete Seite enthält keine erkennbaren Produktdaten" });
        }
        if (message?.type !== "PROCESS_ITEM" || processing) return;
        processing = true;
        void processItem(message).finally(() => { processing = false; });
    });
    void browser.runtime.sendMessage({ type: "PAGE_READY" });
})();
