import { beforeEach, describe, expect, it, vi } from "vitest";
import { purchasingMaterialCost } from "../../../Engine/calculation/calculation.mjs";

const mocks = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  getProjectFile: vi.fn(),
  loadShopSettings: vi.fn(),
  loadProcurementCatalog: vi.fn(),
  savedProcurement: null
}));

vi.mock("axios", () => ({ default: { get: mocks.axiosGet } }));
vi.mock("../../src/services/apiTemplates.js", () => ({
  downloadFile: vi.fn(),
  uploadJSONFile: vi.fn()
}));
vi.mock("../../src/services/projectMemoryCache.js", () => ({
  getProjectFile: mocks.getProjectFile,
  uploadProjectFile: vi.fn()
}));
vi.mock("../../src/pages/purchasing/procurementApi.js", () => ({
  loadShopSettings: mocks.loadShopSettings,
  loadProcurementCatalog: mocks.loadProcurementCatalog
}));

import { loadCalculationWorkspace } from "../../src/pages/projects/calculation/calculationApi.js";

const nesting = [{
  MID: "W1000",
  T: 19,
  nestingPlates: [
    { placedWidth: 2800, placedHeight: 2070, strips: [{}] },
    { placedWidth: 2800, placedHeight: 2070, strips: [{}] }
  ]
}];

describe("calculation procurement integration", () => {
  beforeEach(() => {
    mocks.savedProcurement = { version: 1, items: [] };
    mocks.axiosGet.mockImplementation(async path => {
      if (path === "/api/projects/get/project-1") return { data: { project: { id: "project-1" } } };
      if (path === "/api/projects/calculation-context/project-1") return { data: {} };
      if (path === "/api/materials/get") return { data: { materials: [{
        materialNumber: "W1000",
        thickness: 19,
        width: 2800,
        height: 2070,
        pricePerSquareMeter: 10
      }] } };
      throw new Error(`Unexpected request: ${path}`);
    });
    mocks.getProjectFile.mockImplementation(async ({ file }) => {
      if (file === "nesting.json") return nesting;
      if (file === "list.json" || file === "cabinet.json") return [];
      if (file === "procurement.json") return mocks.savedProcurement;
      if (file === "calculation.json") return null;
      throw new Error(`Unexpected project file: ${file}`);
    });
    mocks.loadShopSettings.mockResolvedValue(null);
    mocks.loadProcurementCatalog.mockResolvedValue({ version: 1, articles: [] });
  });

  it("calculates material costs from live, unreleased procurement sources", async () => {
    const workspace = await loadCalculationWorkspace("project-1");

    expect(workspace.procurement.items[0]).toMatchObject({
      quantity: 2,
      netPrice: 57.96,
      released: false
    });
    expect(purchasingMaterialCost(workspace.procurement)).toBe(115.92);
  });

  it("keeps the released price and quantity despite changed source prices", async () => {
    mocks.savedProcurement = { version: 1, items: [{
      sourceKey: "nesting:w1000:19:2800:2070",
      source: "nesting",
      quantity: 1,
      netPrice: 40,
      released: true,
      purchased: false
    }] };

    const workspace = await loadCalculationWorkspace("project-1");

    expect(workspace.procurement.items[0]).toMatchObject({
      quantity: 1,
      netPrice: 40,
      released: true
    });
    expect(purchasingMaterialCost(workspace.procurement)).toBe(40);
  });
});
