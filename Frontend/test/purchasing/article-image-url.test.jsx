import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArticleModal, GroupModal, ShopArticle, ShopGroup } from "../../src/features/purchasing/shopComponents.jsx";

const article = {
    id: "5cebc75d-1d36-4c08-88f8-6afaf4e54723",
    name: "Topfscharnier",
    sku: "TS-1",
    category: "Beschläge",
    description: "",
    unit: "Stk.",
    netPrice: 4.5,
    groupId: null,
    supplierId: null,
    imageFileId: "d4398dc1-4751-47d9-bf9c-e8fa69936aad",
    imageUrl: ""
};

describe("article image link", () => {
    it("previews and saves an HTTPS image link instead of the uploaded image", async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(
            <ArticleModal
                article={article}
                groups={[]}
                imageUrl="https://files.example.test/old-image.jpg"
                onClose={() => {}}
                onSave={onSave}
            />
        );

        const imageLink = "https://shop.example.test/images/topfscharnier.webp";
        fireEvent.change(screen.getByRole("textbox", { name: "Bild-Link" }), {
            target: { value: imageLink }
        });

        expect(screen.getByAltText("Artikelvorschau")).toHaveAttribute("src", imageLink);
        fireEvent.click(screen.getByRole("button", { name: "Artikel übernehmen" }));

        await waitFor(() => expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ imageUrl: imageLink, imageFileId: null }),
            null
        ));
    });
});

describe("article edit actions", () => {
    it("offers the article for duplication in edit mode", () => {
        const onDuplicate = vi.fn();
        render(
            <ShopArticle
                article={article}
                supplierName="Beschlaghandel"
                projectId="project-1"
                editMode
                adding={false}
                onAdd={() => {}}
                onEdit={() => {}}
                onDuplicate={onDuplicate}
                onDelete={() => {}}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Topfscharnier duplizieren" }));

        expect(onDuplicate).toHaveBeenCalledWith(article);
    });

    it("uses a horizontal card in list view", () => {
        const { container } = render(
            <ShopArticle
                article={article}
                projectId="project-1"
                editMode={false}
                listView
                adding={false}
                onAdd={() => {}}
            />
        );

        expect(container.querySelector("article")).toHaveClass("sm:flex-row");
    });
});

describe("article categories", () => {
    it("normalizes comma-separated categories when saving", async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(
            <ArticleModal
                article={article}
                groups={[]}
                onClose={() => {}}
                onSave={onSave}
            />
        );

        fireEvent.change(screen.getByRole("textbox", { name: /^Kategorien/ }), {
            target: { value: " Küche, Hänger, küche, " }
        });
        fireEvent.click(screen.getByRole("button", { name: "Artikel übernehmen" }));

        await waitFor(() => expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ category: "Küche, Hänger" }),
            null
        ));
    });

    it("shows every assigned category as its own tag", () => {
        render(
            <ShopArticle
                article={{ ...article, category: "Küche, Hänger" }}
                projectId="project-1"
                editMode={false}
                adding={false}
                onAdd={() => {}}
            />
        );

        expect(screen.getByText("Küche")).toBeInTheDocument();
        expect(screen.getByText("Hänger")).toBeInTheDocument();
    });
});

describe("article group image link", () => {
    const group = {
        id: "b28545c7-01e4-4941-8a8b-e08fc59d957f",
        name: "Hängeschränke",
        description: "Varianten für die Küche",
        imageUrl: ""
    };

    it("previews and saves the image link", () => {
        const onSave = vi.fn();
        render(
            <GroupModal
                group={group}
                articles={[]}
                onClose={() => {}}
                onSave={onSave}
            />
        );

        const imageLink = "https://shop.example.test/images/haengeschraenke.webp";
        fireEvent.change(screen.getByRole("textbox", { name: "Gruppenbild-Link" }), {
            target: { value: imageLink }
        });

        expect(screen.getByAltText("Gruppenvorschau")).toHaveAttribute("src", imageLink);
        fireEvent.click(screen.getByRole("button", { name: "Gruppe übernehmen" }));

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ imageUrl: imageLink }),
            expect.any(Set)
        );
    });

    it("displays the image on the group card", () => {
        const imageLink = "https://shop.example.test/images/haengeschraenke.webp";
        render(
            <ShopGroup
                group={{ ...group, imageUrl: imageLink }}
                articleCount={2}
                editMode={false}
                onOpen={() => {}}
            />
        );

        expect(screen.getByAltText("Gruppenbild Hängeschränke")).toHaveAttribute("src", imageLink);
    });
});
