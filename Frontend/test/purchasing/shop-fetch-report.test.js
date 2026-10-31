import { describe, expect, it } from "vitest";

import { formatShopFetchFailures } from "../../src/features/purchasing/shopFetchReport.js";

describe("Shop-Fetch-Fehlerbericht", () => {
    it("trennt Fehler nach Lieferant und Ursache", () => {
        const message = formatShopFetchFailures({
            results: [
                { supplierId: "haefele", ok: false, error: "Kein eindeutiger Artikel gefunden" },
                { supplierId: "haefele", ok: false, error: "Kein eindeutiger Artikel gefunden" },
                { supplierId: "wuerth", ok: false, error: "Artikelnummer ist im DATANORM-Import nicht enthalten" }
            ]
        }, [
            { id: "haefele", name: "Häfele" },
            { id: "wuerth", name: "Würth" }
        ]);

        expect(message).toContain("3 Artikel konnten nicht geladen werden");
        expect(message).toContain("Häfele: 2 × Kein eindeutiger Artikel gefunden");
        expect(message).toContain("Würth: 1 × Artikelnummer ist im DATANORM-Import nicht enthalten");
    });
});
