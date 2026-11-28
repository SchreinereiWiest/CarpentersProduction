import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

const mocks = vi.hoisted(() => ({ upload: vi.fn(), user: { id: "user-1", role: "user" } }));

vi.mock("axios", () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock("../../src/app/providers/AuthContext.js", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("../../src/app/theme/ThemeContext.js", () => ({ useTheme: () => ({ theme: "dark", setTheme: vi.fn() }) }));
vi.mock("../../src/shared/cache/global-cache.js", () => ({ uploadGlobalFile: mocks.upload }));
vi.mock("../../src/shared/api/file-api.js", () => ({ uploadJSONFile: vi.fn() }));
vi.mock("../../src/shared/settings/company-settings.js", async importOriginal => {
  const actual = await importOriginal();
  return { ...actual, loadCompanySettings: vi.fn(async () => actual.normalizeCompanySettings({})) };
});

import UserInterfaceSettingsPanel from "../../src/features/company-settings/panels/userInterfaceSettingsPanel.jsx";

describe("persönliche Oberflächeneinstellungen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: "user-1", role: "user" };
    axios.get.mockResolvedValue({ data: { preferences: { home: {} } } });
    axios.put.mockResolvedValue({ data: { preferences: {} } });
  });

  it("stellt Usern alle UI-Reiter bereit und speichert sie persönlich", async () => {
    render(<MemoryRouter><UserInterfaceSettingsPanel /></MemoryRouter>);

    expect(await screen.findByRole("tab", { name: "Startseite" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Allgemein" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Aufmaß" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tastatur" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Fensterlayout" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Aufmaß" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Tipps anzeigen" }));
    fireEvent.click(screen.getByRole("button", { name: "Einstellungen speichern" }));

    await waitFor(() => expect(axios.put).toHaveBeenCalledWith(
      "/api/user/me/preferences",
      expect.objectContaining({ userInterface: expect.objectContaining({ showTips: false }) })
    ));
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
