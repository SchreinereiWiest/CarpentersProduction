import { describe, expect, it } from "vitest";
import { inferColumn, parseDelimitedText } from "../../src/features/onboarding/csvImport.js";

describe("Einrichtungs-CSV-Import", () => {
  it("liest deutsche Semikolon-CSV inklusive maskierter Anführungszeichen", () => {
    const result = parseDelimitedText('Kundennummer;Firma;Notiz\r\n1001;"Wiest; Möbel";"Sagt ""Hallo"""\r\n');
    expect(result.delimiter).toBe(";");
    expect(result.rows).toEqual([{ Kundennummer: "1001", Firma: "Wiest; Möbel", Notiz: 'Sagt "Hallo"' }]);
  });

  it("erkennt Komma-CSV und ordnet verbreitete Spaltennamen zu", () => {
    const result = parseDelimitedText("Artikelname,SKU,Preis\nTopfband,TB-01,4.95\n");
    expect(result.delimiter).toBe(",");
    expect(inferColumn(result.headers, ["name", "artikelname"])).toBe("Artikelname");
    expect(inferColumn(result.headers, ["artikelnummer", "sku"])).toBe("SKU");
  });
});
