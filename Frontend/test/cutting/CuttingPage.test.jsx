import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const plate = {
    id: "part-1",
    originalWidth: 240,
    originalHeight: 120,
    width: 260,
    height: 140,
    color: "#60a5fa",
    original: {
        PID: "000042",
        Objektname: "Seite",
        L: 240,
        B: 120,
        T: 19,
        CNC: { operations: [] }
    }
};

const strip = {
    id: "strip-1",
    packingMode: "1d",
    layoutType: "vertical",
    plates: [plate]
};

const nesting = [{
    MID: "W980",
    T: 19,
    settings: { gap: 20, cutGap: 4 },
    strips: [strip]
}];

vi.mock("react-router", () => ({ useParams: () => ({ projectId: "project-1" }) }));
vi.mock("../../src/shared/components/sideBar.jsx", () => ({ default: () => null }));
vi.mock("../../src/shared/components/projectBar.jsx", () => ({ default: () => null }));
vi.mock("../../src/shared/components/MobileWorkspaceGuard.jsx", () => ({ default: () => null }));
vi.mock("../../src/shared/cache/project-cache.js", () => ({
    getProjectFile: vi.fn(async () => nesting),
    uploadProjectFile: vi.fn()
}));
vi.mock("../../src/shared/cache/global-cache.js", () => ({
    getGlobalFile: vi.fn(async () => ({ eticket: { enabled: true } }))
}));
vi.mock("../../src/shared/api/file-api.js", () => ({
    downloadFile: vi.fn(),
    uploadJSONFile: vi.fn()
}));
vi.mock("../../src/shared/projects/project-records.js", () => ({
    getProjectRecord: vi.fn(async () => ({
        id: "project-1",
        title: "Empfang",
        customer: { companyName: "Muster GmbH" }
    }))
}));
vi.mock("axios", () => ({
    default: {
        get: vi.fn(async url => url === "/api/materials/get"
            ? { data: { materials: [] } }
            : { data: { enabled: true, printerConfigured: true } })
    }
}));
vi.mock("../../src/features/projects/cutting/cutScene.jsx", () => ({
    default: ({ onSelectPart }) => (
        <button
            type="button"
            onClick={() => onSelectPart({
                key: "strip-1-part-1-0",
                stripId: "strip-1",
                stripOriginalIndex: 0,
                plate,
                width: 240,
                height: 120
            })}
        >
            Bauteil in Grafik auswählen
        </button>
    )
}));
vi.mock("../../src/features/projects/nesting/EticketPrintDialog.jsx", () => ({
    default: ({ ticket }) => <div role="dialog">Eticket-Dialog PID {ticket.pid} · {ticket.productionPath}</div>
}));

import CuttingPage from "../../src/features/projects/cutting/CuttingPage.jsx";

describe("Cutting-Eticket", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("öffnet den Eticket-Dialog für das unter Bauteile im Strip ausgewählte Einzelteil", async () => {
        render(<CuttingPage />);

        fireEvent.click(await screen.findByRole("button", { name: "Bauteil in Grafik auswählen" }));
        const stripPanel = screen.getByText("Bauteile im Strip").parentElement;
        const printButton = await within(stripPanel).findByRole("button", { name: "Eticket drucken" });
        fireEvent.click(printButton);

        expect(screen.getByRole("dialog")).toHaveTextContent("Eticket-Dialog PID 000042 · 1d");
    });

    it("zeigt das Außenmaß des im Stapel ausgewählten Strips", async () => {
        render(<CuttingPage />);

        expect(await screen.findByText("Strip-Außenmaße 260 × 140 mm")).toBeInTheDocument();
    });
});
