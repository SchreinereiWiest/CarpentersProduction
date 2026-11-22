import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanupGuidedTourDemoProjects,
  ensureGuidedTourDemoProject,
  isGuidedTourDemoProject
} from "../../src/features/guided-help/guidedTourDemoProject.js";
import { getLocalProject } from "../../src/shared/offline/local-projects.js";

describe("temporäres Projekt für den Einrichtungsrundgang", () => {
  beforeEach(async () => {
    await cleanupGuidedTourDemoProjects();
  });

  afterEach(async () => {
    await cleanupGuidedTourDemoProjects();
  });

  it("legt genau ein lokales Demo-Projekt an und entfernt es wieder", async () => {
    const created = await ensureGuidedTourDemoProject();
    const reused = await ensureGuidedTourDemoProject();

    expect(created).toMatchObject({
      title: "Temporäres Rundgangsprojekt",
      status: "active",
      localOnly: true,
      temporary: true
    });
    expect(isGuidedTourDemoProject(created)).toBe(true);
    expect(reused.id).toBe(created.id);
    await expect(getLocalProject(created.id)).resolves.toMatchObject({ id: created.id });

    await expect(cleanupGuidedTourDemoProjects()).resolves.toBe(1);
    await expect(getLocalProject(created.id)).resolves.toBeNull();
  });
});
