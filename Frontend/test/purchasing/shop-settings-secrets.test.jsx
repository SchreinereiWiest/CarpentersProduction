import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ShopSettingsPanel from "../../src/features/company-settings/panels/shopSettingsPanel.jsx";
import {
    loadShopSettings,
    saveShopSettings,
    uploadSupplierDatanorm
} from "../../src/features/purchasing/procurementApi.js";

vi.mock("../../src/features/purchasing/procurementApi.js", () => ({
    loadProcurementCatalog: vi.fn(),
    loadShopSettings: vi.fn(),
    saveShopSettings: vi.fn(),
    uploadSupplierDatanorm: vi.fn()
}));

const supplierId = "5cebc75d-1d36-4c08-88f8-6afaf4e54723";
const settings = {
    version: 1,
    edgeWastePercentage: 10,
    suppliers: [{
        id: supplierId,
        name: "Würth",
        externalId: "",
        procurementType: "datanorm",
        datanormArticleCount: 128
    }],
    legraboxArticleIds: {}
};

describe("DATANORM-Lieferantendaten", () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const api = await import("../../src/features/purchasing/procurementApi.js");
        api.loadProcurementCatalog.mockResolvedValue({ version: 1, articles: [], groups: [] });
        loadShopSettings.mockResolvedValue(settings);
        saveShopSettings.mockResolvedValue(settings);
        uploadSupplierDatanorm.mockResolvedValue({ imported: 1 });
    });

    it("zeigt den Importstatus und lädt die gewählte Datei beim Speichern hoch", async () => {
        render(<ShopSettingsPanel />);

        expect(await screen.findByText("128 Artikel importiert")).toBeInTheDocument();
        const file = new File(["V;050;A"], "DATANORM.001", { type: "text/plain" });
        fireEvent.change(screen.getByLabelText("DATANORM-Datei"), { target: { files: [file] } });
        fireEvent.click(screen.getByRole("button", { name: "Einstellungen speichern" }));

        await waitFor(() => expect(uploadSupplierDatanorm).toHaveBeenCalledWith(supplierId, [file]));
    });
});

