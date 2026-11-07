import { isUtf8 } from "node:buffer";
import path from "node:path";

import iconv from "iconv-lite";
import unzipper from "unzipper";

import { wuerthSkuParts } from "./datanorm-sku.js";

const MAX_ARCHIVE_ENTRIES = 100;
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 150 * 1024 * 1024;
const MAX_RECORDS = 500000;
const DATANORM_FILE = /^(datanorm|datpreis|dattext|data)[a-z0-9_.-]*$/i;

const text = value => String(value ?? "").replace(/\u001a/g, "").trim();
const skuKey = value => text(value).replace(/[^\p{L}\p{N}]/gu, "").toLocaleLowerCase("de");
const cleanDescription = value => text(value).replace(/\s+/g, " ");
const headerKey = value => text(value)
    .replace(/ß/gi, "ss")
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLocaleLowerCase("de");

const parseDelimitedLine = (line, delimiter) => {
    const fields = [];
    let value = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
        const character = line[index];
        if (character === '"') {
            if (quoted && line[index + 1] === '"') {
                value += '"';
                index += 1;
            } else {
                quoted = !quoted;
            }
        } else if (character === delimiter && !quoted) {
            fields.push(value);
            value = "";
        } else {
            value += character;
        }
    }
    fields.push(value);
    return fields;
};

const detectPriceListHeader = line => {
    for (const delimiter of [";", "\t"]) {
        const fields = parseDelimitedLine(line, delimiter);
        const columns = new Map(fields.map((value, index) => [headerKey(value), index]));
        if (columns.has("produktnummer") && columns.has("produktname") && columns.has("nettopreis")) {
            return { columns, delimiter };
        }
    }
    return null;
};

const localizedNumber = value => {
    let normalized = text(value).replace(/[\s\u00a0€']/g, "");
    if (!normalized) return null;
    if (normalized.includes(",")) normalized = normalized.replace(/\./g, "").replace(",", ".");
    normalized = normalized.replace(/[^0-9.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const parsePriceListArticle = (fields, columns, sourceFile) => {
    const field = name => fields[columns.get(name)];
    const sku = text(field("produktnummer"));
    if (!sku) return null;
    const currency = text(field("wahrung")).toUpperCase();
    const rawNetPrice = localizedNumber(field("nettopreis"));
    const priceUnit = localizedNumber(field("preiseinheit"));
    const packageQuantity = localizedNumber(field("packgrosse"));
    const netPrice = rawNetPrice !== null && rawNetPrice >= 0 && (!currency || currency === "EUR" || currency === "€")
        ? Math.round((rawNetPrice / Math.max(1, priceUnit || 1) * Math.max(1, packageQuantity || 1)) * 100) / 100
        : null;
    const baseUnit = text(field("mengeneinheit")) || null;
    return {
        sku,
        key: skuKey(sku),
        name: text(field("produktname")) || text(field("produkttext")) || sku,
        description: cleanDescription(field("produkttext")) || null,
        unit: packageQuantity
            ? `Packung (${packageQuantity} ${baseUnit || "Einheiten"})`
            : baseUnit,
        netPrice,
        imageUrl: null,
        sourceVersion: null,
        sourceFile,
        tierQuantity: Math.max(0, localizedNumber(field("staffelmenge")) || 0)
    };
};

const decode = buffer => {
    if (buffer.length === 0) return "";
    if (isUtf8(buffer)) return buffer.toString("utf8").replace(/^\uFEFF/, "");
    // Würth liefert seine aktuellen DATANORM-Dateien als Windows-1252 aus.
    // Der ASCII-kompatible Kopf kann vor der eigentlichen Dekodierung sicher
    // zur Herstellererkennung verwendet werden.
    if (/Adolf Wuerth/i.test(buffer.subarray(0, 512).toString("latin1"))) {
        return iconv.decode(buffer, "win1252");
    }
    // DATANORM 4/5 verwendet historisch den DOS/OEM-Zeichensatz CP850.
    return iconv.decode(buffer, "cp850");
};

const safeHttpUrl = value => {
    try {
        const url = new URL(text(value));
        return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
    } catch {
        return null;
    }
};

const priceInEuros = (rawPrice, rawUnit, version, quantity = 1) => {
    const cents = Number(text(rawPrice).replace(/[^0-9-]/g, ""));
    if (!Number.isFinite(cents) || cents < 0) return null;
    const unitCode = text(rawUnit);
    const divisor = Number(version) >= 5
        ? Math.max(1, Number(unitCode) || 1)
        : ({ "0": 1, "1": 10, "2": 100, "3": 1000 })[unitCode] || 1;
    return Math.round((cents / 100 / divisor * Math.max(1, Number(quantity) || 1)) * 100) / 100;
};

const parseArticle = (fields, version, isWuerthSource = false) => {
    const isV5 = Number(version) >= 5;
    const sku = text(fields[2]);
    if (!sku) return null;
    const wuerthParts = isWuerthSource ? wuerthSkuParts(sku) : null;
    const priceFlag = text(fields[isV5 ? 7 : 6]);
    const rawPrice = fields[isV5 ? 8 : 9];
    const rawPriceUnit = fields[isV5 ? 6 : 7];
    const normalizedPrice = priceInEuros(rawPrice, rawPriceUnit, version, wuerthParts?.packageQuantity);
    const baseUnit = text(fields[isV5 ? 5 : 8]) || null;
    return {
        sku,
        key: skuKey(sku),
        name: text(fields[isV5 ? 3 : 4]) || sku,
        description: cleanDescription(fields[isV5 ? 4 : 5]),
        unit: wuerthParts
            ? `Packung (${wuerthParts.packageQuantity} ${baseUnit || "Einheiten"})`
            : baseUnit,
        // Kennzeichen 2 ist der DATANORM-Nettopreis. Listenpreise werden nicht
        // stillschweigend als netto in den internen Shop geschrieben.
        netPrice: priceFlag === "2" ? normalizedPrice : null,
        listPrice: priceFlag === "1" ? normalizedPrice : null,
        discountGroup: text(fields[isV5 ? 9 : 10]),
        longTextKey: text(fields[isV5 ? 23 : 12]),
        imageUrl: fields.map(safeHttpUrl).find(Boolean) || null
    };
};

const parsePrice = (fields, version) => {
    const isV5 = Number(version) >= 5;
    const sku = text(fields[2]);
    const priceFlag = text(fields[isV5 ? 4 : 3]);
    return {
        key: skuKey(sku),
        netPrice: priceFlag === "2" ? priceInEuros(fields[isV5 ? 6 : 5], fields[isV5 ? 5 : 4], version) : null,
        listPrice: priceFlag === "1" ? priceInEuros(fields[isV5 ? 6 : 5], fields[isV5 ? 5 : 4], version) : null,
        discountGroup: text(fields[isV5 ? 7 : 6])
    };
};

const parseDiscount = fields => {
    if (text(fields[2]) !== "1") return null;
    const percentage = Number(text(fields[3]).replace(",", "."));
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) return null;
    return { group: text(fields[1]), percentage };
};

const parseTextRecord = fields => ({
    key: text(fields[2]),
    line: Number(fields[4] || fields[3]) || 0,
    value: cleanDescription(fields[5] || fields[4])
});

const collectInputFiles = async file => {
    const originalName = path.basename(file.originalname || "DATANORM.001");
    if (!/\.zip$/i.test(originalName) && file.mimetype !== "application/zip") {
        return [{ name: originalName, buffer: file.buffer }];
    }

    const archive = await unzipper.Open.buffer(file.buffer);
    if (archive.files.length > MAX_ARCHIVE_ENTRIES) throw new Error("Das DATANORM-Archiv enthält zu viele Dateien");
    const candidates = archive.files.filter(entry => {
        if (entry.type !== "File") return false;
        const name = path.basename(entry.path);
        return DATANORM_FILE.test(name) && !/^\./.test(name);
    });
    const size = candidates.reduce((sum, entry) => sum + Number(entry.uncompressedSize || 0), 0);
    if (size > MAX_UNCOMPRESSED_BYTES) throw new Error("Das entpackte DATANORM-Archiv ist zu groß");
    if (candidates.length === 0) throw new Error("Das ZIP-Archiv enthält keine DATANORM-Dateien");
    const extracted = [];
    let extractedSize = 0;
    for (const entry of candidates) {
        const chunks = [];
        for await (const chunk of entry.stream()) {
            extractedSize += chunk.length;
            if (extractedSize > MAX_UNCOMPRESSED_BYTES) throw new Error("Das entpackte DATANORM-Archiv ist zu groß");
            chunks.push(chunk);
        }
        extracted.push({ name: path.basename(entry.path), buffer: Buffer.concat(chunks) });
    }
    return extracted;
};

export const parseDatanormUploads = async uploads => {
    if (!Array.isArray(uploads) || uploads.length === 0) throw new Error("Keine DATANORM-Datei übergeben");
    const uploadSize = uploads.reduce((sum, file) => sum + Number(file?.buffer?.length || 0), 0);
    if (uploadSize > MAX_UPLOAD_BYTES) throw new Error("Der DATANORM-Upload ist insgesamt zu groß");
    const files = (await Promise.all(uploads.map(collectInputFiles))).flat();
    const articles = new Map();
    const longTexts = new Map();
    const prices = new Map();
    const discounts = new Map();
    let recordCount = 0;
    let detectedVersion = null;

    for (const source of files) {
        let version = null;
        let priceListHeader;
        const decodedSource = decode(source.buffer);
        const isWuerthSource = /Adolf Wuerth/i.test(decodedSource.slice(0, 512));
        for (const rawLine of decodedSource.split(/\r?\n/)) {
            const line = rawLine.replace(/\u001a/g, "").trim();
            if (!line) continue;
            recordCount += 1;
            if (recordCount > MAX_RECORDS) throw new Error("Der DATANORM-Import enthält zu viele Datensätze");
            if (priceListHeader === undefined) {
                priceListHeader = detectPriceListHeader(line);
                if (priceListHeader) continue;
            }
            if (priceListHeader) {
                const article = parsePriceListArticle(
                    parseDelimitedLine(line, priceListHeader.delimiter),
                    priceListHeader.columns,
                    source.name
                );
                if (!article?.key) continue;
                const existing = articles.get(article.key);
                if (!existing || article.tierQuantity < existing.tierQuantity) articles.set(article.key, article);
                continue;
            }
            const fixedHeader = line.match(/^V\s+.*?(\d{2})([A-Z]{3})$/i);
            if (fixedHeader) {
                version = Number(fixedHeader[1]) || null;
                detectedVersion = version || detectedVersion;
                continue;
            }
            const fields = line.split(";");
            const recordType = text(fields[0]).toUpperCase();
            if (recordType === "V") {
                version = Number(text(fields[1]).slice(0, 2)) || null;
                detectedVersion = version || detectedVersion;
                continue;
            }
            if (recordType === "T") {
                const value = parseTextRecord(fields);
                if (value.key && value.value) {
                    const values = longTexts.get(value.key) || [];
                    values.push(value);
                    longTexts.set(value.key, values);
                }
                continue;
            }
            if (recordType === "P") {
                const value = parsePrice(fields, version || detectedVersion || 4);
                if (value.key) prices.set(value.key, value);
                continue;
            }
            if (recordType === "R") {
                const value = parseDiscount(fields);
                if (value?.group) discounts.set(value.group, value.percentage);
                continue;
            }
            if (recordType !== "A") continue;
            const article = parseArticle(fields, version || detectedVersion || 4, isWuerthSource);
            if (!article?.key) continue;
            articles.set(article.key, {
                ...article,
                sourceVersion: String(version || detectedVersion || ""),
                sourceFile: source.name
            });
        }
    }

    const normalized = [...articles.values()].map(article => {
        const supplement = (longTexts.get(article.longTextKey) || [])
            .sort((left, right) => left.line - right.line)
            .map(item => item.value)
            .join(" ");
        const priceUpdate = prices.get(article.key);
        const discountGroup = priceUpdate?.discountGroup || article.discountGroup;
        const listPrice = priceUpdate?.listPrice ?? article.listPrice;
        const discount = discounts.get(discountGroup);
        const calculatedNetPrice = listPrice !== null && discount !== undefined
            ? Math.round(listPrice * (1 - discount / 100) * 100) / 100
            : null;
        const directNetPrice = priceUpdate?.netPrice ?? article.netPrice;
        return {
            sku: article.sku,
            name: article.name,
            description: cleanDescription([article.description, supplement].filter(Boolean).join(" ")) || null,
            unit: article.unit,
            netPrice: directNetPrice ?? calculatedNetPrice,
            imageUrl: article.imageUrl,
            sourceVersion: article.sourceVersion || null,
            sourceFile: article.sourceFile
        };
    });
    if (normalized.length === 0) throw new Error("In der Datei wurden keine DATANORM-Artikel gefunden");
    return {
        articles: normalized,
        version: detectedVersion ? String(detectedVersion) : null,
        files: files.map(item => item.name),
        records: recordCount
    };
};

export const parseDatanormUpload = file => parseDatanormUploads([file]);
