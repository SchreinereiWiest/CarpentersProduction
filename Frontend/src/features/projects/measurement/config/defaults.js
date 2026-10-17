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
