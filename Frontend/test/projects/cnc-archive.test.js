import { describe, expect, it } from "vitest";

import { createZipArchive, encodeProgramText } from "../../src/features/projects/cnc/shared/cncArchive.js";

describe("CNC ZIP archive", () => {
    it("encodes Windows-1252 program text and writes a valid uncompressed ZIP", async () => {
        expect([...encodeProgramText("Ä €", "windows-1252")]).toEqual([0xC4, 0x20, 0x80]);

        const archive = createZipArchive([
            { name: "PART1.xxl", data: "H DX=100\r\n", encoding: "windows-1252" },
            { name: "PART2.xxl", data: "H DX=200\r\n", encoding: "windows-1252" }
        ]);
        const bytes = new Uint8Array(await archive.arrayBuffer());
        const view = new DataView(bytes.buffer);

        expect(view.getUint32(0, true)).toBe(0x04034B50);
        expect(new TextDecoder().decode(bytes)).toContain("PART1.xxl");
        expect(new TextDecoder().decode(bytes)).toContain("PART2.xxl");
        expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054B50);
        expect(view.getUint16(bytes.length - 12, true)).toBe(2);
    });
});
