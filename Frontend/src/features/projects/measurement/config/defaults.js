export const DEFAULT_VIEWS = [
  { id: "expose", label: "Exposé", type: "expose", exposeId: "default" },
  { id: "three", label: "3D-Ansicht", type: "three" },
  { id: "images", label: "Bilder", type: "images" }
];

export const DEFAULT_TODOS = [
  {
    id: "todo-openings",
    title: "Fenster- und Türöffnungen prüfen",
    done: false
  },
  {
    id: "todo-installations",
    title: "Installationen fotografieren",
    done: false
  }
];

export const DEFAULT_DISPLAY = {
  plan: true,
  dxf: true,
  objects: true,
  snapPoints: true,
  objectLabels: true
};

const SPECIAL_VIEW_TYPES = new Set(["three", "images", "expose"]);

export const isDrawingView = (view) => !SPECIAL_VIEW_TYPES.has(view?.type);

export const hasViewContent = (view, objects = []) => (
  !isDrawingView(view)
  || Boolean(view?.planFileId || view?.dxfFileId || view?.imageFileId)
  || objects.some((object) => object?.viewId === view?.id)
);

export function ensureWorkspaceViews(views, objects = []) {
  const supplied = Array.isArray(views) ? views : [];
  const source = supplied.length ? supplied : DEFAULT_VIEWS;
  const next = source.filter((view) => hasViewContent(view, objects));

  for (const specialView of DEFAULT_VIEWS) {
    if (!next.some((view) => view.type === specialView.type)) next.push(specialView);
  }

  const exposeIndex = next.findIndex((view) => view.type === "expose");
  if (exposeIndex > 0) {
    next.unshift(next.splice(exposeIndex, 1)[0]);
  }

  const unchanged = next.length === source.length
    && next.every((view, index) => view === source[index]);
  return unchanged ? source : next;
}
