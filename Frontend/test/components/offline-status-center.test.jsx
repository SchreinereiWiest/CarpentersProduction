import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OfflineStatusCenter from "../../src/shared/components/offline/OfflineStatusCenter.jsx";
import { setCachedProjectFile } from "../../src/shared/cache/project-indexed-db.js";
import { redownloadCachedS3Files } from "../../src/shared/cache/cache-refresh.js";
import {
    beginNetworkRequest,
    endNetworkRequest,
    getOfflineStatusSnapshot,
    setNetworkOnline
} from "../../src/shared/offline/offline-status.js";

vi.mock("../../src/shared/cache/cache-refresh.js", async importOriginal => {
    const original = await importOriginal();
    return {
        ...original,
        redownloadCachedS3Files: vi.fn()
    };
});

function MergeTarget() {
    const { conflictKey } = useParams();
    return <div>Merge {decodeURIComponent(conflictKey)}</div>;
}

describe("OfflineStatusCenter", () => {
    beforeEach(async () => {
        redownloadCachedS3Files.mockReset();
        while (getOfflineStatusSnapshot().activeRequests.length > 0) {
            endNetworkRequest();
        }
        setNetworkOnline(true);
        await setCachedProjectFile({
            projectId: "000-first-conflict",
            file: "cabinet.json",
            data: { local: true },
            syncStatus: "conflict",
            remoteData: { remote: true }
        });
        await setCachedProjectFile({
            projectId: "001-second-conflict",
            file: "list.json",
            data: { local: true },
            syncStatus: "conflict",
            remoteData: { remote: true }
        });
    });

    it("öffnet bei mehreren Konflikten den ersten statt den Cache zu aktualisieren", async () => {
        render(
            <MemoryRouter initialEntries={["/"]}>
                <OfflineStatusCenter />
                <Routes>
                    <Route path="/Offline/Merge/:conflictKey" element={<MergeTarget />} />
                </Routes>
            </MemoryRouter>
        );

        const button = await screen.findByRole("button", {
            name: "Ersten Synchronisierungskonflikt öffnen"
        });
        await waitFor(() => expect(button).toHaveTextContent("2 Konflikte"));
        fireEvent.click(button);

        expect(await screen.findByText("Merge project:000-first-conflict:cabinet.json")).toBeInTheDocument();
        expect(redownloadCachedS3Files).not.toHaveBeenCalled();
    });

    it("zeigt aktive Uploads und Downloads im Modal ohne signierte URL-Parameter", async () => {
        let uploadId;
        let downloadId;
        act(() => {
            uploadId = beginNetworkRequest({
                method: "put",
                url: "https://storage.example/project/list.json?X-Amz-Signature=secret"
            });
            downloadId = beginNetworkRequest({
                method: "get",
                url: "/api/projects/generated/project-1/list?version=4"
            });
        });

        render(
            <MemoryRouter>
                <OfflineStatusCenter />
            </MemoryRouter>
        );

        const statusButton = await screen.findByRole("button", {
            name: "Aktive Datenübertragungen anzeigen"
        });
        expect(statusButton).toHaveTextContent("Browserantwort wird erwartet");
        fireEvent.click(statusButton);

        const dialog = screen.getByRole("dialog", { name: "Aktive Datenübertragungen" });
        expect(dialog).toHaveTextContent("Hochladen");
        expect(dialog).toHaveTextContent("Herunterladen");
        expect(dialog).toHaveTextContent("Teileliste");
        expect(dialog).toHaveTextContent("/project/list.json");
        expect(dialog).not.toHaveTextContent("secret");
        expect(dialog).not.toHaveTextContent("X-Amz-Signature");

        act(() => {
            endNetworkRequest(uploadId);
            endNetworkRequest(downloadId);
        });
        expect(dialog).toHaveTextContent("Alle Datenübertragungen sind abgeschlossen.");
    });
});
