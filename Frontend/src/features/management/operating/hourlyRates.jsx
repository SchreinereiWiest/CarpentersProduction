import { useMemo, useState } from "react";
import { calculateHourlyRates } from "@Engine/management/calculation/hourlyRates.mjs";
import { useManagement } from "../hooks/useManagement.js";

const inputClass = "w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-right text-white outline-none focus:border-blue-500";
const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const decimal = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
const overheadDefaults = [
  ["space-energy", "Raumkosten und Energie"],
  ["administration", "Verwaltung und Vertrieb"],
  ["insurance", "Versicherungen und Beiträge"],
  ["vehicles", "Fahrzeuge und Logistik"],
  ["depreciation", "Abschreibungen"],
  ["financing", "Fremdkapitalzinsen"],
  ["imputed-owner", "Kalkulatorischer Unternehmerlohn"],
  ["imputed-interest", "Kalkulatorische Zinsen"],
  ["imputed-risk", "Kalkulatorisches Wagnis"],
  ["other", "Sonstige Unternehmenskosten"]
].map(([id, label]) => ({ id, label, amount: 0 }));

function createDraft(workTypes, saved) {
  const existing = saved?.activities || [];
  return {
    profitPercent: saved?.profitPercent ?? 10,
    overheadCosts: overheadDefaults.map(item => saved?.overheadCosts?.find(entry => entry.id === item.id) || item),
    activities: workTypes.map(type => {
      const value = existing.find(item => item.id === type.id) || {};
      return {
        id: type.id,
        name: type.label,
        productiveHours: value.productiveHours ?? 0,
        personnelCosts: value.personnelCosts ?? 0,
        otherDirectCosts: value.otherDirectCosts ?? 0,
        machineCosts: value.machineCosts ?? 0,
        machineHours: value.machineHours ?? 0,
        machineUsagePercent: value.machineUsagePercent ?? 0
      };
    })
  };
}

export default function HourlyRates() {
  const { workspace, companySettings, year, busy, request } = useManagement();
  const sourceKey = `${year}:${workspace.rateCalculation?.savedAt || "new"}`;
  const [draftState, setDraftState] = useState(() => ({
    key: sourceKey,
    value: createDraft(companySettings.workTypes, workspace.rateCalculation)
  }));
  const draft = draftState.key === sourceKey
    ? draftState.value
    : createDraft(companySettings.workTypes, workspace.rateCalculation);
  const setDraft = updater => setDraftState({
    key: sourceKey,
    value: typeof updater === "function" ? updater(draft) : updater
  });
  const result = useMemo(() => calculateHourlyRates(draft), [draft]);
  const [importState, setImportState] = useState(null);
  const timeImport = useMemo(() => {
    const salaryByEmployee = Object.fromEntries((workspace.employeeProfiles || []).map(profile => [profile.userId, Number(profile.annualSalary || 0)]));
    const employeeTotalMinutes = Object.fromEntries(workspace.employees.map(employee => [employee.id, 0]));
    const activityIds = new Set(draft.activities.map(activity => activity.id));
    (workspace.timeSummary || []).filter(row => activityIds.has(row.workType) && !row.customWorkType).forEach(row => {
      employeeTotalMinutes[row.userId] = (employeeTotalMinutes[row.userId] || 0) + Number(row.minutes || 0);
    });
    const rows = draft.activities.map(activity => {
    const byEmployee = Object.fromEntries(workspace.employees.map(employee => [employee.id, 0]));
    (workspace.timeSummary || []).filter(row => row.workType === activity.id && !row.customWorkType).forEach(row => {
      byEmployee[row.userId] = (byEmployee[row.userId] || 0) + Number(row.minutes || 0);
    });
    const personnelByEmployee = Object.fromEntries(workspace.employees.map(employee => {
      const totalMinutes = employeeTotalMinutes[employee.id] || 0;
      const allocatedSalary = totalMinutes > 0 ? (salaryByEmployee[employee.id] || 0) * (byEmployee[employee.id] || 0) / totalMinutes : 0;
      return [employee.id, allocatedSalary];
    }));
    return {
      id: activity.id,
      name: activity.name,
      byEmployee,
      personnelByEmployee,
      totalHours: Object.values(byEmployee).reduce((sum, minutes) => sum + minutes, 0) / 60,
      personnelCosts: Object.values(personnelByEmployee).reduce((sum, value) => sum + value, 0)
    };
    });
    const totalHours = rows.reduce((sum, row) => sum + row.totalHours, 0);
    return {
      rows: rows.map(row => ({ ...row, overheadShare: totalHours > 0 ? row.totalHours / totalHours * 100 : 0 })),
      salaryByEmployee,
      unallocatedSalary: workspace.employees.reduce((sum, employee) => sum + ((employeeTotalMinutes[employee.id] || 0) > 0 ? 0 : (salaryByEmployee[employee.id] || 0)), 0),
      missingSalaryEmployees: workspace.employees.filter(employee => (employeeTotalMinutes[employee.id] || 0) > 0 && !(salaryByEmployee[employee.id] > 0)).map(employee => employee.name)
    };
  }, [draft.activities, workspace.employeeProfiles, workspace.employees, workspace.timeSummary]);
  const timeImportRows = timeImport.rows;
  const complete = draft.activities.length > 0
    && draft.activities.every(item => Number(item.productiveHours) > 0 && (Number(item.machineCosts) <= 0 || Number(item.machineHours) > 0))
    && result.rates.every(rate => rate.hourlyRate > 0);

  const updateOverhead = (id, amount) => setDraft(current => ({
    ...current,
    overheadCosts: current.overheadCosts.map(item => item.id === id ? { ...item, amount } : item)
  }));
  const updateActivity = (id, field, value) => setDraft(current => ({
    ...current,
    activities: current.activities.map(item => item.id === id ? { ...item, [field]: value } : item)
  }));
  const save = () => request("put", "/rates", draft, `Stundensätze für ${year} gespeichert und mit der Projektkalkulation verbunden.`);
  const openTimeImport = () => setImportState({
    selected: Object.fromEntries(timeImportRows.map(row => [row.id, row.totalHours > 0]))
  });
  const applyTimeImport = () => {
    setDraft(current => ({
      ...current,
      activities: current.activities.map(activity => {
        const source = timeImportRows.find(row => row.id === activity.id);
        return importState.selected[activity.id] && source
          ? {
            ...activity,
            productiveHours: Math.round(source.totalHours * 100) / 100,
            personnelCosts: Math.round(source.personnelCosts * 100) / 100
          }
          : activity;
      })
    }));
    setImportState(null);
  };

  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold">Stunden- und Maschinenstundensätze {year}</h1>
      <p className="mt-1 max-w-4xl text-sm text-gray-400">Lineare Vollkostenkalkulation für alle Tätigkeiten aus den Unternehmenseinstellungen. Beträge werden netto und als Jahreswerte erfasst; die fertigen Selbstkostensätze stehen danach automatisch in jeder Projektkalkulation bereit.</p>
    </div>

    <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
      <Step number="1" title="Allgemeine Unternehmenskosten" description="Kosten, die nicht direkt einer Tätigkeit zugerechnet werden können. Sie werden transparent nach produktiven Stunden verteilt." />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {draft.overheadCosts.map(item => <label key={item.id} className="rounded-xl bg-gray-900 p-3 text-sm text-gray-400">
          <span className="mb-2 block min-h-5">{item.label}</span>
          <div className="flex items-center gap-2"><input type="number" min="0" step="0.01" value={item.amount} onChange={event => updateOverhead(item.id, event.target.value)} className={inputClass} /><span>€/Jahr</span></div>
        </label>)}
      </div>
      <div className="mt-4 rounded-xl border border-blue-950 bg-blue-950/30 p-4 text-sm text-blue-200">Gemeinkosten gesamt: <strong>{money.format(result.totalOverheadCosts)}</strong>. Kalkulatorischer Unternehmerlohn, kalkulatorische Zinsen und Wagnis sind bewusst einzeln enthalten.</div>
    </section>

    <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Step number="2" title="Leistungsbereiche und produktive Kapazität" description="Personalkosten werden aus dem erfassten Jahreslohn beziehungsweise -gehalt verteilt; Arbeitgeberanteile können bereits in diesem Jahreswert berücksichtigt werden. Maschinenkosten enthalten Abschreibung/Leasing, Energie, Wartung und Raumanteil, soweit diese nicht schon oben erfasst sind." />
        <button type="button" onClick={openTimeImport} className="rounded-lg border border-blue-800 px-4 py-2 text-sm font-medium text-blue-300 hover:bg-blue-950">Daten abgreifen</button>
      </div>
      <div className="mt-5 overflow-x-auto rounded-xl border border-gray-700">
        <table className="min-w-[1250px] w-full text-sm">
          <thead className="bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-500"><tr>
            <th className="px-4 py-3">Tätigkeit / Kostenstelle</th><th className="px-3 py-3">Produktive h/Jahr</th><th className="px-3 py-3">Personalkosten/Jahr</th><th className="px-3 py-3">Sonstige direkte Kosten</th><th className="px-3 py-3">Maschinenkosten/Jahr</th><th className="px-3 py-3">Maschinen-h/Jahr</th><th className="px-3 py-3">Maschinenanteil</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-700">
            {draft.activities.map(item => <tr key={item.id}>
              <td className="px-4 py-3"><strong>{item.name}</strong><span className="mt-1 block text-xs text-gray-600">{item.id}</span></td>
              <NumberCell value={item.productiveHours} suffix="h" onChange={value => updateActivity(item.id, "productiveHours", value)} />
              <NumberCell value={item.personnelCosts} suffix="€" onChange={value => updateActivity(item.id, "personnelCosts", value)} />
              <NumberCell value={item.otherDirectCosts} suffix="€" onChange={value => updateActivity(item.id, "otherDirectCosts", value)} />
              <NumberCell value={item.machineCosts} suffix="€" onChange={value => updateActivity(item.id, "machineCosts", value)} />
              <NumberCell value={item.machineHours} suffix="h" onChange={value => updateActivity(item.id, "machineHours", value)} />
              <NumberCell value={item.machineUsagePercent} suffix="%" max="100" onChange={value => updateActivity(item.id, "machineUsagePercent", value)} />
            </tr>)}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-500">Mit „Daten abgreifen“ werden produktive Stunden, anteilige Personalkosten und der Gemeinkostenschlüssel automatisch aus Zeit- und Lohndaten übernommen. Manuell bleiben sonstige direkte Kosten, Maschinenkosten, Maschinenstunden und der Maschinenanteil. Maschinenanteil bedeutet: In wie viel Prozent einer Tätigkeitsstunde wird die berechnete Maschine typischerweise genutzt?</p>
    </section>

    <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
      <Step number="3" title="Ergebnis und Projektübernahme" description="Selbstkosten decken direkte Kosten, Gemeinkosten und den typischen Maschinenanteil. Der Verkaufssatz ergänzt den Gewinn-/Sicherheitsaufschlag." />
      <div className="mt-5 flex max-w-sm items-end gap-3">
        <label className="text-sm text-gray-400"><span className="mb-1.5 block">Gewinn-/Sicherheitsaufschlag</span><div className="flex items-center gap-2"><input type="number" min="0" step="0.1" value={draft.profitPercent} onChange={event => setDraft(current => ({ ...current, profitPercent: event.target.value }))} className={inputClass} /><span>%</span></div></label>
      </div>
      <div className="mt-5 overflow-x-auto rounded-xl border border-gray-700">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-500"><tr><th className="px-4 py-3">Tätigkeit</th><th className="px-4 py-3 text-right">Gemeinkostenanteil</th><th className="px-4 py-3 text-right">Basis / h</th><th className="px-4 py-3 text-right">Maschine / h</th><th className="px-4 py-3 text-right">Selbstkosten / h</th><th className="px-4 py-3 text-right">Verkauf / h</th></tr></thead>
          <tbody className="divide-y divide-gray-700">
            {result.rates.map(rate => <tr key={rate.id}><td className="px-4 py-3 font-medium">{rate.name}</td><td className="px-4 py-3 text-right text-gray-400">{money.format(rate.allocatedOverhead)} ({decimal.format(rate.allocationPercent)} %)</td><td className="px-4 py-3 text-right">{money.format(rate.baseHourlyRate)}</td><td className="px-4 py-3 text-right">{money.format(rate.machineHourlyRate)}</td><td className="px-4 py-3 text-right font-semibold text-blue-300">{money.format(rate.hourlyRate)}</td><td className="px-4 py-3 text-right font-semibold text-green-300">{money.format(rate.sellingRate)}</td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gray-900 p-4">
        <div><p className="text-sm text-gray-500">Gewichteter Vollstundensatz</p><p className="mt-1 text-2xl font-semibold text-blue-300">{money.format(result.fullHourlyRate)} / h</p></div>
        <button type="button" disabled={busy || !complete} onClick={save} className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50">Sätze speichern und in Projekte übernehmen</button>
      </div>
      {!complete && <p className="mt-3 text-right text-xs text-amber-300">Zum Speichern benötigt jede Tätigkeit produktive Stunden und einen positiven Selbstkostensatz; Maschinenkosten benötigen Maschinenstunden.</p>}
      {workspace.rateCalculation?.savedAt && <p className="mt-3 text-right text-xs text-gray-500">Zuletzt gespeichert: {new Date(workspace.rateCalculation.savedAt).toLocaleString("de-DE")}</p>}
    </section>

    {importState && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Jahresdaten aus Zeiterfassung und Löhnen übernehmen">
      <div className="max-h-[90dvh] w-full max-w-6xl overflow-auto rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-semibold">Jahresdaten aus Zeiterfassung und Löhnen übernehmen</h2><span className="rounded-full bg-blue-950 px-3 py-1 text-sm font-semibold text-blue-300">Erfassungszeitraum 01.01.{year} – 31.12.{year}</span></div><p className="mt-1 max-w-4xl text-sm text-gray-400">Produktive Stunden werden je Mitarbeiter und Kostenstelle summiert. Das hinterlegte Jahresgehalt jedes Mitarbeiters wird im Verhältnis seiner produktiven Stunden auf die Kostenstellen verteilt. Der Stundenanteil der Kostenstelle an allen produktiven Stunden ist zugleich ihr Gemeinkostenschlüssel.</p></div>
          <button type="button" aria-label="Dialog schließen" onClick={() => setImportState(null)} className="rounded-lg border border-gray-700 px-3 py-2">✕</button>
        </div>
        <div className="mt-5 overflow-x-auto rounded-xl border border-gray-700">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-500"><tr><th className="px-3 py-3">Übernehmen</th><th className="px-3 py-3">Kostenstelle</th>{workspace.employees.map(employee => <th key={employee.id} className="px-3 py-3 text-right"><span className="block">{employee.name}</span><span className="normal-case text-gray-600">{money.format(timeImport.salaryByEmployee[employee.id] || 0)} Lohn/Jahr</span></th>)}<th className="px-3 py-3 text-right text-blue-300">Produktive h</th><th className="px-3 py-3 text-right text-blue-300">Personalkosten</th><th className="px-3 py-3 text-right text-blue-300">Gemeinkostenschlüssel</th></tr></thead>
            <tbody className="divide-y divide-gray-700">{timeImportRows.map(row => <tr key={row.id}>
              <td className="px-3 py-3"><input aria-label={`${row.name} übernehmen`} type="checkbox" checked={Boolean(importState.selected[row.id])} onChange={event => setImportState(current => ({ selected: { ...current.selected, [row.id]: event.target.checked } }))} /></td>
              <td className="px-3 py-3 font-medium">{row.name}</td>
              {workspace.employees.map(employee => <td key={employee.id} className="px-3 py-3 text-right text-gray-400"><span className="block">{decimal.format((row.byEmployee[employee.id] || 0) / 60)} h</span><span className="text-xs text-gray-600">{money.format(row.personnelByEmployee[employee.id] || 0)}</span></td>)}
              <td className="px-3 py-3 text-right font-semibold text-blue-300">{decimal.format(row.totalHours)} h</td><td className="px-3 py-3 text-right font-semibold text-blue-300">{money.format(row.personnelCosts)}</td><td className="px-3 py-3 text-right font-semibold text-blue-300">{decimal.format(row.overheadShare)} %</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="mt-4 rounded-xl border border-blue-900/60 bg-blue-950/30 p-3 text-xs text-blue-200">Übernommen werden nur produktive Jahresstunden und anteilige Personalkosten. Maschinenstunden und Maschinenkosten bleiben bewusst manuelle Werte. Die Gemeinkosten werden in der Kalkulation automatisch anhand des angezeigten Stundenschlüssels verteilt.</div>
        {timeImport.unallocatedSalary > 0 && <div className="mt-3 rounded-xl border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-200">{money.format(timeImport.unallocatedSalary)} Jahreslohn konnten nicht verteilt werden, weil für die betreffenden Mitarbeiter keine produktiven Stunden auf den konfigurierten Kostenstellen vorliegen.</div>}
        {timeImport.missingSalaryEmployees.length > 0 && <div className="mt-3 rounded-xl border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-200">Für {timeImport.missingSalaryEmployees.join(", ")} liegen produktive Stunden, aber kein Jahreslohn vor. Deren Personalkosten bleiben deshalb bei 0 €.</div>}
        <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setImportState(null)} className="rounded-lg border border-gray-700 px-4 py-2">Abbrechen</button><button type="button" onClick={applyTimeImport} className="rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500">Jahressummen übernehmen</button></div>
      </div>
    </div>}
  </div>;
}

function Step({ number, title, description }) { return <div className="flex gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-600 font-semibold">{number}</span><div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 max-w-5xl text-sm text-gray-400">{description}</p></div></div>; }
function NumberCell({ value, onChange, suffix, max }) { return <td className="px-3 py-3"><div className="flex items-center gap-2"><input aria-label={suffix} type="number" min="0" max={max} step="0.01" value={value} onChange={event => onChange(event.target.value)} className={inputClass} /><span className="text-gray-500">{suffix}</span></div></td>; }
