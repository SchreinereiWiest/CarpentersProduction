import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    get: vi.fn(),
    put: vi.fn(),
    getProjectFile: vi.fn(),
    uploadProjectFile: vi.fn(),
    loadCadFile: vi.fn()
}));

vi.mock("axios", () => ({
    default: {
        get: mocks.get,
        put: mocks.put
    }
}));

vi.mock("../../src/shared/components/sideBar.jsx", () => ({
    default: () => <div>Sidebar</div>
}));

vi.mock("../../src/shared/components/projectBar.jsx", () => ({
    default: () => <div>Projektleiste</div>
}));

vi.mock("../../src/features/projects/measurement/import/cadLoader.js", () => ({
    loadCadFile: mocks.loadCadFile
}));

vi.mock("../../src/features/projects/part-list/createPDF.js", () => ({
    createPartsListPDF: vi.fn()
}));

vi.mock("../../src/shared/cache/project-cache.js", () => ({
    getProjectFile: mocks.getProjectFile,
    uploadProjectFile: mocks.uploadProjectFile
}));

vi.mock("../../src/shared/api/file-api.js", () => ({
    downloadFile: vi.fn(),
    uploadJSONFile: vi.fn()
}));

import PartListPage from "../../src/features/projects/part-list/PartListPage.jsx";

describe("Notizen in der Teileliste", () => {
    beforeEach(() => {
        mocks.get.mockResolvedValue({
            data: {
                project: {
                    id: "project-1",
                    customerId: "customer-1",
                    title: "Küche",
                    description: "",
                    status: "active",
                    internalNotes: "Bestehende Notiz",
                    files: [{
                        fileName: "Planung.json",
                        mimeType: "application/json"
                    }]
                }
            }
        });
        mocks.put.mockResolvedValue({
            data: {
                id: "project-1",
                customerId: "customer-1",
                title: "Küche",
                description: "",
                status: "active",
                internalNotes: "Neue Notiz"
            }
        });
        mocks.getProjectFile.mockResolvedValue([
            { PID: "cabinet-1", Objektname: "Schrank", Children: [{ PID: "part-1" }] }
        ]);
        mocks.loadCadFile.mockResolvedValue([]);
        mocks.uploadProjectFile.mockResolvedValue({ data: [] });
    });

    it("speichert die Notiz über Update und baut die Liste bei jedem Klick neu", async () => {
        render(
            <MemoryRouter initialEntries={["/projects/list/project-1"]}>
                <Routes>
                    <Route path="/projects/list/:projectId" element={<PartListPage />} />
                </Routes>
            </MemoryRouter>
        );

        const notes = await screen.findByRole("textbox", { name: "Notizen" });
        await waitFor(() => expect(notes).toHaveValue("Bestehende Notiz"));

        fireEvent.change(notes, { target: { value: "Neue Notiz" } });
        fireEvent.click(screen.getByRole("button", { name: "Update" }));

        await waitFor(() => expect(mocks.put).toHaveBeenCalledWith(
            "/api/projects/update/project-1",
            expect.objectContaining({ internalNotes: "Neue Notiz" })
        ));
        await waitFor(() => expect(mocks.uploadProjectFile).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByRole("button", { name: "Update" }));
        await waitFor(() => expect(mocks.uploadProjectFile).toHaveBeenCalledTimes(2));
    });
});
