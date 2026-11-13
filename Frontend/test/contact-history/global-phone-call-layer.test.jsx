import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

import { AuthContext } from "../../src/app/providers/AuthContext.js";
import GlobalPhoneCallLayer from "../../src/features/contact-history/GlobalPhoneCallLayer.jsx";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));

class EventSourceMock {
  static instance;
  listeners = new Map();
  constructor() {
    EventSourceMock.instance = this;
  }
  addEventListener(name, callback) {
    this.listeners.set(name, callback);
  }
  emit(name, data) {
    this.listeners.get(name)?.({ data: JSON.stringify(data) });
  }
  close() {}
}

describe("globale Telefonanzeige", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: { calls: [] } });
    vi.stubGlobal("EventSource", EventSourceMock);
  });

  it("zeigt einen bekannten klingelnden Kunden modal und in einer platzschaffenden Statusleiste", async () => {
    const navigate = vi.fn();
    window.addEventListener("carpenters-global-navigate", navigate, { once: true });
    const call = {
      id: "call-1",
      status: "ringing",
      callerNumber: "+49711123450",
      customer: {
        id: "customer-1",
        name: "Muster Möbel",
        email: "anna@example.de",
        phone: "+49711123450"
      }
    };
    render(
      <AuthContext.Provider value={{ user: { role: "admin", features: ["crm"] } }}>
        <MemoryRouter initialEntries={["/Projects"]}>
          <GlobalPhoneCallLayer><div data-testid="current-view">Projektansicht</div></GlobalPhoneCallLayer>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    await waitFor(() => expect(EventSourceMock.instance).toBeTruthy());
    act(() => EventSourceMock.instance.emit("phone-call", call));

    expect(screen.getByRole("dialog", { name: "Muster Möbel" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Eingehender Anruf");
    expect(screen.getByTestId("current-view").parentElement).toHaveClass("phone-call-content");
    fireEvent.click(screen.getByRole("button", { name: "Kunden-CRM öffnen" }));
    expect(navigate).toHaveBeenCalled();
    expect(navigate.mock.calls[0][0].detail.path).toBe("/Kontakte/info/customer-1/crm");
  });
});
