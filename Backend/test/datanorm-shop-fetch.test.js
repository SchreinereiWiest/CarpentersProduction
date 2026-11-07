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

test("Würth-Preislisten verwenden die Produktnummer statt der Produktlinie als Artikelnummer", async () => {
    const header = [
        "Produktlinie", "Produktname", "Produkttext", "Produktnummer", "Packgröße",
        "Mengeneinheit", "STAFFELMENGE", "Kundenmaterialbezeichnung", "Preiseinheit",
        "Bruttopreis", "Nettopreis", "Währung", "Rabatt", "Teuerungszuschlag"
    ].join(";");
    const parsed = await parseDatanormUpload({
        originalname: "DATANORM.001",
        mimetype: "text/plain",
        buffer: Buffer.from([
            header,
            'A;ASSY Schraube;"verzinkt; Teilgewinde";0190 014 50;100;ST;100;;100;30,00;20,00;EUR;33,33;0',
            'A;ASSY Schraube;"verzinkt; Teilgewinde";0190 014 50;100;ST;1;;100;30,00;25,00;EUR;16,67;0'
        ].join("\r\n"), "utf8")
    });

    assert.equal(parsed.articles.length, 1);
    assert.deepEqual(parsed.articles[0], {
        sku: "0190 014 50",
        name: "ASSY Schraube",
        description: "verzinkt; Teilgewinde",
        unit: "Packung (100 ST)",
        netPrice: 25,
        imageUrl: null,
        sourceVersion: null,
        sourceFile: "DATANORM.001"
    });

    const [result] = await datanormPlugin.fetchArticles({
        supplier: { datanormArticles: parsed.articles },
        entries: [{ id: "entry-1", sku: "019001450" }]
    });
    assert.equal(result.ok, true);
    assert.equal(result.data.name, "ASSY Schraube");
});

test("Würth-DATANORM findet die Basisartikelnummer ohne angehängte Verpackungsmenge", async () => {
    const parsed = await parseDatanormUploads([{
        originalname: "Datanorm.001",
        mimetype: "text/plain",
        buffer: Buffer.from([
            "V 051126Adolf Wuerth KG-Kuenzelsau-Preisliste490387                                     COPYRIGHT:ADOLF WUERTH KG          04EUR",
            "A;N;019014035   500;00;SHR-SEKPF-FRT-HO-RW20-(A2K)-4X35/21;Spanplattenschraube Senkfrästaschenkopf;2;2;ST;137; ;190; ;"
        ].join("\r\n"), "latin1")
    }, {
        originalname: "Datpreis.001",
        mimetype: "text/plain",
        buffer: Buffer.from([
            "V 051126Adolf Wuerth KG-Kuenzelsau-Preisliste490387                                     COPYRIGHT:ADOLF WUERTH KG          04EUR",
            "P;A;019014035   500;1;137;1;0;3;0;;;"
        ].join("\r\n"), "utf8")
    }]);

    assert.equal(parsed.version, "4");
    assert.equal(parsed.articles[0].sku, "019014035   500");
    assert.equal(parsed.articles[0].description, "Spanplattenschraube Senkfrästaschenkopf");
    assert.equal(parsed.articles[0].unit, "Packung (500 ST)");
    assert.equal(parsed.articles[0].netPrice, 6.85);

    const [result] = await datanormPlugin.fetchArticles({
        supplier: { name: "Würth", datanormArticles: parsed.articles },
        entries: [{ id: "entry-1", sku: "019014035" }]
    });
    assert.equal(result.ok, true);
    assert.equal(result.data.name, "SHR-SEKPF-FRT-HO-RW20-(A2K)-4X35/21");
    assert.equal(result.data.unit, "Packung (500 ST)");
    assert.equal(result.data.netPrice, 6.85);
});
