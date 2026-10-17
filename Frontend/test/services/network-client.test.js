import axios from "axios";
import { beforeAll, describe, expect, it } from "vitest";
import { installNetworkClient } from "../../src/shared/api/http-client.js";
import {
    getOfflineStatusSnapshot,
    setNetworkOnline
} from "../../src/shared/offline/offline-status.js";
import { shouldCacheApiResponse } from "../../src/shared/offline/offline-repository.js";

let responseInterceptor;

beforeAll(() => {
    installNetworkClient();
    responseInterceptor = axios.interceptors.response.handlers.at(-1);
});

describe("verlässlicher Offline-Netzwerkstatus", () => {
    it("wertet eine IndexedDB-Antwort nicht als wiederhergestellte Verbindung", async () => {
        setNetworkOnline(false);
        await responseInterceptor.fulfilled({
            data: { cached: true },
            config: { method: "post", url: "/api/test" },
            headers: { "x-offline-cache": "true" },
            request: { fromOfflineCache: true }
        });

        expect(getOfflineStatusSnapshot().online).toBe(false);
    });

    it("setzt den Status erst bei einer echten Serverantwort wieder auf online", async () => {
        setNetworkOnline(false);
        await responseInterceptor.fulfilled({
            data: { ok: true },
            config: { method: "post", url: "/api/test" },
            headers: {},
            request: {}
        });

        expect(getOfflineStatusSnapshot().online).toBe(true);
    });

    it("schaltet durch eine Cache-Validierung nicht von offline auf synchronisiert", async () => {
        setNetworkOnline(false);
        await responseInterceptor.fulfilled({
            data: { serverVersion: 4 },
            config: {
                method: "get",
                url: "/api/files/download/file-1",
                backgroundCacheValidation: true
            },
            headers: {},
            request: {}
        });

        expect(getOfflineStatusSnapshot().online).toBe(false);
    });

    it("zeigt fehlenden Offline-Inhalt als flüchtige Warnung", async () => {
        const url = "/api/test/not-cached";
        await expect(responseInterceptor.rejected({
            code: "ERR_NETWORK",
            config: { method: "get", url }
        })).rejects.toMatchObject({ code: "OFFLINE_RESOURCE_UNAVAILABLE" });

        const notice = getOfflineStatusSnapshot().notices.find(item => item.id === `offline-missing:${url}`);
        expect(getOfflineStatusSnapshot().online).toBe(false);
        expect(notice).toMatchObject({
            type: "warning",
            persistent: false,
            title: "Offline-Inhalt nicht verfügbar"
        });
    });

    it("speichert die letzte bestätigte Sitzung für einen Offline-Reload", async () => {
        await expect(shouldCacheApiResponse("/api/auth/me")).resolves.toBe(true);
    });
});
