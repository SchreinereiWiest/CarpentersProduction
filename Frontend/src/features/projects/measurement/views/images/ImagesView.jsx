import AufmasIcon from "../../components/common/AufmasIcon.jsx";

export default function ImagesView({
  photos,
  onUpload,
  uploading,
  readOnly = false
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#10171e]">
      <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-[#2b3844] bg-[#17212a] px-4 py-2">
        <div>
          <h2 className="text-sm font-semibold text-[#e5edf3]">
            Baustellenbilder
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
              <figure
                key={photo.id}
                className="group overflow-hidden rounded-lg border border-[#2f3e49] bg-[#17212a]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#0c1217]">
                  <img
                    src={photo.url}
                    alt={photo.fileName}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <figcaption className="truncate px-3 py-2 text-[11px] text-[#9eacb7]">
                  {photo.fileName}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-[#354650] bg-[#141e26] px-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full border border-[#334753] bg-[#1b2933] text-[#6f91a6]">
              <AufmasIcon name="photo" className="size-6" />
            </div>
            <p className="mt-4 text-sm font-semibold text-[#c6d2da]">
              Noch keine Baustellenbilder
            </p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#6c7f8c]">
              Dokumentiere Anschlüsse, Raumecken und Besonderheiten direkt vor
              Ort.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
