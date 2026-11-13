const encoder = new TextEncoder();

const CP1252 = new Map([
    [0x20AC, 0x80], [0x201A, 0x82], [0x0192, 0x83], [0x201E, 0x84], [0x2026, 0x85],
    [0x2020, 0x86], [0x2021, 0x87], [0x02C6, 0x88], [0x2030, 0x89], [0x0160, 0x8A],
    [0x2039, 0x8B], [0x0152, 0x8C], [0x017D, 0x8E], [0x2018, 0x91], [0x2019, 0x92],
    [0x201C, 0x93], [0x201D, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
    [0x02DC, 0x98], [0x2122, 0x99], [0x0161, 0x9A], [0x203A, 0x9B], [0x0153, 0x9C],
    [0x017E, 0x9E], [0x0178, 0x9F]
]);

export const encodeProgramText = (value, encoding = "utf-8") => {
    const text = String(value ?? "");
    if (!/^(windows-1252|cp1252)$/i.test(encoding)) return encoder.encode(text);
    return Uint8Array.from([...text].map(character => {
        const code = character.codePointAt(0);
        if (CP1252.has(code)) return CP1252.get(code);
        return code <= 0xFF ? code : 0x3F;
    }));
};

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
});

const crc32 = bytes => {
    let crc = 0xFFFFFFFF;
    bytes.forEach(byte => { crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8); });
    return (crc ^ 0xFFFFFFFF) >>> 0;
};

const write16 = (view, offset, value) => view.setUint16(offset, value, true);
const write32 = (view, offset, value) => view.setUint32(offset, value >>> 0, true);

const dosTime = date => ((date.getHours() & 0x1F) << 11) | ((date.getMinutes() & 0x3F) << 5) | (Math.floor(date.getSeconds() / 2) & 0x1F);
const dosDate = date => (((Math.max(1980, date.getFullYear()) - 1980) & 0x7F) << 9) | (((date.getMonth() + 1) & 0x0F) << 5) | (date.getDate() & 0x1F);

const localHeader = entry => {
    const bytes = new Uint8Array(30 + entry.name.length);
    const view = new DataView(bytes.buffer);
    write32(view, 0, 0x04034B50);
    write16(view, 4, 20);
    write16(view, 6, 0x0800);
    write16(view, 8, 0);
    write16(view, 10, entry.time);
    write16(view, 12, entry.date);
    write32(view, 14, entry.crc);
    write32(view, 18, entry.data.length);
    write32(view, 22, entry.data.length);
    write16(view, 26, entry.name.length);
    write16(view, 28, 0);
    bytes.set(entry.name, 30);
    return bytes;
};

const centralHeader = entry => {
    const bytes = new Uint8Array(46 + entry.name.length);
    const view = new DataView(bytes.buffer);
    write32(view, 0, 0x02014B50);
    write16(view, 4, 20);
    write16(view, 6, 20);
    write16(view, 8, 0x0800);
    write16(view, 10, 0);
    write16(view, 12, entry.time);
    write16(view, 14, entry.date);
    write32(view, 16, entry.crc);
    write32(view, 20, entry.data.length);
    write32(view, 24, entry.data.length);
    write16(view, 28, entry.name.length);
    write16(view, 30, 0);
    write16(view, 32, 0);
    write16(view, 34, 0);
    write16(view, 36, 0);
    write32(view, 38, 0);
    write32(view, 42, entry.offset);
    bytes.set(entry.name, 46);
    return bytes;
};

export const createZipArchive = files => {
    const now = new Date();
    let offset = 0;
    const entries = files.map(file => {
        const name = encoder.encode(String(file.name));
        const data = file.data instanceof Uint8Array ? file.data : encodeProgramText(file.data, file.encoding);
        const entry = { name, data, crc: crc32(data), time: dosTime(now), date: dosDate(now), offset };
        offset += 30 + name.length + data.length;
        return entry;
    });
    const localParts = entries.flatMap(entry => [localHeader(entry), entry.data]);
    const centralParts = entries.map(centralHeader);
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const view = new DataView(end.buffer);
    write32(view, 0, 0x06054B50);
    write16(view, 4, 0);
    write16(view, 6, 0);
    write16(view, 8, entries.length);
    write16(view, 10, entries.length);
    write32(view, 12, centralSize);
    write32(view, 16, offset);
    write16(view, 20, 0);
    return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
};
