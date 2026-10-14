import { afterEach, describe, expect, it, vi } from "vitest";
import { createUuid } from "../../src/services/uuid.js";

describe("HTTP-kompatible UUIDs", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("erzeugt auch ohne Web-Crypto eine gültige UUID v4", () => {
        vi.stubGlobal("crypto", undefined);

        const first = createUuid();
        const second = createUuid();

        expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(second).not.toBe(first);
    });
});
