import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

import ContactHistorySettingsPanel from "../../src/features/company-settings/panels/contactHistorySettingsPanel.jsx";

const settings = {
  configured: true,
  enabled: false,
  connected: false,
  host: "imap.example.de",
  port: 993,
  username: "crm@example.de",
  accountEmail: "crm@example.de",
  mailbox: "INBOX",
  initialSyncDays: 90,
  syncIntervalMinutes: 5,
  passwordConfigured: false
};

describe("Kontaktverlauf-Einstellungen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: settings });
    axios.put.mockResolvedValue({ data: { ...settings, enabled: true, passwordConfigured: true } });
  });

  it("speichert ausschließlich ein neues App-Passwort und erzwingt IMAPS 993", async () => {
    render(<ContactHistorySettingsPanel />);
    expect(await screen.findByRole("heading", { name: "Automatischer E-Mail-Kontaktverlauf" })).toBeInTheDocument();
    expect(screen.getByLabelText("Port")).toHaveValue(993);
    expect(screen.getByText(/ausschließlich TLS 1.2\+/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Automatischen Kontaktverlauf aktivieren"));
    fireEvent.change(screen.getByLabelText("App-Passwort"), { target: { value: "app-password-1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(axios.put).toHaveBeenCalledWith(
      "/api/contact-history/settings",
      expect.objectContaining({
        enabled: true,
        host: "imap.example.de",
        port: 993,
        password: "app-password-1234"
      })
    ));
    expect(screen.getByLabelText("App-Passwort")).toHaveValue("");
  });
});
