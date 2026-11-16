import { useMemo, useState } from "react";
import { createPlateCutPlan } from "@Engine/nesting/cutPlan.js";

const number = (value) =>
  new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value);

export default function CutPlanPanel({ sheet, activeStripId, onSelectStrip }) {
  const [plateIndex, setPlateIndex] = useState(0);
  const plans = useMemo(
    () =>
      (sheet?.nestingPlates ?? []).map((plate, index) =>
        createPlateCutPlan(sheet, plate, index)
      ),
    [sheet]
  );
  const plan = plans[Math.min(plateIndex, Math.max(0, plans.length - 1))];

  if (!plan) return null;

  return (
    <section className="mt-3 border-t border-gray-700 pt-3" aria-label="Schnittplan">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Schnittplan
          </p>
          <p className="mt-0.5 text-xs text-gray-300">
            {number(plan.width)} × {number(plan.height)} mm
          </p>
        </div>
        <span className="rounded bg-gray-950 px-2 py-1 text-[10px] tabular-nums text-gray-400">
          {plan.cuts.length} Schnitte
        </span>
      </div>

      {plans.length > 1 && (
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {plans.map((entry, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setPlateIndex(index)}
              className={`shrink-0 rounded border px-2 py-1 text-[10px] ${index === plateIndex ? "border-blue-500 bg-blue-600 text-white" : "border-gray-700 bg-gray-900 text-gray-400 hover:text-white"}`}
            >
              Platte {entry.plateNumber}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 max-h-[34vh] space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {plan.cuts.map((cut) => {
          const isActive = cut.stripId != null && String(cut.stripId) === String(activeStripId);
          return <div key={`${cut.number}-${cut.direction}-${cut.position}`} className="group relative overflow-hidden rounded-md">
          <button
            type="button"
            disabled={cut.stripId == null}
            aria-label={`${cut.directionLabel}: ${cut.direction === "vertical" ? "X" : "Y"} ${number(cut.position)} mm, Schnitt ${number(cut.length)} mm${cut.stripId != null ? `, Strip ${cut.stripId} auswählen` : ", kein Strip zugeordnet"}`}
            aria-pressed={isActive}
            onClick={() => cut.stripId != null && onSelectStrip?.(cut.stripId)}
            className={`absolute inset-0 h-full w-full rounded-md border text-left transition ${isActive ? "border-blue-500/40 bg-blue-950/80 ring-1 ring-inset ring-blue-500/40" : "border-gray-700/80 bg-gray-950/70 hover:bg-gray-900"} disabled:cursor-default disabled:opacity-70`}
            title={cut.stripId == null ? "Kein Strip zugeordnet" : `Strip ${cut.stripId} auswählen`}
          />
          <div className="pointer-events-none relative grid w-full grid-cols-[24px_1fr] gap-2 px-2 py-2 text-left">
            <span className="flex size-6 items-center justify-center rounded-full bg-white text-[10px] font-bold text-gray-950">
              {cut.number}
            </span>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-xs font-semibold text-gray-200">
                  {cut.directionLabel}
                </strong>
                <span className="text-[11px] tracking-wide text-gray-500">
                  {cut.direction === "vertical" ? "↕" : "↔"}{cut.stripId != null ? ` · ${cut.stripId}` : ""}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] tabular-nums text-gray-400">
                {cut.direction === "vertical" ? "X" : "Y"} {number(cut.position)} mm · Schnitt {number(cut.length)} mm
              </p>
            </div>
          </div>
          </div>;
        })}
        {!plan.cuts.length && (
          <div className="rounded-md border border-dashed border-gray-700 px-3 py-4 text-center text-[10px] leading-relaxed text-gray-500">
            Für diese Platte sind noch keine Schnitte vorhanden.
          </div>
        )}
      </div>
    </section>
  );
}
