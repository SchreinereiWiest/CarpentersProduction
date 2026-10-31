import assert from "node:assert/strict";
import test from "node:test";

import { parseDatanormUpload, parseDatanormUploads } from "../src/modules/purchasing/datanorm/datanorm-parser.js";
import { datanormPlugin } from "../src/modules/purchasing/shop-fetch/plugins/datanorm.plugin.js";

test("DATANORM 5 wird normalisiert und vom Händler-Plugin gefunden", async () => {
    const article = Array(30).fill("");
    Object.assign(article, {
        0: "A", 1: "N", 2: "12.3-4", 3: "Schraube", 4: "Verzinkt",
        5: "PCE", 6: "1", 7: "2", 8: "325", 23: "TEXT-123"
    });
    const parsed = await parseDatanormUpload({
        originalname: "DATANORM.001",
        mimetype: "text/plain",
        buffer: Buffer.from([
            "V;050;A;20261031;EUR;Test;",
            "T;N;TEXT-123;1;01;Langer Beschreibungstext;",
            article.join(";"),
            "E;1;Test;"
        ].join("\r\n"), "utf8")
    });
    assert.equal(parsed.articles.length, 1);
    assert.equal(parsed.articles[0].netPrice, 3.25);
    assert.match(parsed.articles[0].description, /Langer Beschreibungstext/);

    const [result] = await datanormPlugin.fetchArticles({
        supplier: {
            datanormArticles: parsed.articles
        },
        entries: [{ id: "entry-1", sku: "1234" }]
    });
    assert.equal(result.ok, true);
    assert.equal(result.data.name, "Schraube");
});

test("DATANORM 4 berücksichtigt Textkennzeichen und Preiseinheit", async () => {
    const parsed = await parseDatanormUpload({
        originalname: "DATANORM.001",
        mimetype: "text/plain",
        buffer: Buffer.from([
            "V;040;A;20261031;EUR;Test;",
            // Preiskennzeichen 2 = netto, Preiseinheit 1 = Preis je 10 Stück.
            "A;N;ABC-1;K;Spanplattenschraube;verzinkt;2;1;ST;1250;RG;WG;TEXT1;",
            "T;N;TEXT1;1;01;Teilgewinde;"
        ].join("\r\n"), "utf8")
    });
    assert.deepEqual(parsed.articles[0], {
        sku: "ABC-1",
        name: "Spanplattenschraube",
        description: "verzinkt Teilgewinde",
        unit: "ST",
        netPrice: 1.25,
        imageUrl: null,
        sourceVersion: "4",
        sourceFile: "DATANORM.001"
    });
});

test("DATANORM-Rabattgruppen wandeln Listenpreise in Einkaufspreise um", async () => {
    const parsed = await parseDatanormUploads([{
        originalname: "DATANORM.001",
        mimetype: "text/plain",
        buffer: Buffer.from("V;040;A;20261031;EUR;Test;\r\nA;N;LISTE-1;K;Listenartikel;;1;0;ST;1000;RG1;WG;;", "utf8")
    }, {
        originalname: "DATANORM.RAB",
        mimetype: "text/plain",
        buffer: Buffer.from("V;040;R;20261031;EUR;Test;\r\nR;RG1;1;20;20 Prozent;", "utf8")
    }]);
    assert.equal(parsed.articles[0].netPrice, 8);
});
