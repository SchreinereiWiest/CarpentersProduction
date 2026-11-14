import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

const mocks = vi.hoisted(() => ({ upload: vi.fn() }));

vi.mock("axios", () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock("../../src/app/providers/AuthContext.js", () => ({ useAuth: () => ({ user: { id: "manager-1", role: "manager" } }) }));
vi.mock("../../src/shared/cache/global-cache.js", () => ({ getGlobalFile: vi.fn(), uploadGlobalFile: mocks.upload }));
vi.mock("../../src/shared/api/file-api.js", () => ({ downloadFile: vi.fn(), uploadJSONFile: vi.fn() }));
vi.mock("../../src/shared/cache/cache-retention.js", () => ({
  DEFAULT_CACHE_RETENTION_DAYS: 30,
  MIN_CACHE_RETENTION_DAYS: 1,
  MAX_CACHE_RETENTION_DAYS: 3650,
  normalizeCacheRetentionDays: value => Math.min(3650, Math.max(1, Number(value) || 30)),
  runCacheCleanup: vi.fn(async () => ({ filesDeleted: 0, apiEntriesDeleted: 0 })),
  setCacheRetentionDays: vi.fn(async () => undefined)
}));
vi.mock("../../src/shared/offline/offline-repository.js", () => ({
  clearOfflineData: vi.fn(async () => undefined),
  downloadProjectData: vi.fn(async () => ({ bundle: { projects: [] }, failures: [] })),
  getOfflineStorageSummary: vi.fn(async () => ({ projects: 0, apiEntries: 0, usageBytes: 0, quotaBytes: 0 })),
  isOfflineModeEnabled: vi.fn(() => false),
  setOfflineModeEnabled: vi.fn(async () => undefined)
}));

import CacheSettingsPanel from "../../src/features/company-settings/panels/cacheSettingsPanel.jsx";

describe("persönliche Cache-Einstellungen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockImplementation(async url => url === "/api/user/me/preferences"
      ? { data: { preferences: { cache: { preloadMode: "active", cacheRetentionDays: 45 } } } }
      : { data: { projects: [] } });
    axios.put.mockResolvedValue({ data: { preferences: {} } });
  });

  it("lädt und speichert Manager-Cachewerte ohne globale Cachedatei", async () => {
    render(<CacheSettingsPanel />);
    expect(await screen.findByRole("heading", { name: "Offline-Modus" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /Ungenutzte Cache-Dateien/ })).toHaveValue(45);

    fireEvent.click(screen.getByRole("button", { name: "Einstellungen speichern" }));

    await waitFor(() => expect(axios.put).toHaveBeenCalledWith(
      "/api/user/me/preferences",
      { cache: expect.objectContaining({ cacheRetentionDays: 45, preloadMode: "active" }) }
    ));
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
