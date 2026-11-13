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

const freePbxSettings = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  configured: true,
  enabled: false,
  defaultCountryCode: "+49",
  secretConfigured: true
};

describe("Kontaktverlauf-Einstellungen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockImplementation(url => Promise.resolve({ data: url.includes("freepbx") ? freePbxSettings : settings }));
    axios.put.mockImplementation((url) => Promise.resolve({ data: url.includes("freepbx")
      ? { ...freePbxSettings, enabled: true }
      : { ...settings, enabled: true, passwordConfigured: true }
    }));
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

  it("zeigt getrennte FreePBX-Hooks und speichert die Landesvorwahl", async () => {
    render(<ContactHistorySettingsPanel />);
    expect(await screen.findByRole("heading", { name: "FreePBX / Asterisk-Anrufverlauf" })).toBeInTheDocument();
    expect(screen.getByText(/Einstellungen → Asterisk-Manager/)).toBeInTheDocument();
    expect(screen.getByText(/Sangoma-CRM-Modul ist nicht erforderlich/)).toBeInTheDocument();
    expect(screen.getByText(/carpenters-17\.0\.1\.tar\.gz/)).toBeInTheDocument();
    expect(screen.getByText(/FreePBX besitzt im Core keine allgemeine Telefonie-Webhook-Seite/)).toBeInTheDocument();
    expect(screen.getByText(/webhook\/11111111-1111-4111-8111-111111111111\/ringing/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Webhook-Secret erneuern" })).toBeEnabled();
    fireEvent.click(screen.getByLabelText("FreePBX-Webhooks aktivieren"));
    fireEvent.change(screen.getByLabelText("Standard-Landesvorwahl"), { target: { value: "+43" } });
    fireEvent.click(screen.getByRole("button", { name: "Telefonie speichern" }));
    await waitFor(() => expect(axios.put).toHaveBeenCalledWith(
      "/api/contact-history/freepbx/settings",
      { enabled: true, defaultCountryCode: "+43" }
    ));
  });

  it("erneuert das FreePBX-Webhook-Secret und zeigt es einmalig an", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    axios.post.mockResolvedValue({
      data: {
        ...freePbxSettings,
        secretUpdatedAt: "2026-11-13T12:00:00.000Z",
        webhookSecret: "new-one-time-webhook-secret"
      }
    });

    render(<ContactHistorySettingsPanel />);
    const rotateButton = await screen.findByRole("button", { name: "Webhook-Secret erneuern" });
    fireEvent.click(rotateButton);

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      "/api/contact-history/freepbx/settings/rotate-secret"
    ));
    expect(await screen.findByText("new-one-time-webhook-secret")).toBeInTheDocument();
    expect(screen.getByText(/Neues Webhook-Secret erzeugt/)).toBeInTheDocument();
  });
});
