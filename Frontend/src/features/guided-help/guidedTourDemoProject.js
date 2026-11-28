import {
  createLocalProject,
  deleteLocalProject,
  listLocalProjects
} from "../../shared/offline/local-projects.js";

const DEMO_MARKER = "guided-tour";

export const isGuidedTourDemoProject = project =>
  project?.temporaryPurpose === DEMO_MARKER;

export const ensureGuidedTourDemoProject = async () => {
  const localProjects = await listLocalProjects();
  const existing = localProjects.find(isGuidedTourDemoProject);
  if (existing) return existing;

  return createLocalProject({
    title: "Temporäres Rundgangsprojekt",
    description: "Dieses lokale Testprojekt wird nur für den Einrichtungsrundgang verwendet und anschließend automatisch entfernt.",
    status: "active",
    priority: "normal",
    startDate: new Date().toISOString(),
    temporary: true,
    temporaryPurpose: DEMO_MARKER
  });
};

export const cleanupGuidedTourDemoProjects = async () => {
  const localProjects = await listLocalProjects();
  const demoProjects = localProjects.filter(isGuidedTourDemoProject);
  for (const project of demoProjects) {
    await deleteLocalProject(project.id);
  }
  return demoProjects.length;
};
