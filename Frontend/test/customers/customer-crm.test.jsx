import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  createCommunication: vi.fn(),
  createAppointment: vi.fn(),
  updateAppointment: vi.fn(),
  deleteCommunication: vi.fn(),
  deleteAppointment: vi.fn(),
  savePhoneNote: vi.fn()
}));

vi.mock("../../src/features/customers/crm/customerCrmApi.js", () => ({
  loadCustomerCrm: mocks.load,
  createCustomerCommunication: mocks.createCommunication,
  createCustomerAppointment: mocks.createAppointment,
  updateCustomerAppointment: mocks.updateAppointment,
  deleteCustomerCommunication: mocks.deleteCommunication,
  deleteCustomerAppointment: mocks.deleteAppointment,
  savePhoneCallNote: mocks.savePhoneNote
}));

vi.mock("../../src/shared/components/sideBar.jsx", () => ({
  default: () => <div data-testid="sidebar" />
}));

import CustomerCrmPage from "../../src/features/customers/pages/CustomerCrmPage.jsx";

const crmData = {
  customer: {
    id: "customer-1",
    firstName: "Anna",
    lastName: "Muster",
    companyName: "Muster Möbel",
    customerStatus: "active",
    customerRating: 4,
    newsletterOptIn: false,
    createdAt: "2026-01-02T10:00:00.000Z",
    addresses: [],
    files: [],
    communications: [],
    appointments: [],
    projects: [{
      id: "project-1",
      title: "Küche Muster",
      status: "active",
      description: "Neue Küche",
      startDate: "2026-10-28T10:00:00.000Z",
      estimatedValue: 12000,
      _count: { files: 2 }
    }]
  },
  calendarEvents: [{
    id: "event-1",
    type: "installation",
    title: "Montage Küche",
    startAt: "2026-11-05T08:00:00.000Z",
    endAt: "2026-11-05T15:00:00.000Z",
    project: { id: "project-1", title: "Küche Muster", status: "active" }
  }]
};

describe("Kunden-CRM", () => {
  beforeEach(() => {
    mocks.load.mockResolvedValue(crmData);
    mocks.createCommunication.mockResolvedValue({ id: "communication-1" });
  });

  it("zeigt verknüpfte Kalendertermine und erfasst manuellen Schriftverkehr", async () => {
    render(
      <MemoryRouter initialEntries={["/Kontakte/info/customer-1/crm"]}>
        <Routes>
          <Route path="/Kontakte/info/:userid/crm" element={<CustomerCrmPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("CRM · Anna Muster")).toBeInTheDocument();
    expect(screen.getByText("Montage Küche")).toBeInTheDocument();
    expect(screen.getByText("Küche Muster", { selector: "h3" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Kontakt" }));
    fireEvent.change(screen.getByLabelText("Art"), { target: { value: "letter" } });
    fireEvent.change(screen.getByPlaceholderText("Gesprächsnotiz oder Inhalt des Schriftverkehrs"), {
      target: { value: "Angebot per Post versendet" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Kontakt speichern" }));

    await waitFor(() => expect(mocks.createCommunication).toHaveBeenCalledWith(
      "customer-1",
      expect.objectContaining({ type: "letter", content: "Angebot per Post versendet" })
    ));
  });

  it("zeigt importierte E-Mails unveränderlich mit Paperless-Suche an", async () => {
    mocks.load.mockResolvedValue({
      ...crmData,
      customer: {
        ...crmData.customer,
        projects: [],
        communications: [
          {
            id: "mail-1",
            type: "email",
            source: "imap",
            direction: "inbound",
            subject: "Neue Zeichnung",
            content: "Anbei die freigegebene Zeichnung.",
            fromAddress: "anna@example.de",
            toAddresses: ["crm@example.de"],
            occurredAt: "2026-11-10T08:30:00.000Z",
            attachments: [{ name: "zeichnung.pdf", size: 2048 }]
          },
          {
            id: "mail-2",
            type: "email",
            source: "imap",
            direction: "outbound",
            subject: "AW: Neue Zeichnung",
            content: "Vielen Dank, die Zeichnung passt.",
            fromAddress: "crm@example.de",
            toAddresses: ["anna@example.de"],
            occurredAt: "2026-11-10T09:00:00.000Z",
            attachments: []
          }
        ]
      },
      calendarEvents: [],
      integrations: { paperlessBaseUrl: "https://paperless.example.de" }
    });

    render(
      <MemoryRouter initialEntries={["/Kontakte/info/customer-1/crm"]}>
        <Routes>
          <Route path="/Kontakte/info/:userid/crm" element={<CustomerCrmPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Neue Zeichnung")).toBeInTheDocument();
    expect(screen.getByText("Automatisch · Eingehend")).toBeInTheDocument();
    expect(screen.getByText("Automatisch · Ausgehend")).toBeInTheDocument();
    const incomingCard = screen.getByText("Neue Zeichnung").closest("article");
    const outgoingCard = screen.getByText("AW: Neue Zeichnung").closest("article");
    expect(incomingCard.parentElement).toHaveClass("justify-start");
    expect(outgoingCard.parentElement).toHaveClass("justify-end");
    expect(incomingCard.parentElement.parentElement).toHaveClass("max-h-[34rem]", "overflow-y-auto");
    const paperlessLink = screen.getByTitle("In Paperless suchen");
    expect(paperlessLink).toHaveAttribute("href", "https://paperless.example.de/documents?query=zeichnung.pdf");
    expect(screen.queryByRole("button", { name: "Löschen" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Vollbild öffnen" }));
    const dialog = screen.getByRole("dialog", { name: /Kontaktverlauf · Anna Muster/ });
    expect(dialog).toBeInTheDocument();
    expect(dialog.parentElement).toHaveClass("backdrop-blur-md");
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.mouseDown(dialog.parentElement);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("zeigt Asterisk-Telefonate mit Dauer und speicherbarer Gesprächsnotiz", async () => {
    mocks.load.mockResolvedValue({
      ...crmData,
      customer: {
        ...crmData.customer,
        projects: [],
        communications: [{
          id: "call-communication-1",
          type: "phone",
          source: "asterisk",
          direction: "inbound",
          subject: "Eingehender Anruf",
          content: "",
          fromAddress: "+49711123450",
          occurredAt: "2026-11-13T09:00:00.000Z",
          phoneCall: {
            status: "ended",
            callerNumber: "+49711123450",
            answeredAt: "2026-11-13T09:00:05.000Z",
            endedAt: "2026-11-13T09:02:10.000Z",
            durationSeconds: 125
          }
        }]
      },
      calendarEvents: []
    });
    mocks.savePhoneNote.mockResolvedValue({ id: "call-communication-1", content: "Rückruf vereinbart" });

    render(
      <MemoryRouter initialEntries={["/Kontakte/info/customer-1/crm"]}>
        <Routes><Route path="/Kontakte/info/:userid/crm" element={<CustomerCrmPage />} /></Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Automatisch · Telefonat")).toBeInTheDocument();
    expect(screen.getByText(/Asterisk · 2 Min. 5 Sek./)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Gesprächsinhalt, Vereinbarungen/), { target: { value: "Rückruf vereinbart" } });
    fireEvent.click(screen.getByRole("button", { name: "Gesprächsinhalt speichern" }));
    await waitFor(() => expect(mocks.savePhoneNote).toHaveBeenCalledWith(
      "customer-1",
      "call-communication-1",
      "Rückruf vereinbart"
    ));
  });
});
