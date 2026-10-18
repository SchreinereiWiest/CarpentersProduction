import { beforeEach, describe, expect, it } from "vitest";
import {
    clearAufmasWorkspaceCache,
    getAufmasWorkspaceCache,
    setAufmasWorkspaceCache
} from "../../src/features/projects/measurement/state/workspaceCache.js";

describe("Aufmaß workspace cache", () => {
    beforeEach(() => clearAufmasWorkspaceCache());

    it("keeps rendered PDF pages and parsed DXF layers available across navigation", () => {
        const pdfPages = { "pdf-1:1": { dataUrl: "data:image/png;base64,test" } };
        const dxfLayers = { front: { shapes: [{ type: "line" }] } };
        setAufmasWorkspaceCache("project-1", { pdfPages, dxfLayers, objects: [{ id: "measure-1" }] });

        const cached = getAufmasWorkspaceCache("project-1");
        expect(cached.pdfPages).toBe(pdfPages);
        expect(cached.dxfLayers).toBe(dxfLayers);
        expect(cached.objects).toEqual([{ id: "measure-1" }]);
    });
});
