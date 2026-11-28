import { useEffect, useState } from "react";
import AufmasIcon from "../../components/common/AufmasIcon.jsx";

export default function ImagesView({
  photos,
  onUpload,
  uploading,
  readOnly = false,
  selectionMode = false,
  selectionTitle = "Bild für das Exposé auswählen",
  onSelectPhoto,
  onCancelSelection
}) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const openPhoto = (photo) => {
    if (selectionMode) {
      onSelectPhoto?.(photo);
      return;
    }
    setSelectedPhoto(photo);
  };

  const closePhoto = () => setSelectedPhoto(null);

  useEffect(() => {
    if (!selectedPhoto) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") closePhoto();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedPhoto]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#10171e]">
      <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-[#2b3844] bg-[#17212a] px-4 py-2">
        <div>
          <h2 className="text-sm font-semibold text-[#e5edf3]">
            {selectionMode ? selectionTitle : "Projektbilder"}
          </h2>
          <p className="mt-0.5 text-[11px] text-[#728391]">
            {selectionMode
              ? "Ein Bild anklicken – es wird direkt in die neue Ansicht eingesetzt."
              : `${photos.length} Projektbild${photos.length === 1 ? "" : "er"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectionMode && (
            <button type="button" onClick={onCancelSelection} className="inline-flex items-center gap-2 rounded-lg border border-[#40515d] px-3 py-2 text-xs font-semibold text-[#b9c7d0] hover:bg-[#202d37]">
              <AufmasIcon name="close" className="size-4" /> Abbrechen
            </button>
          )}
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
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {photos.length ? (
          <div className="grid grid-cols-2 gap-3 2xl:grid-cols-3">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => openPhoto(photo)}
                className="group overflow-hidden rounded-lg border border-[#2f3e49] bg-[#17212a] text-left transition hover:border-[#5c8eb4]"
                title={selectionMode ? "Bild auswählen" : "Bild im Vollbild öffnen"}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label={`${selectedPhoto.fileName} im Vollbild`} onMouseDown={(event) => event.target === event.currentTarget && closePhoto()}>
          <button
            type="button"
            onClick={closePhoto}
            className="absolute right-4 top-4 z-10 rounded-lg border border-white/20 bg-black/60 px-4 py-2 text-sm font-semibold text-white hover:bg-black/80"
            aria-label="Vollbild schließen"
          >
            Schließen
          </button>
          <img src={selectedPhoto.url} alt={selectedPhoto.fileName} className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] object-contain" />
        </div>
      )}
    </div>
  );
}
