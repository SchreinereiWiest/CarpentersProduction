import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import EstimationSettingsPanel from "../../src/features/company-settings/panels/estimationSettingsPanel.jsx";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock("../../src/shared/settings/company-settings.js", async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadCompanySettings: vi.fn(() => Promise.resolve(actual.normalizeCompanySettings({})))
  };
});

vi.mock("../../src/shared/cache/global-cache.js", () => ({ uploadGlobalFile: vi.fn() }));
vi.mock("../../src/shared/api/file-api.js", () => ({ uploadJSONFile: vi.fn() }));

describe("estimation settings manual post-calculation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: { snapshots: [] } });
  });

  it("captures a manual comparison record for the hour estimator", async () => {
    axios.post.mockImplementation(async (_url, payload) => ({
      data: {
        snapshot: {
          id: "manual-1",
          source: "manual",
          releasedAt: "2026-11-01T12:00:00.000Z",
          releasedBy: "Admin",
          projectTitle: payload.projectTitle,
          projectNumber: null,
          projectType: payload.projectType,
          description: payload.description,
          cabinetCount: payload.cabinetCount,
          complexity: payload.complexity,
          volume: payload.volume,
          materialCost: payload.materialCost,
          plannedHours: payload.plannedHours,
          actualHours: 12,
          varianceHours: 12,
          cabinetSummary: {},
          listSummary: {},
          actual: { costCenters: payload.costCenters },
          objectReferences: {}
        }
      }
    }));

    render(<EstimationSettingsPanel />);
    await screen.findByRole("heading", { name: "Stundenschätzung" });
    fireEvent.click(screen.getByRole("button", { name: "+ Nachkalkulation erfassen" }));
    const form = screen.getByRole("heading", { name: "Manuelle Nachkalkulation erfassen" }).closest("form");
    const fields = within(form);
    fireEvent.change(fields.getByLabelText("Projektbezeichnung"), { target: { value: "Historischer Empfang" } });
    fireEvent.change(fields.getByLabelText("Projektart"), { target: { value: "Einbaumöbel" } });
    fireEvent.change(fields.getByLabelText("Kostenstelle"), { target: { value: "Werkstatt" } });
    fireEvent.change(fields.getByLabelText("Iststunden"), { target: { value: "12" } });
    fireEvent.click(fields.getByRole("button", { name: "Nachkalkulation übernehmen" }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      "/api/settings/calculation-snapshots/manual",
      expect.objectContaining({
        projectTitle: "Historischer Empfang",
        projectType: "Einbaumöbel",
        costCenters: [expect.objectContaining({ name: "Werkstatt", hours: 12 })]
      })
    ));
    expect(await screen.findByText("Manuelle Nachkalkulation wurde in die Stundenschätzung übernommen.")).toBeInTheDocument();
  });

  it("accepts cabinet outer dimensions as the alternative structure input", async () => {
    axios.post.mockResolvedValue({
      data: {
        snapshot: {
          id: "manual-dimensions",
          source: "manual",
          releasedAt: "2026-11-01T12:00:00.000Z",
          projectTitle: "Maßkorpusse",
          plannedHours: 0,
          actualHours: 8,
          cabinetCount: 2,
          complexity: 2,
          volume: 1.2,
          materialCost: 0,
          varianceHours: 8,
          cabinetSummary: { entryMode: "dimensions", cabinetDimensions: [] },
          listSummary: {},
          actual: { costCenters: [] },
          objectReferences: {}
        }
      }
    });

    render(<EstimationSettingsPanel />);
    await screen.findByRole("heading", { name: "Stundenschätzung" });
    fireEvent.click(screen.getByRole("button", { name: "+ Nachkalkulation erfassen" }));
    const form = screen.getByRole("heading", { name: "Manuelle Nachkalkulation erfassen" }).closest("form");
    const fields = within(form);
    fireEvent.change(fields.getByLabelText("Projektbezeichnung"), { target: { value: "Maßkorpusse" } });
    fireEvent.change(fields.getByLabelText("Kostenstelle"), { target: { value: "Werkstatt" } });
    fireEvent.change(fields.getByLabelText("Iststunden"), { target: { value: "8" } });
    fireEvent.click(fields.getByRole("tab", { name: "Korpus-Außenmaße" }));
    fireEvent.change(fields.getByLabelText("Korpustyp 1"), { target: { value: "Hochschrank" } });
    fireEvent.change(fields.getByLabelText("Stück"), { target: { value: "2" } });
    fireEvent.change(fields.getByLabelText(/^Breite/), { target: { value: "600" } });
    fireEvent.change(fields.getByLabelText(/^Höhe/), { target: { value: "2000" } });
    fireEvent.change(fields.getByLabelText(/^Tiefe/), { target: { value: "500" } });
    fireEvent.click(fields.getByRole("button", { name: "Nachkalkulation übernehmen" }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      "/api/settings/calculation-snapshots/manual",
      expect.objectContaining({
        structureMode: "dimensions",
        cabinetDimensions: [expect.objectContaining({
          type: "Hochschrank",
          quantity: 2,
          width: 600,
          height: 2000,
          depth: 500
        })]
      })
    ));
  });
});
