import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  createCommunication: vi.fn(),
  createAppointment: vi.fn(),
  updateAppointment: vi.fn(),
  deleteCommunication: vi.fn(),
  deleteAppointment: vi.fn()
}));

vi.mock("../../src/features/customers/crm/customerCrmApi.js", () => ({
  loadCustomerCrm: mocks.load,
  createCustomerCommunication: mocks.createCommunication,
  createCustomerAppointment: mocks.createAppointment,
  updateCustomerAppointment: mocks.updateAppointment,
  deleteCustomerCommunication: mocks.deleteCommunication,
  deleteCustomerAppointment: mocks.deleteAppointment
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
});
