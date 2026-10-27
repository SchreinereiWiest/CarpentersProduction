import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArticleArchiveModal } from "../../src/features/purchasing/purchasingExtensions.jsx";

const articles = Array.from({ length: 15 }, (_, index) => ({
    id: `article-${index + 1}`,
    name: `Artikel ${String(index + 1).padStart(2, "0")}`,
    sku: `SKU-${index + 1}`,
    category: index % 2 ? "Beschläge" : "Verbrauchsmaterial",
    supplierId: "supplier-1",
    unit: "Stk."
}));

describe("archive article selection", () => {
    it("searches inside the dropdown and limits suggestions to ten", () => {
        render(
            <ArticleArchiveModal
                articles={articles}
                suppliers={[{ id: "supplier-1", name: "Lieferant" }]}
                onClose={vi.fn()}
                onSave={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Artikelvorschläge öffnen" }));
        expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(10);

        fireEvent.change(screen.getByRole("combobox", { name: "Shop-Artikel" }), {
            target: { value: "SKU-14" }
        });

        expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(1);
        expect(within(screen.getByRole("listbox")).getByRole("option")).toHaveTextContent("Artikel 14");
    });
});
