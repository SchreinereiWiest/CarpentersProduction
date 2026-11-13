import { useMemo, useState } from "react";
import axios from "axios";

import AufmasIcon from "../common/AufmasIcon.jsx";

const statusLabel = {
  queued: "In Warteschlange",
  processing: "Wird erkannt",
  review: "Prüfung erforderlich",
  applied: "Übernommen",
  failed: "Fehlgeschlagen",
  queue_failed: "Warteschlange nicht erreichbar"
};

const draftsForScan = (scan) =>
  (scan?.items ?? []).map((item) => ({
    id: item.id,
    objectId: item.objectId,
    label: item.label || "Maß",
    unit: item.unit || "mm",
    confidence: item.confidence,
    acceptedValue: item.acceptedValue ?? item.predictedValue ?? "",
    accepted: item.status !== "rejected"
  }));

const hasConfidence = (value) =>
  value != null && value !== "" && Number.isFinite(Number(value));

export default function MeasurementReviewDialog({
  scans,
  onClose,
  onRefresh,
  onApplied,
  canApply = true
}) {
  const reviewable = useMemo(
    () => scans.filter((scan) => scan.status === "review"),
    [scans]
  );
  const [selectedId, setSelectedId] = useState(reviewable[0]?.id ?? scans[0]?.id ?? null);
  const selected = scans.find((scan) => scan.id === selectedId) ?? reviewable[0] ?? scans[0];
  const [drafts, setDrafts] = useState(() => draftsForScan(selected));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const updateDraft = (id, patch) =>
    setDrafts((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );

  const saveAndApply = async () => {
    if (!selected || busy || !canApply) return;
    setBusy(true);
    setError("");
    try {
      await axios.put(`/api/measurement-ocr/scans/${selected.id}/review`, {
        items: drafts.map((item) => ({
          id: item.id,
          status: item.accepted ? "accepted" : "rejected",
          acceptedValue: item.acceptedValue
        }))
      });
      await axios.post(`/api/measurement-ocr/scans/${selected.id}/apply`);
      await onApplied?.();
      await onRefresh?.();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Die geprüften Maße konnten nicht übernommen werden."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#080d12]/85 p-5 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-xl border border-[#3b4c59] bg-[#131d25] shadow-2xl">
        <aside className="w-64 shrink-0 border-r border-[#2d3b46] bg-[#101820] p-3">
          <div className="mb-3 px-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#718391]">
              Eingescannte Seiten
            </p>
            <p className="mt-1 text-xs text-[#95a6b2]">
              {reviewable.length} zur Prüfung
            </p>
          </div>
          <div className="max-h-[70vh] space-y-1.5 overflow-y-auto">
            {scans.map((scan) => (
              <button
                key={scan.id}
                type="button"
                onClick={() => {
                  setSelectedId(scan.id);
                  setDrafts(draftsForScan(scan));
                  setError("");
                }}
                className={`w-full rounded-lg border px-3 py-2.5 text-left ${selected?.id === scan.id ? "border-[#5a8eb2] bg-[#223746]" : "border-transparent bg-[#16212a] hover:border-[#344a59]"}`}
              >
                <span className="block truncate text-xs font-semibold text-[#d8e3ea]">
                  {scan.page?.label || scan.file?.fileName || "Unzugeordneter Scan"}
                </span>
                <span className="mt-1 block text-[10px] text-[#728592]">
                  {statusLabel[scan.status] || scan.status}
                </span>
              </button>
            ))}
            {!scans.length && (
              <p className="px-2 py-8 text-center text-xs leading-relaxed text-[#667986]">
                Noch keine eingescannten Aufmaßseiten vorhanden.
              </p>
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[#2d3b46] px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-white">OCR-Kontrolle</h2>
              <p className="mt-1 text-xs text-[#7e919e]">
                Erkannte Werte prüfen; erst danach werden sie als gemessen übernommen.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-[#8295a2] hover:bg-[#25343f] hover:text-white"
              aria-label="Kontrollansicht schließen"
            >
              <AufmasIcon name="close" className="size-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {selected?.status === "review" ? (
              <div className="space-y-3">
                {selected.error && (
                  <p className="rounded-lg border border-[#684a2f] bg-[#2b2118] p-3 text-xs text-[#e4b77d]">
                    {selected.error}
                  </p>
                )}
                <div className="grid grid-cols-[minmax(0,1fr)_9rem_7rem_6rem] gap-3 px-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#718391]">
                  <span>Maßfeld</span>
                  <span>Erkannter Wert</span>
                  <span>Konfidenz</span>
                  <span>Übernehmen</span>
                </div>
                {drafts.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[minmax(0,1fr)_9rem_7rem_6rem] items-center gap-3 rounded-lg border border-[#2e3e49] bg-[#101820] px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#d7e1e8]">{item.label}</p>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-[#627784]">{item.objectId}</p>
                    </div>
                    <div className="relative">
                      <input
                        inputMode="decimal"
                        value={item.acceptedValue}
                        disabled={!item.accepted || busy}
                        onChange={(event) => updateDraft(item.id, { acceptedValue: event.target.value })}
                        className="w-full rounded-md border border-[#405463] bg-[#17232c] px-3 py-2 pr-10 text-sm font-semibold tabular-nums text-white outline-none focus:border-[#69a5cc] disabled:opacity-40"
                      />
                      <span className="absolute right-2.5 top-2.5 text-[10px] text-[#70828f]">{item.unit}</span>
                    </div>
                    <span className={`${hasConfidence(item.confidence) && Number(item.confidence) >= 0.75 ? "text-[#75c3a5]" : "text-[#e0aa63]"} text-xs tabular-nums`}>
                      {hasConfidence(item.confidence)
                        ? `${Math.round(Number(item.confidence) * 100)} %`
                        : "Nicht erkannt"}
                    </span>
                    <label className="flex items-center gap-2 text-xs text-[#aab8c2]">
                      <input
                        type="checkbox"
                        checked={item.accepted}
                        disabled={busy}
                        onChange={(event) => updateDraft(item.id, { accepted: event.target.checked })}
                        className="size-4 accent-[#5da98f]"
                      />
                      Ja
                    </label>
                  </div>
                ))}
                {!drafts.length && (
                  <p className="rounded-lg border border-[#684a2f] bg-[#2b2118] p-4 text-sm text-[#e4b77d]">
                    Auf dieser Seite konnten keine ausfüllbaren Maßfelder gelesen werden.
                  </p>
                )}
              </div>
            ) : selected ? (
              <div className="rounded-lg border border-[#354754] bg-[#101820] p-5 text-sm text-[#a8b7c1]">
                <p className="font-semibold text-[#dce6ec]">{statusLabel[selected.status] || selected.status}</p>
                {selected.error && <p className="mt-2 text-[#e49a95]">{selected.error}</p>}
                {selected.status === "applied" && (
                  <p className="mt-2">Die bestätigten Werte wurden bereits in die Maßlinien eingespielt.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#788b98]">Keinen Scan ausgewählt.</p>
            )}
            {error && <p role="alert" className="mt-4 text-sm text-[#ee9d97]">{error}</p>}
          </div>

          <footer className="flex items-center justify-between border-t border-[#2d3b46] px-5 py-4">
            <p className={`text-[10px] ${canApply ? "text-[#657884]" : "text-[#dfaa69]"}`}>
              {canApply
                ? "Nur aktiv bestätigte Zahlen werden übernommen."
                : "Bitte warten, bis die aktuellen Aufmaßänderungen gespeichert sind."}
            </p>
            <button
              type="button"
              disabled={!canApply || busy || selected?.status !== "review" || !drafts.some((item) => item.accepted)}
              onClick={saveAndApply}
              className="inline-flex items-center gap-2 rounded-lg border border-[#4d806b] bg-[#254838] px-4 py-2.5 text-xs font-semibold text-[#d5eee4] hover:bg-[#2e5945] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <AufmasIcon name="check" className="size-4" />
              {busy ? "Wird übernommen …" : "Prüfung speichern & übernehmen"}
            </button>
          </footer>
        </section>
      </div>
    </div>
  );
}
