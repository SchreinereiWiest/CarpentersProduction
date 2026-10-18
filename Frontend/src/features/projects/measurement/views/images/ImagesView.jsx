import { useEffect, useState } from "react";
import AufmasIcon from "../../components/common/AufmasIcon.jsx";

const nameFromFile = (fileName) =>
  String(fileName || "Neue Ansicht").replace(/\.[^.]+$/, "");

export default function ImagesView({
  photos,
  onUpload,
  onCreateView,
  uploading,
  readOnly = false
}) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [viewName, setViewName] = useState("");

  const openCreateDialog = (photo) => {
    if (readOnly) return;
    setSelectedPhoto(photo);
    setViewName(nameFromFile(photo.fileName));
  };

  const closeCreateDialog = () => {
    setSelectedPhoto(null);
    setViewName("");
  };

  useEffect(() => {
    if (!selectedPhoto) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeCreateDialog();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedPhoto]);

  const createView = (event) => {
    event.preventDefault();
    const name = viewName.trim();
    if (!selectedPhoto || !name) return;
    onCreateView(selectedPhoto, name);
    closeCreateDialog();
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#10171e]">
      <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-[#2b3844] bg-[#17212a] px-4 py-2">
        <div>
          <h2 className="text-sm font-semibold text-[#e5edf3]">
            Projektbilder
          </h2>
          <p className="mt-0.5 text-[11px] text-[#728391]">
            {photos.length} Projektbild{photos.length === 1 ? "" : "er"}
          </p>
        </div>
        {!readOnly && (
          <label
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#315c78] px-3 py-2 text-xs font-semibold text-[#e5f3fb] hover:bg-[#3c6f90] ${uploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <AufmasIcon name="photo" className="size-4" />{" "}
            {uploading ? "Wird geladen …" : "Foto hinzufügen"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              onChange={(event) =>
                event.target.files?.[0] && onUpload(event.target.files[0])
              }
            />
          </label>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {photos.length ? (
          <div className="grid grid-cols-2 gap-3 2xl:grid-cols-3">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => openCreateDialog(photo)}
                disabled={readOnly}
                className="group overflow-hidden rounded-lg border border-[#2f3e49] bg-[#17212a] text-left transition hover:border-[#5c8eb4] disabled:cursor-default disabled:hover:border-[#2f3e49]"
                title={readOnly ? photo.fileName : "Als neue Ansicht verwenden"}
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#0c1217]">
                  <img
                    src={photo.url}
                    alt={photo.fileName}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <span className="block truncate px-3 py-2 text-[11px] text-[#9eacb7]">
                  {photo.fileName}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-[#354650] bg-[#141e26] px-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full border border-[#334753] bg-[#1b2933] text-[#6f91a6]">
              <AufmasIcon name="photo" className="size-6" />
            </div>
            <p className="mt-4 text-sm font-semibold text-[#c6d2da]">
              Noch keine Projektbilder
            </p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#6c7f8c]">
              Dokumentiere Anschlüsse, Raumecken und Besonderheiten direkt vor
              Ort.
            </p>
          </div>
        )}
      </div>

      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeCreateDialog}
            aria-label="Dialog schließen"
          />
          <form
            onSubmit={createView}
            className="relative w-full max-w-md rounded-xl border border-[#3a4c59] bg-[#17212a] p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-view-dialog-title"
          >
            <h3
              id="image-view-dialog-title"
              className="text-base font-semibold text-[#e5edf3]"
            >
              Bild als Ansicht hinzufügen
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#7f919e]">
              Vergib einen Namen für die neue bearbeitbare Front- oder
              Detailansicht.
            </p>
            <div className="mt-4 flex gap-4">
              <img
                src={selectedPhoto.url}
                alt=""
                className="h-20 w-24 shrink-0 rounded-md border border-[#31414c] object-cover"
              />
              <label className="min-w-0 flex-1 text-xs font-medium text-[#b9c7d1]">
                Name der Ansicht
                <input
                  autoFocus
                  value={viewName}
                  onChange={(event) => setViewName(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[#3a4b57] bg-[#0f171e] px-3 py-2 text-sm text-white outline-none focus:border-[#66a6d1]"
                  placeholder="z. B. Front Hochschrank"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCreateDialog}
                className="rounded-md border border-[#3a4b57] px-4 py-2 text-xs font-semibold text-[#aab8c2] hover:bg-[#202d37]"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={!viewName.trim()}
                className="rounded-md bg-[#315c78] px-4 py-2 text-xs font-semibold text-[#e5f3fb] hover:bg-[#3c6f90] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ansicht hinzufügen
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
