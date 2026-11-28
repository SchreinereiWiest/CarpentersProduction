import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("axios", () => ({ default: { get: mocks.get } }));

import { loadCustomerCommercial } from "../src/features/commercial/commercialApi.js";

beforeEach(() => mocks.get.mockReset());

it("liefert die übrigen Kundendaten weiter, wenn nur ein Commercial-Endpunkt fehlschlägt", async () => {
  mocks.get
    .mockResolvedValueOnce({ data: { commissions: [{ id: "commission-1" }] } })
    .mockRejectedValueOnce(new Error("documents unavailable"));

  const result = await loadCustomerCommercial("customer-1");

  expect(result.commissions).toEqual([{ id: "commission-1" }]);
  expect(result.documents).toEqual([]);
  expect(result.loadErrors).toHaveLength(1);
});
