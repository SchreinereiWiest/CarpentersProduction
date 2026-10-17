export const mimeFromFile = (file) => {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "dxf") return "application/dxf";
  if (extension === "pdf") return "application/pdf";
  return "application/octet-stream";
};

export const viewNameForPage = (pageNumber, currentLabel) => {
  const defaults = [
    "Frontansicht",
    "Seitenansicht 1",
    "Seitenansicht 2",
    "Grundriss"
  ];
  return currentLabel || defaults[pageNumber - 1] || `Ansicht ${pageNumber}`;
};
