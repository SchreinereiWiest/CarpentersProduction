import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ShopFetchSelectionModal from "../../src/features/purchasing/shopFetchSelectionModal.jsx";

const suppliers = [
    { id: "supplier-1", name: "Häfele", procurementType: "av-firefox-extension" },
    { id: "supplier-2", name: "Würth", procurementType: "datanorm" },
    { id: "supplier-3", name: "Ohne Abruf", procurementType: null }
];
const entries = [
    { id: "entry-1", supplierId: "supplier-1", shopArticleId: "article-1", sku: "100", name: "Band" },
    { id: "entry-2", supplierId: "supplier-2", shopArticleId: "article-2", sku: "200", name: "Schraube" },
    { id: "entry-3", supplierId: "supplier-3", shopArticleId: null, sku: "300", name: "Ohne Abruf" }
];

describe("Shop-Fetch-Auswahl", () => {
    it("filtert nach Fetch-Lieferanten und kann eine Artikelgruppe abwählen", () => {
        const onStart = vi.fn();
        render(
            <ShopFetchSelectionModal
                entries={entries}
                suppliers={suppliers}
                articles={[
                    { id: "article-1", groupId: "group-1" },
                    { id: "article-2", groupId: "group-1" }
                ]}
                groups={[{ id: "group-1", name: "Beschläge" }]}
                onClose={vi.fn()}
                onStart={onStart}
            />
        );

        expect(screen.queryByText("Ohne Abruf", { selector: "strong" })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Beschläge · 2" }));
        expect(screen.getByRole("button", { name: /Artikel fetchen/ })).toBeDisabled();
        fireEvent.click(screen.getByRole("button", { name: "Alle Artikel" }));
        fireEvent.click(screen.getByRole("button", { name: "2 Artikel fetchen" }));

        expect(onStart).toHaveBeenCalledWith({
            supplierIds: ["supplier-1", "supplier-2"],
            entryIds: ["entry-1", "entry-2"]
        });
    });
});
