import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../src/app/providers/AuthContext.js";
import { useGuidedHelp } from "../../src/features/guided-help/GuidedHelpContext.js";
import GuidedHelpProvider from "../../src/features/guided-help/GuidedHelpProvider.jsx";
import { OnboardingContext } from "../../src/features/onboarding/OnboardingContext.js";

const demoProjectMocks = vi.hoisted(() => ({ cleanup: vi.fn().mockResolvedValue(0) }));

vi.mock("../../src/features/guided-help/guidedTourDemoProject.js", () => ({
  cleanupGuidedTourDemoProjects: demoProjectMocks.cleanup
}));

function TourLauncher() {
  const help = useGuidedHelp();
  return <>
    <button type="button" onClick={() => help?.startTour("projects")}>Direkt starten</button>
    <button type="button" onClick={() => help?.startTour("system-overview")}>System starten</button>
    <button type="button" onClick={() => help?.startTour("system-overview", { mode: "onboarding" })}>Onboarding starten</button>
  </>;
}

function ManualNavigation() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate("/Management/Board")}>Board manuell öffnen</button>;
}

function renderHelp(initialEntry = "/Projects") {
  return render(
    <AuthContext.Provider value={{ user: { role: "admin", features: ["work-preparation", "business-management", "crm", "shop", "calculation"] } }}>
      <OnboardingContext.Provider value={{ advance: vi.fn() }}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <GuidedHelpProvider>
            <div data-tour="global-sidebar">Navigation</div>
            <div data-tour="projects-actions">Projektaktionen</div>
            <div data-tour="projects-list">Projektliste</div>
            <div data-tour="project-home-summary">Projektkopf</div>
            <div data-tour="project-home-print">Projektdruck</div>
            <div data-tour="project-home-content">Projektinhalt</div>
            <div data-tour="management-board">Management-Board</div>
            <TourLauncher />
            <ManualNavigation />
          </GuidedHelpProvider>
        </MemoryRouter>
      </OnboardingContext.Provider>
    </AuthContext.Provider>
  );
}

describe("Top-Layer-Hilfe", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    demoProjectMocks.cleanup.mockClear();
    demoProjectMocks.cleanup.mockResolvedValue(0);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("bietet die Hilfe kontextbezogen an und erklärt echte Zielelemente", async () => {
    renderHelp();

    fireEvent.click(screen.getByRole("button", { name: "?" }));
    expect(screen.getByRole("button", { name: /Projektübersicht erklären/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Projektübersicht erklären/ }));

    expect(await screen.findByRole("dialog", { name: "Projektstart" })).toBeInTheDocument();
    await waitFor(() => expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Weiter →" }));
    expect(await screen.findByRole("dialog", { name: "Projektliste" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rundgang beenden" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Projektliste" })).not.toBeInTheDocument());
  });

  it("beschreibt nach einem Ansichtswechsel kurz den neuen Ort", async () => {
    renderHelp("/init");
    fireEvent.click(screen.getByRole("button", { name: "System starten" }));

    const dialog = await screen.findByRole("dialog", { name: "Die zentrale Navigation" });
    expect(dialog).toHaveTextContent("Du bist hier · Startseite");
    expect(dialog).toHaveTextContent("Persönlicher Überblick mit aktuellen Aufgaben, Projekten und Schnellzugriffen.");
  });

  it("pausiert bei manueller Navigation, erklärt die neue Ansicht und kehrt zum alten Schritt zurück", async () => {
    renderHelp();
    fireEvent.click(screen.getByRole("button", { name: "Direkt starten" }));
    expect(await screen.findByRole("dialog", { name: "Projektstart" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Board manuell öffnen" }));
    const boardHelp = await screen.findByRole("dialog", { name: "Projektstatus als Board" });
    expect(boardHelp).toHaveTextContent("Du bist hier · Management · Projektboard");
    expect(screen.getAllByRole("button", { name: /Rundgang.*fortsetzen/ }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "↩ Pausierten Rundgang an dieser Stelle fortsetzen" }));
    expect(await screen.findByRole("dialog", { name: "Projektstart" })).toBeInTheDocument();
  });

  it("öffnet mit F1 nur die aktuelle Ansicht und schließt nach deren letztem Schritt", async () => {
    renderHelp();
    fireEvent.keyDown(window, { key: "F1" });

    expect(await screen.findByRole("dialog", { name: "Projektstart" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Weiter →" }));
    expect(await screen.findByRole("dialog", { name: "Projektliste" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rundgang beenden" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Projektliste" })).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Rundgang.*fortsetzen/ })).not.toBeInTheDocument();
  });

  it("startet mit F1 auf einer Projekt-Unteransicht deren konkrete Funktionshilfe", async () => {
    renderHelp("/Projects/project-1");
    fireEvent.keyDown(window, { key: "F1" });

    expect(await screen.findByRole("dialog", { name: "Projektkopf" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Der Projektarbeitsplatz" })).not.toBeInTheDocument();
  });

  it("entfernt das temporäre Projekt beim Abbruch des Einrichtungsrundgangs", async () => {
    renderHelp("/init");
    await waitFor(() => expect(demoProjectMocks.cleanup).toHaveBeenCalled());
    demoProjectMocks.cleanup.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Onboarding starten" }));
    expect(await screen.findByRole("dialog", { name: "Die zentrale Navigation" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Später/ }));

    await waitFor(() => expect(demoProjectMocks.cleanup).toHaveBeenCalledTimes(1));
  });
});
