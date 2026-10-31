import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ArticleCatalogView from "../../src/features/purchasing/articleCatalog.jsx";

const suppliers = [{ id: "supplier-1", name: "Häfele" }];
const entries = [
    { id: "linked", sku: "100", name: "Shopartikel", supplierId: "supplier-1", shopArticleId: "article-1" },
    { id: "manual", sku: "200", name: "Manuell", supplierId: null, shopArticleId: null }
];

describe("schlanker Artikelkatalog", () => {
    it("zeigt ausschließlich Artikelnummer, Bezeichnung und Lieferant als Datenspalten", () => {
        render(<ArticleCatalogView entries={entries} suppliers={suppliers} search="" canEdit={false} />);

        expect(screen.getAllByRole("columnheader").map(header => header.textContent)).toEqual([
            "Artikelnummer",
            "Bezeichnung",
            "Lieferant"
        ]);
        expect(screen.getByText("Häfele")).toBeInTheDocument();
        expect(screen.getByText("Ohne Lieferant")).toBeInTheDocument();
    });

    it("ändert Katalogdaten lokal und entfernt nur einen unverbundenen Eintrag", () => {
        const onChange = vi.fn();
        const onRemove = vi.fn();
        render(
            <ArticleCatalogView
                entries={entries}
                suppliers={suppliers}
                search=""
                canEdit
                onChange={onChange}
                onRemove={onRemove}
            />
        );

        fireEvent.change(screen.getByDisplayValue("100"), { target: { value: "101" } });
        expect(onChange).toHaveBeenCalledWith("linked", "sku", "101");

        expect(screen.getAllByRole("button", { name: /entfernen/i })).toHaveLength(1);
        fireEvent.click(screen.getByRole("button", { name: "Manuell entfernen" }));
        expect(onRemove).toHaveBeenCalledWith("manual");
    });
});

