export const DEFAULT_VIEWS = [
  {
    id: "front",
    label: "Frontansicht",
    type: "elevation",
    planFileId: null,
    dxfFileId: null,
    pageNumber: 1
  },
  {
    id: "side-1",
    label: "Seitenansicht 1",
    type: "elevation",
    planFileId: null,
    dxfFileId: null,
    pageNumber: 2
  },
  {
    id: "side-2",
    label: "Seitenansicht 2",
    type: "elevation",
    planFileId: null,
    dxfFileId: null,
    pageNumber: 3
  },
  {
    id: "floor",
    label: "Grundriss",
    type: "floor",
    planFileId: null,
    dxfFileId: null,
    pageNumber: 4
  },
  { id: "three", label: "3D-Ansicht", type: "three" },
  { id: "images", label: "Bilder", type: "images" },
  { id: "expose", label: "Exposé", type: "expose" }
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

export function ensureWorkspaceViews(views) {
  const source = Array.isArray(views) && views.length ? views : DEFAULT_VIEWS;
  if (source.some((view) => view.type === "expose")) return source;
  const imagesIndex = source.findIndex((view) => view.type === "images");
  const exposeView = { id: "expose", label: "Exposé", type: "expose" };
  if (imagesIndex < 0) return [...source, exposeView];
  return [
    ...source.slice(0, imagesIndex + 1),
    exposeView,
    ...source.slice(imagesIndex + 1)
  ];
}
