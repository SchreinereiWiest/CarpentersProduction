import { beforeEach, describe, expect, it } from "vitest";

import {
    API_STORE_NAME,
    getCachedGlobalFile,
    openDb,
    setCachedGlobalFile
} from "../../src/shared/cache/indexed-db.js";
import { runCacheCleanup } from "../../src/shared/cache/cache-retention.js";
import {
    getCachedProjectAsset,
    getCachedProjectFile,
    setCachedProjectAsset,
    setCachedProjectFile
} from "../../src/shared/cache/project-indexed-db.js";
import {
    createApiCacheKey,
    getCachedApiResponse,
    registerOfflineProject
} from "../../src/shared/offline/offline-repository.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const oldTimestamp = () => Date.now() - 60 * DAY_MS;

const putOldApiEntry = async (url, data = {}) => {
    const db = await openDb();
    await new Promise((resolve, reject) => {
        const request = db.transaction(API_STORE_NAME, "readwrite")
            .objectStore(API_STORE_NAME)
            .put({
                key: createApiCacheKey(url),
                url,
                data,
                cachedAt: oldTimestamp(),
                lastAccessedAt: oldTimestamp()
            });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

describe("automatische Cache-Bereinigung", () => {
    let suffix;

    beforeEach(() => {
        suffix = `${Date.now()}-${Math.random()}`;
    });

    it("löscht lange ungenutzte automatische Datei- und API-Caches", async () => {
        const file = `automatic-old-${suffix}.json`;
        const projectId = `automatic-old-${suffix}`;
        const apiUrl = `/api/projects/get/${projectId}`;
        await setCachedGlobalFile({
            file,
            data: { old: true },
            lastAccessedAt: oldTimestamp()
        });
        await putOldApiEntry(apiUrl, { old: true });

        await runCacheCleanup({ force: true, retentionDays: 30 });

        await expect(getCachedGlobalFile({ file })).resolves.toBeNull();
        await expect(getCachedApiResponse(apiUrl)).resolves.toBeNull();
    });

    it("behält manuell heruntergeladene Projekte einschließlich ihrer Dateien", async () => {
        const projectId = `manual-${suffix}`;
        const fileId = `manual-asset-${suffix}`;
        await registerOfflineProject({ id: projectId, title: "Offline-Projekt", status: "active" });
        await setCachedProjectFile({
            projectId,
            file: "cabinet.json",
            data: { manual: true },
            syncStatus: "synced",
            lastAccessedAt: oldTimestamp()
        });
        await setCachedProjectAsset({
            projectId,
            file: { id: fileId, fileName: "drawing.dxf", mimeType: "application/dxf" },
            blob: new Blob(["drawing"]),
            lastAccessedAt: oldTimestamp()
        });

        await runCacheCleanup({ force: true, retentionDays: 30 });

        await expect(getCachedProjectFile({ projectId, file: "cabinet.json" }))
            .resolves.toMatchObject({ data: { manual: true } });
        await expect(getCachedProjectAsset(fileId))
            .resolves.toMatchObject({ projectId, fileName: "drawing.dxf" });
    });

    it("behält lokale Änderungen und ausdrücklich geschützte Downloads", async () => {
        const projectId = `pending-${suffix}`;
        const protectedFile = `protected-${suffix}.json`;
        await setCachedProjectFile({
            projectId,
            file: "list.json",
            data: { locallyChanged: true },
            syncStatus: "pending",
            lastAccessedAt: oldTimestamp()
        });
        await setCachedGlobalFile({
            file: protectedFile,
            data: { manuallyDownloaded: true },
            retentionProtected: true,
            lastAccessedAt: oldTimestamp()
        });

        await runCacheCleanup({ force: true, retentionDays: 30 });

        await expect(getCachedProjectFile({ projectId, file: "list.json" }))
            .resolves.toMatchObject({ syncStatus: "pending" });
        await expect(getCachedGlobalFile({ file: protectedFile }))
            .resolves.toMatchObject({ retentionProtected: true });
    });

    it("wertet einen Cache-Zugriff als erneute Verwendung", async () => {
        const file = `recently-used-${suffix}.json`;
        await setCachedGlobalFile({
            file,
            data: { used: true },
            lastAccessedAt: oldTimestamp()
        });

        await getCachedGlobalFile({ file });
        await runCacheCleanup({ force: true, retentionDays: 30 });

        await expect(getCachedGlobalFile({ file })).resolves.toMatchObject({ data: { used: true } });
    });
});
