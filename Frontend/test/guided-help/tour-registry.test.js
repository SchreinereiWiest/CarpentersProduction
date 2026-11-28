import { describe, expect, it } from "vitest";
import { availableTours, describeRoute, filterTourSteps, tourById } from "../../src/features/guided-help/tourRegistry.js";

const admin = {
  role: "admin",
  features: ["business-management", "work-preparation", "crm", "shop", "calculation"]
};

describe("kontextbezogene Funktionsrundgänge", () => {
  it("deckt im Einrichtungsrundgang alle angeforderten Arbeitsbereiche ab", () => {
    const steps = filterTourSteps(tourById("system-overview"), admin);
    const targets = steps.map(step => step.target).join(" ");

    expect(targets).toContain("management-");
    expect(targets).toContain("project-");
    expect(targets).toContain("documents-");
    expect(targets).toContain("contact-");
    expect(targets).toContain("shop-");
    expect(targets).toContain("employee-");
    expect(steps.some(step => step.route === "/Management/Timeline")).toBe(true);
    expect(steps.some(step => step.activate === '[data-tour="shop-tab-catalog"]')).toBe(true);
  });

  it("bietet pro Ansicht den kompletten Rundgang und die passende Detailhilfe an", () => {
    expect(availableTours("/Management/Board", admin).map(tour => tour.id)).toEqual(["system-overview", "management"]);
    expect(availableTours("/Kontakte/new", admin).map(tour => tour.id)).toEqual(["system-overview", "contact-form"]);
    expect(availableTours("/Projects/project-1", admin).map(tour => tour.id)).toEqual(["system-overview", "project-workflow", "project-home-functions"]);
  });

  it("stellt für jede Projekt-Unteransicht eine eigene Funktionshilfe bereit", () => {
    const routes = {
      "/Projects/project-1": "project-home-functions",
      "/Projects/Aufmas/project-1": "project-measurement-functions",
      "/Projects/Cabinet/project-1": "project-cabinet-functions",
      "/Projects/List/project-1": "project-parts-functions",
      "/Projects/Nesting/project-1": "project-nesting-functions",
      "/Projects/Cut/project-1": "project-cut-functions",
      "/Projects/Cnc/project-1": "project-cnc-functions",
      "/Projects/Cnc/project-1/Edit/part-1": "project-cnc-editor-functions",
      "/Projects/Time/project-1": "project-time-functions",
      "/Projects/Purchasing/project-1": "project-purchasing-functions",
      "/Projects/Calculation/project-1": "project-calculation-functions",
      "/Projects/Attachments/project-1": "project-attachments-functions",
      "/Projects/Settings/project-1": "project-settings-functions"
    };

    Object.entries(routes).forEach(([route, expectedTour]) => {
      const ids = availableTours(route, admin).map(tour => tour.id);
      expect(ids).toContain("project-workflow");
      expect(ids).toContain(expectedTour);
      expect(tourById(expectedTour).steps.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("blendet nicht freigeschaltete oder administrative Schritte aus", () => {
    const employee = { role: "user", features: ["work-preparation"] };
    const steps = filterTourSteps(tourById("system-overview"), employee);

    expect(steps.some(step => step.id.startsWith("management"))).toBe(false);
    expect(steps.some(step => step.id.startsWith("contact"))).toBe(false);
    expect(steps.some(step => step.id.startsWith("shop"))).toBe(false);
    expect(steps.some(step => step.id.startsWith("employee"))).toBe(true);
  });

  it("führt in Projekt-, Dokument- und Shop-Unteransichten über sichere Zielschalter", () => {
    const projectTargets = filterTourSteps(tourById("project-workflow"), admin).map(step => step.target);
    expect(projectTargets).toContain('[data-tour="project-nav-cnc"]');
    expect(projectTargets).toContain('[data-tour="project-nav-calculation"]');

    const documentSteps = filterTourSteps(tourById("documents"), admin);
    expect(documentSteps.find(step => step.id === "local")?.activate).toBe('[data-tour="documents-tab-local"]');

    const shopSteps = filterTourSteps(tourById("shop"), admin);
    expect(shopSteps.find(step => step.id === "purchased")?.activate).toBe('[data-tour="shop-tab-purchased"]');
  });

  it("liefert für jeden Ansichtswechsel eine kurze Ortsbeschreibung", () => {
    expect(describeRoute("/Management/Timeline")).toEqual({
      label: "Management · Zeitplanung",
      description: "Projektphasen und geplante Zeiträume im Gantt planen."
    });
    expect(describeRoute("/Kontakte/info/customer-1/crm").label).toBe("Kontakte · CRM");
    expect(describeRoute("/Projects/Nesting/project-1").label).toBe("Projekt · Nesting");
    expect(describeRoute("/Projects/Cnc/project-1/Edit/part-1").label).toBe("Projekt · CNC-Bauteileditor");
  });
});
