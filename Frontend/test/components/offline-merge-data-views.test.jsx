import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
    MergeResultView,
    SpecializedDocumentConflict
} from "../../src/features/offline/OfflineMergeDataViews.jsx";

const part = overrides => ({
    _generatedId: "cabinet-1:part:1",
    Objektname: "Seite links",
    MID: "W1000",
    L: 720,
    B: 560,
    T: 19,
    Anzahl: 1,
    Kante: "ABS:::",
    Children: [],
    ...overrides
});

describe("fachliche Offline-Merge-Ansichten", () => {
    it("stellt Teilelisten feldweise gegenüber und erlaubt die Versionswahl", () => {
        const onChoice = vi.fn();
        render(
            <SpecializedDocumentConflict
                file="list.json"
                conflict={{
                    path: "Dokument",
                    local: [part({ B: 560 })],
                    remote: [part({ B: 600 })]
                }}
                choice="local"
                onChoice={onChoice}
            />
        );

        expect(screen.getByText("Seite links")).toBeInTheDocument();
        expect(screen.getByText("1 abweichende von 1 Positionen")).toBeInTheDocument();
        expect(screen.getAllByText("Breite")).toHaveLength(2);

        fireEvent.click(screen.getByRole("radio", { name: /Teileliste vom Server übernehmen/ }));
        expect(onChoice).toHaveBeenCalledWith("server");
    });

    it("zeigt Nesting-Platten als grafische Vorschau statt als JSON", () => {
        const data = [{
            MID: "W1000",
            T: 19,
            plates: [{ id: 1 }],
            settings: { nestingMode: "2d", defaultSheet: { width: 2800, height: 2070 } },
            nestingPlates: [{
                id: 0,
                placedWidth: 2800,
                placedHeight: 2070,
                plates: [{ id: 1, x: 10, y: 10, placedWidth: 560, placedHeight: 720, color: "#2563eb" }]
            }]
        }];

        render(<MergeResultView file="nesting.json" data={data} />);

        expect(screen.getByText("W1000 · 19 mm")).toBeInTheDocument();
        expect(screen.getByText(/Platte 1/)).toBeInTheDocument();
        expect(screen.getByRole("img", { name: "Nesting-Platte 1" })).toBeInTheDocument();
        expect(screen.queryByText(/nestingPlates/)).not.toBeInTheDocument();
    });
});
