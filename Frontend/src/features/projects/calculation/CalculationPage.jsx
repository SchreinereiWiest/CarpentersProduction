import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import {
  aggregateTimeEntries,
  calculateCabinetHourEstimate,
  calculateFull,
  calculateQuick,
  nonNegativeNumber,
  purchasingMaterialCost,
  summarizeCabinets
} from "@Engine/calculation/calculation.mjs";
import { estimateProjectHours, normalizeEstimationSettings } from "@Engine/calculation/estimation.mjs";
import SideBar from "../../../shared/components/sideBar.jsx";
import ProjectBar from "../../../shared/components/projectBar.jsx";
import {
  loadCalculationWorkspace,
  releaseCalculationSnapshot,
  saveCalculation
} from "./calculationApi.js";

const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const decimal = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

const DEFAULT_MARKUPS = {
  profitPercent: 20,
  cashDiscountPercent: 0,
  customerDiscountPercent: 0,
  vatPercent: 19
};

const emptyQuick = {
  materialSurchargePercent: 0,
  hours: 0,
  hourlyRate: 0,
  ...DEFAULT_MARKUPS
};

const emptyFull = {
  materialDirectCosts: 0,
  administrationOverheadPercent: 0,
  costCenters: [],
  ...DEFAULT_MARKUPS
};

const mergeCostCenters = (available, saved = [], actual = []) => available.map(center => {
  const previous = saved.find(item => String(item.id) === String(center.id));
  const tracked = actual.find(item => String(item.id) === String(center.id));
  return {
    id: String(center.id),
    name: center.name,
    activityIds: center.activityIds || [],
    averageAllocationPercent: center.averageAllocationPercent,
    rateWeightPercent: center.rateWeightPercent,
    hours: nonNegativeNumber(previous?.hours ?? tracked?.hours),
    hourlyRate: nonNegativeNumber(previous?.hourlyRate ?? center.hourlyRate)
  };
});

const selectZeroValue = event => {
  const input = event.currentTarget;
  if (!input.readOnly && input.value !== "" && Number(input.value) === 0) input.select();
};

function NumberInput({ label, ariaLabel, value, onChange, suffix, min = 0, max, step = "0.01", hint, readOnly = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-300">{label}</span>
      <span className="relative block">
        <input
          type="number"
          aria-label={ariaLabel}
          min={min}
          max={max}
          step={step}
          value={value}
          readOnly={readOnly}
          onFocus={selectZeroValue}
          onClick={selectZeroValue}
          onChange={event => onChange(event.target.value === "" ? "" : Number(event.target.value))}
          className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 pr-12 text-right text-white outline-none transition read-only:cursor-default read-only:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-gray-500">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

function SegmentedTabs({ value, onChange, tabs, ariaLabel }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-gray-700 bg-gray-950 p-1" role="tablist" aria-label={ariaLabel}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            value === tab.id ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:bg-gray-800 hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function Card({ title, description, actions, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-gray-700 bg-gray-800/80 shadow-xl shadow-black/10 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-700 px-5 py-4">
          <div>
            {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
            {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

function CalculationRows({ result, full = false }) {
  const rows = full ? [
    ["Material aus Einkauf", result.materialBase],
    ["Materialeinzelkosten", result.materialDirectCosts],
    ["Materialkosten", result.materialCosts, true],
    ["Fertigungskosten", result.productionLaborCosts],
    ["Herstellungskosten der Erzeugung (HKdE)", result.productionCosts, true],
    [`Verwaltungsgemeinkosten (${decimal.format(result.administrationOverheadPercent)} %)`, result.administrationOverheadAmount],
    ["Herstellungskosten", result.manufacturingCosts, true],
    [`Gewinnzuschlag (${decimal.format(result.profitPercent)} %)`, result.profitAmount],
    ["Barverkaufspreis", result.cashSellingPrice, true],
    [`Skonto (${decimal.format(result.cashDiscountPercent)} %)`, result.cashDiscountAmount],
    ["Zielverkaufspreis", result.targetSellingPrice, true],
    [`Rabatt (${decimal.format(result.customerDiscountPercent)} %)`, result.customerDiscountAmount],
    ["Nettoverkaufspreis", result.netSellingPrice, true],
    [`MwSt. (${decimal.format(result.vatPercent)} %)`, result.vatAmount],
    ["Bruttoverkaufspreis", result.grossSellingPrice, true, true]
  ] : [
    ["Material aus Einkauf", result.materialBase],
    [`Materialzuschlag (${decimal.format(result.materialSurchargePercent)} %)`, result.materialSurchargeAmount],
    ["Materialkosten", result.materialCosts, true],
    [`Fertigung (${decimal.format(result.hours)} h × ${money.format(result.hourlyRate)})`, result.laborCosts],
    [`Gewinnzuschlag (${decimal.format(result.profitPercent)} %)`, result.profitAmount],
    ["Barverkaufspreis", result.cashSellingPrice, true],
    [`Skonto (${decimal.format(result.cashDiscountPercent)} %)`, result.cashDiscountAmount],
    ["Zielverkaufspreis", result.targetSellingPrice, true],
    [`Rabatt (${decimal.format(result.customerDiscountPercent)} %)`, result.customerDiscountAmount],
    ["Nettoverkaufspreis", result.netSellingPrice, true],
    [`MwSt. (${decimal.format(result.vatPercent)} %)`, result.vatAmount],
    ["Bruttoverkaufspreis", result.grossSellingPrice, true, true]
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-700">
      {rows.map(([label, amount, strong, total]) => (
        <div
          key={label}
          className={`flex items-center justify-between gap-4 border-b border-gray-700 px-4 py-3 last:border-b-0 ${
            total ? "bg-blue-950/60 text-blue-100" : strong ? "bg-gray-900/60 text-white" : "text-gray-300"
          }`}
        >
          <span className={strong ? "font-semibold" : "text-sm"}>{label}</span>
          <span className={`${strong ? "font-semibold" : ""} tabular-nums`}>{money.format(amount)}</span>
        </div>
      ))}
    </div>
  );
}

function MarkupFields({ values, onChange }) {
  const changeDeduction = field => value => onChange(
    field,
    value === "" ? "" : Math.min(99.99, nonNegativeNumber(value))
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <NumberInput label="Gewinnzuschlag" ariaLabel="Gewinnzuschlag" suffix="%" value={values.profitPercent} onChange={value => onChange("profitPercent", value)} />
      <NumberInput label="Skonto" suffix="%" max="99.99" value={values.cashDiscountPercent} onChange={changeDeduction("cashDiscountPercent")} />
      <NumberInput label="Rabatt" suffix="%" max="99.99" value={values.customerDiscountPercent} onChange={changeDeduction("customerDiscountPercent")} />
      <NumberInput label="Mehrwertsteuer" suffix="%" value={values.vatPercent} onChange={value => onChange("vatPercent", value)} />
    </div>
  );
}

function CabinetHours({ summary, values, costCenters, onChange, onApplyQuick, onApplyFull }) {
  const estimate = useMemo(
    () => calculateCabinetHourEstimate(summary, values, costCenters),
    [summary, values, costCenters]
  );
  return (
    <Card
      title="Interaktiver Stundenüberschlag"
      description="Arbeitszeit je Korpus und Kostenstelle schätzen; die Stückzahl wird automatisch berücksichtigt."
      actions={(
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onApplyQuick(estimate.totalHours)} className="rounded-lg border border-blue-500 px-3 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-950">
            {decimal.format(estimate.totalHours)} h in Schnellkalkulation
          </button>
          <button type="button" disabled={!costCenters.length} onClick={() => onApplyFull(estimate.totalsByCenter)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">
            Aufgeschlüsselt in Vollkalkulation
          </button>
        </div>
      )}
    >
      {estimate.rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-600 p-5 text-center text-sm text-gray-400">
          In cabinet.json sind noch keine Korpusse vorhanden.
        </p>
      ) : (
        <div className="space-y-3">
          {estimate.rows.map(row => (
            <div key={row.id} className="rounded-xl border border-gray-700 bg-gray-900/60 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-white">{row.name}</span>
                  <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">{row.quantity} ×</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {decimal.format(row.width)} × {decimal.format(row.height)} × {decimal.format(row.depth)} mm · {row.sections} Bereiche · {row.fronts} Fronten
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {row.estimates.map(center => (
                  <NumberInput
                    key={center.id}
                    label={center.name}
                    ariaLabel={`${center.name} · ${row.name} · h / Stück`}
                    suffix="h/Stk."
                    step="0.25"
                    value={center.hoursPerPiece}
                    onChange={value => onChange(row.id, center.id, value)}
                    hint={`${decimal.format(center.hours)} h für ${row.quantity} Stück`}
                  />
                ))}
              </div>
              <div className="mt-3 text-right text-sm font-semibold text-gray-300">
                Korpus gesamt: {decimal.format(row.hours)} h
              </div>
            </div>
          ))}
          <div className="grid gap-3 rounded-xl bg-gray-950 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {estimate.totalsByCenter.map(center => (
              <div key={center.id}>
                <div className="text-xs text-gray-500">{center.name}</div>
                <div className="mt-1 font-semibold text-gray-200">{decimal.format(center.hours)} h</div>
              </div>
            ))}
            <div>
              <div className="text-xs text-blue-400">Überschlag gesamt</div>
              <div className="mt-1 text-lg font-bold text-blue-300">{decimal.format(estimate.totalHours)} h</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function CostCenterEditor({ rows, onChange, tracked = false }) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-amber-800/70 bg-amber-950/20 p-4 text-sm text-amber-200">
        Im Betriebsmanagement sind noch keine verwendbaren Kostenstellen hinterlegt. Die Vollkalkulation kann gespeichert werden, sobald dort Stundensätze freigegeben wurden.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700">
      <table className="responsive-card-table w-full min-w-[680px] text-left">
        <thead className="bg-gray-950/70 text-xs uppercase tracking-wide text-gray-400">
          <tr>
            <th className="px-4 py-3">Kostenstelle</th>
            <th className="px-4 py-3">{tracked ? "Iststunden" : "Stunden"}</th>
            <th className="px-4 py-3">Stundensatz</th>
            <th className="px-4 py-3 text-right">Kosten</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {rows.map(row => (
            <tr key={row.id} className="bg-gray-900/30">
              <td data-label="Kostenstelle" className="px-4 py-3">
                <div className="font-medium text-white">{row.name}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {Number.isFinite(row.rateWeightPercent)
                    ? `${decimal.format(row.rateWeightPercent)} % Anteil am Vollstundensatz`
                    : `${row.activityIds?.length || 0} Tätigkeiten zugeordnet`}
                </div>
              </td>
              <td data-label="Stunden" className="px-4 py-3">
                <input aria-label={`Stunden ${row.name}`} type="number" min="0" step="0.25" value={row.hours} onFocus={selectZeroValue} onClick={selectZeroValue} onChange={event => onChange(row.id, "hours", event.target.value)} className="w-28 rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-right outline-none focus:border-blue-500" />
              </td>
              <td data-label="Stundensatz" className="px-4 py-3">
                <input aria-label={`Stundensatz ${row.name}`} type="number" min="0" step="0.01" value={row.hourlyRate} onFocus={selectZeroValue} onClick={selectZeroValue} onChange={event => onChange(row.id, "hourlyRate", event.target.value)} className="w-32 rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-right outline-none focus:border-blue-500" />
              </td>
              <td data-label="Kosten" className="px-4 py-3 text-right font-semibold text-gray-200">{money.format(nonNegativeNumber(row.hours) * nonNegativeNumber(row.hourlyRate))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuickCalculation({ materialCost, quick, setQuick, hourlyRateHint }) {
  const result = useMemo(() => calculateQuick({ materialCost, ...quick }), [materialCost, quick]);
  const change = (field, value) => setQuick(current => ({ ...current, [field]: value }));
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.75fr)]">
      <Card title="Schnellkalkulation" description="Material aus dem Projekteinkauf plus Zeitaufwand mit einem editierbaren Vollstundensatz.">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput label="Material aus Einkauf" suffix="€" value={materialCost} onChange={() => {}} hint="Alle Positionen aus procurement.json, unabhängig von Freigabe und Kaufstatus" readOnly />
          <NumberInput label="Materialzuschlag" suffix="%" value={quick.materialSurchargePercent} onChange={value => change("materialSurchargePercent", value)} />
          <NumberInput label="Arbeitsstunden" suffix="h" step="0.25" value={quick.hours} onChange={value => change("hours", value)} />
          <NumberInput label="Vollstundensatz" suffix="€/h" value={quick.hourlyRate} onChange={value => change("hourlyRate", value)} hint={hourlyRateHint} />
        </div>
        <div className="mt-5 border-t border-gray-700 pt-5">
          <MarkupFields values={quick} onChange={change} />
        </div>
      </Card>
      <Card title="Preisaufbau" description="Skonto und Rabatt werden klassisch rückwärts auf den jeweils höheren Preis hochgerechnet.">
        <CalculationRows result={result} />
      </Card>
    </div>
  );
}

function FullCalculation({ title = "Vollkalkulation", description, materialCost, values, setValues, tracked = false, warning }) {
  const result = useMemo(() => calculateFull({ materialCost, ...values }), [materialCost, values]);
  const change = (field, value) => setValues(current => ({ ...current, [field]: value }));
  const changeCenter = (id, field, value) => setValues(current => ({
    ...current,
    costCenters: current.costCenters.map(center => center.id === id
      ? { ...center, [field]: value === "" ? "" : Number(value) }
      : center)
  }));
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.75fr)]">
      <div className="space-y-6">
        <Card title={title} description={description}>
          {warning}
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberInput label="Material aus Einkauf" suffix="€" value={materialCost} onChange={() => {}} hint="Alle Positionen aus procurement.json, unabhängig von Freigabe und Kaufstatus" readOnly />
            <NumberInput label="Materialeinzelkosten" suffix="€" value={values.materialDirectCosts} onChange={value => change("materialDirectCosts", value)} />
          </div>
          <div className="mt-5">
            <CostCenterEditor rows={values.costCenters} onChange={changeCenter} tracked={tracked} />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <NumberInput label="Verwaltungsgemeinkosten" suffix="%" value={values.administrationOverheadPercent} onChange={value => change("administrationOverheadPercent", value)} />
          </div>
          <div className="mt-5 border-t border-gray-700 pt-5">
            <MarkupFields values={values} onChange={change} />
          </div>
        </Card>
      </div>
      <Card title="Preisaufbau" description="Material, Fertigungsbereiche und Zuschläge in einer durchgängigen Rechnung.">
        <CalculationRows result={result} full />
      </Card>
    </div>
  );
}

function VarianceSummary({ preMode, quick, full, post }) {
  const plannedHours = preMode === "quick"
    ? nonNegativeNumber(quick.hours)
    : full.costCenters.reduce((sum, row) => sum + nonNegativeNumber(row.hours), 0);
  const actualHours = post.costCenters.reduce((sum, row) => sum + nonNegativeNumber(row.hours), 0);
  const plannedCosts = preMode === "quick"
    ? calculateQuick(quick).materialCosts + calculateQuick(quick).laborCosts
    : calculateFull(full).manufacturingCosts;
  const actualCosts = calculateFull(post).manufacturingCosts;
  const cards = [
    ["Vorkalkulation", money.format(plannedCosts), preMode === "quick" ? "Schnellkalkulation" : "Vollkalkulation"],
    ["Nachkalkulation", money.format(actualCosts), "Istbasis"],
    ["Kostenabweichung", money.format(actualCosts - plannedCosts), actualCosts > plannedCosts ? "über Plan" : actualCosts < plannedCosts ? "unter Plan" : "im Plan"],
    ["Stundenabweichung", `${decimal.format(actualHours - plannedHours)} h`, `${decimal.format(actualHours)} h Ist / ${decimal.format(plannedHours)} h Plan`]
  ];
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, detail], index) => (
        <div key={label} className={`rounded-xl border p-4 ${index === 2 && actualCosts > plannedCosts ? "border-red-900 bg-red-950/20" : "border-gray-700 bg-gray-800"}`}>
          <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
          <div className="mt-1 text-xl font-bold text-white">{value}</div>
          <div className="mt-1 text-xs text-gray-400">{detail}</div>
        </div>
      ))}
    </div>
  );
}

function EstimationView({ project, cabinetSummary, materialCost, estimation, onApplyQuick, onApplyFull, managementAvailable }) {
  const confidence = { high: "Hohe Datenbasis", medium: "Mittlere Datenbasis", low: "Geringe Datenbasis", none: "Keine Datenbasis" };
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Projektübersicht" className="lg:col-span-1">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-gray-500">Projekt</dt><dd className="mt-1 font-semibold text-white">{project?.title || "Projekt"}</dd></div>
            <div><dt className="text-gray-500">Beschreibung</dt><dd className="mt-1 text-gray-300">{project?.description || "Keine Beschreibung hinterlegt."}</dd></div>
            <div className="grid grid-cols-2 gap-3 border-t border-gray-700 pt-3">
              <div><dt className="text-gray-500">Korpusse</dt><dd className="mt-1 text-lg font-semibold">{cabinetSummary.cabinetCount}</dd></div>
              <div><dt className="text-gray-500">Komplexität</dt><dd className="mt-1 text-lg font-semibold">{decimal.format(cabinetSummary.complexity)}</dd></div>
              <div><dt className="text-gray-500">Fronten</dt><dd className="mt-1 text-lg font-semibold">{cabinetSummary.fronts}</dd></div>
              <div><dt className="text-gray-500">Material</dt><dd className="mt-1 text-lg font-semibold">{money.format(materialCost)}</dd></div>
            </div>
          </dl>
        </Card>
        <Card
          title="Automatische Stundenschätzung"
          description="Derzeitige Übergangsschätzung aus Iststunden und Projektmerkmalen; später durch die Snapshot- und Embedding-Pipeline ersetzt."
          className="lg:col-span-2"
        >
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm text-gray-400">Geschätzter Gesamtaufwand</p>
              <p className="mt-1 text-4xl font-bold text-blue-300">{estimation.matches.length ? `${decimal.format(estimation.totalHours)} h` : "–"}</p>
              <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                estimation.confidence === "high" ? "bg-emerald-950 text-emerald-300" : estimation.confidence === "none" ? "bg-gray-700 text-gray-300" : "bg-amber-950 text-amber-300"
              }`}>{confidence[estimation.confidence]}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!estimation.matches.length} onClick={onApplyQuick} className="rounded-lg border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-40">In Schnellkalkulation</button>
              <button type="button" disabled={!estimation.matches.length || !managementAvailable} onClick={onApplyFull} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">Auf Kostenstellen verteilen</button>
            </div>
          </div>
          {estimation.hoursByCenter.some(row => row.hours > 0) && (
            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {estimation.hoursByCenter.map(row => (
                <div key={row.id} className="rounded-lg bg-gray-950 px-3 py-2">
                  <div className="truncate text-xs text-gray-500">{row.name}</div>
                  <div className="mt-1 font-semibold">{decimal.format(row.hours)} h</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <Card title="Ähnliche freigegebene Projekte" description="Nur freigegebene Nachkalkulations-Snapshots werden als Vergleichsbasis verwendet.">
          {estimation.matches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-600 p-8 text-center text-sm text-gray-400">
              Noch keine passende freigegebene Nachkalkulation gefunden.
            </div>
          ) : (
            <div className="space-y-3">
              {estimation.matches.map(match => (
                <article key={match.id} className="rounded-xl border border-gray-700 bg-gray-900/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">{match.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-400">{match.description || "Keine Beschreibung"}</p>
                    </div>
                    <span className="rounded-full bg-blue-950 px-2.5 py-1 text-sm font-semibold text-blue-300">{match.score} % ähnlich</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400">
                    <span>{decimal.format(match.totalHours)} Iststunden</span>
                    <span>{match.cabinetSummary.cabinetCount} Korpusse</span>
                    <span>Freigegebene Nachkalkulation</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
        <Card title="Erklärung der Schätzung" description="Nachvollziehbare Begründung der verwendeten Vergleichsbasis.">
          <div className="rounded-xl border border-blue-900/70 bg-blue-950/30 p-4 text-sm leading-6 text-blue-100">
            {estimation.explanation}
          </div>
          <p className="mt-4 text-xs leading-5 text-gray-500">
            Geplante Pipeline: Projektbaum als versionierten Snapshot verdichten, mit einem lokalen Ollama-Embedding-Modell indexieren und passende Snapshots anhand der Suchkriterien abrufen. Ein separates generatives Ollama-Modell formuliert anschließend aus den Treffern die Begründung der Stundenprognose.
          </p>
        </Card>
      </div>
    </div>
  );
}

export default function CalculationView() {
  const { projectId } = useParams();
  const [section, setSection] = useState("pre");
  const [preMode, setPreMode] = useState("quick");
  const [estimationMode, setEstimationMode] = useState("estimate");
  const [project, setProject] = useState(null);
  const [cabinets, setCabinets] = useState([]);
  const [partList, setPartList] = useState([]);
  const [materialCost, setMaterialCost] = useState(0);
  const [management, setManagement] = useState({ available: false, approved: false, costCenters: [], easyRates: [] });
  const [historicalProjects, setHistoricalProjects] = useState([]);
  const [estimationSettings, setEstimationSettings] = useState(() => normalizeEstimationSettings());
  const [quick, setQuick] = useState(emptyQuick);
  const [full, setFull] = useState(emptyFull);
  const [post, setPost] = useState(emptyFull);
  const [cabinetHours, setCabinetHours] = useState({});
  const [unmappedHours, setUnmappedHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loadCalculationWorkspace(projectId)
      .then(workspace => {
        if (!active) return;
        const saved = workspace.calculation || {};
        const rates = workspace.context?.management || { available: false, approved: false, costCenters: [], easyRates: [] };
        const availableCenters = rates.costCenters.length ? rates.costCenters : rates.easyRates;
        const actual = aggregateTimeEntries(workspace.context?.currentTimeEntries || [], availableCenters);
        const hasCombinedRate = rates.fullHourlyRate !== null
          && rates.fullHourlyRate !== undefined
          && rates.fullHourlyRate !== ""
          && Number.isFinite(Number(rates.fullHourlyRate));
        const defaultQuickRate = hasCombinedRate
          ? nonNegativeNumber(rates.fullHourlyRate)
          : rates.easyRates[0]?.hourlyRate
            || (rates.costCenters.length
              ? rates.costCenters.reduce((sum, center) => sum + nonNegativeNumber(center.hourlyRate), 0) / rates.costCenters.length
              : 0);
        setProject(workspace.project);
        setCabinets(workspace.cabinets);
        setPartList(workspace.partList || []);
        setMaterialCost(purchasingMaterialCost(workspace.procurement));
        setManagement(rates);
        setHistoricalProjects(workspace.context?.historicalProjects || []);
        setEstimationSettings(normalizeEstimationSettings(workspace.context?.estimationSettings));
        setSection(saved.section || "pre");
        setPreMode(saved.preMode || "quick");
        setEstimationMode(saved.estimationMode || "estimate");
        setQuick({ ...emptyQuick, ...saved.quick, hourlyRate: saved.quick?.hourlyRate ?? Math.round(defaultQuickRate * 100) / 100 });
        setFull({
          ...emptyFull,
          ...saved.full,
          costCenters: mergeCostCenters(availableCenters, saved.full?.costCenters)
        });
        setPost({
          ...emptyFull,
          ...saved.post,
          costCenters: mergeCostCenters(availableCenters, saved.post?.costCenters, actual.rows)
        });
        setCabinetHours(saved.cabinetHours || {});
        setUnmappedHours(actual.unmappedHours);
      })
      .catch(loadError => {
        console.error("Kalkulation konnte nicht geladen werden", loadError);
        if (active) setError("Die Projektkalkulation konnte nicht geladen werden.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [projectId]);

  const cabinetSummary = useMemo(() => summarizeCabinets(cabinets), [cabinets]);
  const estimation = useMemo(() => estimateProjectHours({
    project: project || {},
    cabinets,
    partList,
    candidates: historicalProjects,
    costCenters: full.costCenters,
    settings: estimationSettings
  }), [project, cabinets, partList, historicalProjects, full.costCenters, estimationSettings]);
  const quickResult = useMemo(() => calculateQuick({ materialCost, ...quick }), [materialCost, quick]);
  const fullResult = useMemo(() => calculateFull({ materialCost, ...full }), [materialCost, full]);
  const postResult = useMemo(() => calculateFull({ materialCost, ...post }), [materialCost, post]);

  const createCalculationDocument = updatedAt => ({
    version: 2,
    updatedAt,
    section,
    preMode,
    estimationMode,
    quick,
    full,
    post,
    cabinetHours,
    results: { quick: quickResult, full: fullResult, post: postResult }
  });

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updatedAt = new Date().toISOString();
      await saveCalculation(projectId, createCalculationDocument(updatedAt));
      setMessage("Kalkulation wurde gespeichert.");
    } catch (saveError) {
      console.error("Kalkulation konnte nicht gespeichert werden", saveError);
      setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setSaving(false);
    }
  };

  const releasePostCalculation = async () => {
    setReleasing(true);
    setMessage("");
    setError("");
    try {
      await saveCalculation(projectId, createCalculationDocument(new Date().toISOString()));
      const snapshot = await releaseCalculationSnapshot(projectId);
      const releasedAt = new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(snapshot.releasedAt));
      setMessage(`Nachkalkulation wurde freigegeben · ${releasedAt}.`);
    } catch (releaseError) {
      console.error("Nachkalkulation konnte nicht freigegeben werden", releaseError);
      setError(releaseError?.response?.data?.message || "Freigabe der Nachkalkulation fehlgeschlagen.");
    } finally {
      setReleasing(false);
    }
  };

  const applyFullEstimate = () => {
    setFull(current => ({
      ...current,
      costCenters: current.costCenters.map(center => ({
        ...center,
        hours: estimation.hoursByCenter.find(row => row.id === center.id)?.hours || 0
      }))
    }));
    setPreMode("full");
    setSection("pre");
    setMessage("Stundenschätzung wurde in die Vollkalkulation übernommen.");
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-900 text-white">
      <SideBar selected={2} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-gray-700"><ProjectBar selected={11} /></div>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] p-3 sm:p-5 xl:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-sm font-medium uppercase tracking-widest text-blue-400">Projektkalkulation</p>
                <h1 className="mt-1 text-2xl font-bold xl:text-3xl">{project?.title || "Projekt"}</h1>
                <p className="mt-2 max-w-3xl text-gray-400">Vor- und Nachkalkulation mit Einkaufswerten, Betriebsstundensätzen und historischen Vergleichsprojekten.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-right">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Materialbasis</div>
                  <div className="mt-0.5 font-semibold">{money.format(materialCost)}</div>
                </div>
                <button type="button" onClick={save} disabled={loading || saving} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? "Speichert …" : "Kalkulation speichern"}
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <SegmentedTabs
                value={section}
                onChange={setSection}
                ariaLabel="Kalkulationsbereich"
                tabs={[
                  { id: "pre", label: "Vorkalkulation" },
                  { id: "post", label: "Nachkalkulation" },
                  { id: "estimate", label: "Stundenschätzung" }
                ]}
              />
              {section === "pre" && (
                <SegmentedTabs
                  value={preMode}
                  onChange={setPreMode}
                  ariaLabel="Art der Vorkalkulation"
                  tabs={[{ id: "quick", label: "Schnellkalkulation" }, { id: "full", label: "Vollkalkulation" }]}
                />
              )}
              {section === "estimate" && (
                <SegmentedTabs
                  value={estimationMode}
                  onChange={setEstimationMode}
                  ariaLabel="Art der Stundenschätzung"
                  tabs={[{ id: "estimate", label: "Schätzung" }, { id: "assistant", label: "Assistent" }]}
                />
              )}
              {section === "post" && (
                <button
                  type="button"
                  onClick={releasePostCalculation}
                  disabled={saving || releasing}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {releasing ? "Wird freigegeben …" : "Nachkalkulation freigeben"}
                </button>
              )}
            </div>

            {!management.approved && !loading && (
              <div className="mt-5 rounded-xl border border-amber-800/70 bg-amber-950/25 px-4 py-3 text-sm text-amber-200">
                Die Stundensätze im Betriebsmanagement sind noch nicht freigegeben oder nicht vorhanden. Vorhandene Werte bleiben manuell editierbar.
              </div>
            )}
            {message && <div className="mt-5 rounded-xl border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">{message}</div>}
            {error && <div role="alert" className="mt-5 rounded-xl border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div>}

            {loading ? (
              <div className="mt-6 rounded-2xl border border-gray-700 bg-gray-800 p-12 text-center text-gray-400">Kalkulationsdaten werden geladen …</div>
            ) : (
              <div className="mt-6">
                {section === "pre" && preMode === "quick" && (
                  <QuickCalculation
                    materialCost={materialCost}
                    quick={quick}
                    setQuick={setQuick}
                    hourlyRateHint={management.rateSource === "staff-allocation"
                      ? `Gewichteter Mittelwert aus ${management.staffCount} Mitarbeiter${management.staffCount === 1 ? "" : "n"}; jederzeit editierbar`
                      : "Aus Management vorbelegt, jederzeit editierbar"}
                  />
                )}
                {section === "pre" && preMode === "full" && (
                  <FullCalculation materialCost={materialCost} values={full} setValues={setFull} description="Fertigungskosten je Kostenstelle mit editierbaren Stunden und Stundensätzen aus dem Betriebsmanagement." />
                )}
                {section === "post" && (
                  <>
                    <VarianceSummary
                      preMode={preMode}
                      quick={{ materialCost, ...quick }}
                      full={{ materialCost, ...full }}
                      post={{ materialCost, ...post }}
                    />
                    <FullCalculation
                      title="Nachkalkulation"
                      description="Tatsächlich erfasste Projektstunden werden Kostenstellen zugeordnet und können für Korrekturen überschrieben werden."
                      materialCost={materialCost}
                      values={post}
                      setValues={setPost}
                      tracked
                      warning={unmappedHours > 0 ? (
                        <div className="mb-5 rounded-lg border border-amber-800 bg-amber-950/25 p-3 text-sm text-amber-200">
                          {decimal.format(unmappedHours)} h konnten keiner Kostenstelle zugeordnet werden. Bitte die Tätigkeitszuordnung im Betriebsmanagement prüfen.
                        </div>
                      ) : null}
                    />
                  </>
                )}
                {section === "estimate" && estimationMode === "estimate" && (
                  <CabinetHours
                    summary={cabinetSummary}
                    values={cabinetHours}
                    costCenters={full.costCenters}
                    onChange={(cabinetId, centerId, value) => setCabinetHours(current => {
                      const savedCabinet = current[cabinetId];
                      const normalizedCabinet = savedCabinet && typeof savedCabinet === "object"
                        ? savedCabinet
                        : savedCabinet !== undefined && full.costCenters[0]
                          ? { [full.costCenters[0].id]: savedCabinet }
                          : {};
                      return {
                        ...current,
                        [cabinetId]: { ...normalizedCabinet, [centerId]: value }
                      };
                    })}
                    onApplyQuick={hours => {
                      setQuick(current => ({ ...current, hours: Math.round(hours * 100) / 100 }));
                      setPreMode("quick");
                      setSection("pre");
                      setMessage("Manuelle Stundenschätzung wurde in die Schnellkalkulation übernommen.");
                    }}
                    onApplyFull={totals => {
                      setFull(current => ({
                        ...current,
                        costCenters: current.costCenters.map(center => ({
                          ...center,
                          hours: totals.find(total => total.id === center.id)?.hours || 0
                        }))
                      }));
                      setPreMode("full");
                      setSection("pre");
                      setMessage("Manuelle Stundenschätzung wurde nach Kostenstellen in die Vollkalkulation übernommen.");
                    }}
                  />
                )}
                {section === "estimate" && estimationMode === "assistant" && (
                  <EstimationView
                    project={project}
                    cabinetSummary={cabinetSummary}
                    materialCost={materialCost}
                    estimation={estimation}
                    managementAvailable={full.costCenters.length > 0}
                    onApplyQuick={() => {
                      setQuick(current => ({ ...current, hours: estimation.totalHours }));
                      setPreMode("quick");
                      setSection("pre");
                      setMessage("Stundenschätzung wurde in die Schnellkalkulation übernommen.");
                    }}
                    onApplyFull={applyFullEstimate}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
