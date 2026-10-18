import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OfflineStatusCenter from "../../src/shared/components/offline/OfflineStatusCenter.jsx";
import { setCachedProjectFile } from "../../src/shared/cache/project-indexed-db.js";
import { redownloadCachedS3Files } from "../../src/shared/cache/cache-refresh.js";

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
});
