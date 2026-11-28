import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

const mocks = vi.hoisted(() => ({ upload: vi.fn() }));

vi.mock("axios", () => ({ default: { post: vi.fn() } }));
vi.mock("../../src/shared/cache/global-cache.js", () => ({ uploadGlobalFile: mocks.upload }));
vi.mock("../../src/shared/api/file-api.js", () => ({ uploadJSONFile: vi.fn() }));
vi.mock("../../src/shared/settings/company-settings.js", async importOriginal => {
  const actual = await importOriginal();
  const settings = actual.normalizeCompanySettings({
    specialWorkRules: [{
      id: "alternate-friday",
      label: "Jeder zweite Freitag frei",
      enabled: true,
      kind: "recurring-day-off",
      weekday: 5,
      intervalWeeks: 2,
      anchorDate: "2026-01-02"
    }]
  });
  return { ...actual, loadCompanySettings: vi.fn(async () => settings) };
});

import CompanySettingsPanel from "../../src/features/company-settings/panels/companySettingsPanel.jsx";

describe("Betriebsfreie Kalendertage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upload.mockResolvedValue(undefined);
    axios.post.mockResolvedValue({ data: { count: 26 } });
  });

  it("synchronisiert Sonderregeln bei jedem Speichern als Betriebsfrei in den Kalender", async () => {
    render(<CompanySettingsPanel />);
    expect(await screen.findByRole("heading", { name: "Unternehmen" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Einstellungen speichern" }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      "/api/calendar/company-days/sync",
      expect.objectContaining({
        year: new Date().getFullYear(),
        days: expect.arrayContaining([
          expect.objectContaining({ ruleId: "alternate-friday", label: "Jeder zweite Freitag frei" })
        ])
      })
    ));
    expect(await screen.findByText(/wiederkehrende freie Tage.*wurden im Kalender aktualisiert/)).toBeInTheDocument();
  });
});
