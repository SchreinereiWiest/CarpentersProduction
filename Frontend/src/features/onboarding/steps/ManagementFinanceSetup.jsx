import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { calculateHourlyRates } from "@Engine/management/calculation/hourlyRates.mjs";
import { loadCompanySettings } from "../../../shared/settings/company-settings.js";

const currentBerlinYear = () => Number(new Intl.DateTimeFormat("en", { timeZone: "Europe/Berlin", year: "numeric" }).format(new Date()));
const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const inputClass = "w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-blue-500";
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

const createDraft = (workTypes, saved) => ({
  profitPercent: saved?.profitPercent ?? 10,
  overheadCosts: overheadDefaults.map(item => saved?.overheadCosts?.find(entry => entry.id === item.id) || item),
  activities: workTypes.map(type => {
    const value = saved?.activities?.find(item => item.id === type.id) || {};
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
});

export default function ManagementFinanceSetup() {
  const [year, setYear] = useState(currentBerlinYear);
  const [workspace, setWorkspace] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      axios.get("/api/management/workspace", { params: { year }, signal: controller.signal }),
      loadCompanySettings()
    ]).then(([response, settings]) => {
      const data = response.data;
      setWorkspace(data);
      setCompanySettings(settings);
      setProfiles(Object.fromEntries(data.employees.map(employee => {
        const saved = data.employeeProfiles.find(profile => profile.userId === employee.id);
        return [employee.id, { vacationDays: saved?.vacationDays ?? 30, annualSalary: saved?.annualSalary ?? 0 }];
      })));
      setDraft(createDraft(settings.workTypes, data.rateCalculation));
    }).catch(error => {
      if (!controller.signal.aborted) setMessage({ type: "error", text: error.response?.data?.message || "Managementdaten konnten nicht geladen werden." });
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [year]);

  const result = useMemo(() => calculateHourlyRates(draft || {}), [draft]);
  const updateProfile = (userId, key, value) => setProfiles(current => ({ ...current, [userId]: { ...current[userId], [key]: value } }));
  const updateActivity = (id, key, value) => setDraft(current => ({ ...current, activities: current.activities.map(item => item.id === id ? { ...item, [key]: Number(value) } : item) }));

  const saveProfiles = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await Promise.all(workspace.employees.filter(employee => employee.isActive).map(employee => axios.put(`/api/management/employees/${employee.id}/profile`, profiles[employee.id], { params: { year } })));
      setMessage({ type: "success", text: "Urlaubsanspruch und Jahresgehälter wurden gespeichert." });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Mitarbeiterdaten konnten nicht gespeichert werden." });
    } finally {
      setBusy(false);
    }
  };

  const distributeSalaries = () => {
    const totalSalary = Object.values(profiles).reduce((sum, profile) => sum + Number(profile.annualSalary || 0), 0);
    const totalHours = draft.activities.reduce((sum, activity) => sum + Number(activity.productiveHours || 0), 0);
    if (!totalSalary || !totalHours) {
      setMessage({ type: "error", text: "Hinterlege zuerst Jahresgehälter und produktive Stunden." });
      return;
    }
    setDraft(current => ({ ...current, activities: current.activities.map(activity => ({
      ...activity,
      personnelCosts: Math.round(totalSalary * Number(activity.productiveHours || 0) / totalHours * 100) / 100
    })) }));
    setMessage({ type: "success", text: "Personalkosten wurden nach produktiven Stunden auf die Tätigkeiten verteilt. Du kannst die Werte weiter anpassen." });
  };

  const saveRates = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await axios.put("/api/management/rates", draft, { params: { year } });
      setMessage({ type: "success", text: `Die Stundensatzkalkulation für ${year} ist gespeichert und steht in Projekten bereit.` });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Die Stundensätze konnten noch nicht gespeichert werden." });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-8 text-sm text-gray-400">Management-Grundlagen werden geladen …</div>;
  if (!workspace || !draft || !companySettings) return <div className="p-8 text-sm text-red-300">{message?.text || "Managementdaten sind nicht verfügbar."}</div>;

  const ready = draft.activities.length > 0 && draft.activities.every(activity => Number(activity.productiveHours) > 0) && result.rates.every(rate => rate.hourlyRate > 0);

  return <div className="h-full overflow-y-auto p-5 sm:p-7">
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-xl font-semibold">Betriebsdaten und Stundensatzkalkulation</h1><p className="mt-1 max-w-3xl text-sm text-gray-400">Erfasse die Jahresbasis für Personal, Gemeinkosten und Leistungsbereiche. Daraus entstehen nachvollziehbare Selbstkosten- und Verkaufssätze.</p></div><label className="text-sm text-gray-400">Geschäftsjahr<input type="number" min="2000" max="2200" value={year} onChange={event => { setLoading(true); setMessage(null); setYear(Number(event.target.value)); }} className={`${inputClass} mt-1 w-28`} /></label></div>
      {message && <div className={`rounded-xl border px-4 py-3 text-sm ${message.type === "success" ? "border-green-800 bg-green-950/30 text-green-300" : "border-red-800 bg-red-950/30 text-red-300"}`}>{message.text}</div>}

      <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="text-xs font-semibold uppercase tracking-wider text-blue-400">1 · Personalbasis</span><h2 className="mt-1 font-semibold">Urlaub und Personalkosten</h2><p className="mt-1 text-sm text-gray-500">Jahresgehalt inklusive Arbeitgeberanteilen eintragen. Es wird nur im Managementbereich verwendet.</p></div><button type="button" disabled={busy} onClick={saveProfiles} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50">Mitarbeiterdaten speichern</button></div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">{workspace.employees.filter(employee => employee.isActive).map(employee => <div key={employee.id} className="grid gap-3 rounded-xl border border-gray-700 bg-gray-900 p-4 sm:grid-cols-[1fr_150px_190px]"><div><strong>{employee.name}</strong><p className="mt-1 text-xs text-gray-500">{employee.role}</p></div><label className="text-xs text-gray-400">Urlaubstage<input type="number" min="0" max="366" step="0.5" value={profiles[employee.id]?.vacationDays ?? 30} onChange={event => updateProfile(employee.id, "vacationDays", Number(event.target.value))} className={`${inputClass} mt-1`} /></label><label className="text-xs text-gray-400">Jahresgehalt inkl. AG<input type="number" min="0" step="100" value={profiles[employee.id]?.annualSalary ?? 0} onChange={event => updateProfile(employee.id, "annualSalary", Number(event.target.value))} className={`${inputClass} mt-1 text-right`} /></label></div>)}</div>
      </section>

      <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5"><span className="text-xs font-semibold uppercase tracking-wider text-blue-400">2 · Gemeinkosten</span><h2 className="mt-1 font-semibold">Jährliche Unternehmenskosten</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{draft.overheadCosts.map(item => <label key={item.id} className="rounded-xl bg-gray-900 p-3 text-sm text-gray-400"><span className="mb-2 block">{item.label}</span><div className="flex items-center gap-2"><input type="number" min="0" step="100" value={item.amount} onChange={event => setDraft(current => ({ ...current, overheadCosts: current.overheadCosts.map(cost => cost.id === item.id ? { ...cost, amount: Number(event.target.value) } : cost) }))} className={`${inputClass} text-right`} /><span>€/Jahr</span></div></label>)}</div><p className="mt-4 text-sm text-blue-300">Gemeinkosten gesamt: <strong>{money.format(result.totalOverheadCosts)}</strong></p></section>

      <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="text-xs font-semibold uppercase tracking-wider text-blue-400">3 · Leistungsbereiche</span><h2 className="mt-1 font-semibold">Produktive Kapazität und direkte Kosten</h2></div><button type="button" onClick={distributeSalaries} className="rounded-lg border border-blue-800 px-4 py-2 text-sm text-blue-300 hover:bg-blue-950">Gehälter nach Stunden verteilen</button></div>
        <div className="mt-5 overflow-x-auto rounded-xl border border-gray-700"><table className="min-w-[1120px] w-full text-sm"><thead className="bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-500"><tr><th className="px-3 py-3">Tätigkeit</th><th className="px-3 py-3">Produktive h</th><th className="px-3 py-3">Personalkosten</th><th className="px-3 py-3">Direkte Kosten</th><th className="px-3 py-3">Maschinenkosten</th><th className="px-3 py-3">Maschinen-h</th><th className="px-3 py-3">Maschinenanteil %</th></tr></thead><tbody className="divide-y divide-gray-700">{draft.activities.map(activity => <tr key={activity.id}><td className="px-3 py-3 font-medium">{activity.name}</td>{["productiveHours", "personnelCosts", "otherDirectCosts", "machineCosts", "machineHours", "machineUsagePercent"].map(key => <td key={key} className="px-2 py-2"><input aria-label={`${activity.name} ${key}`} type="number" min="0" max={key === "machineUsagePercent" ? 100 : undefined} step="0.01" value={activity[key]} onChange={event => updateActivity(activity.id, key, event.target.value)} className={`${inputClass} text-right`} /></td>)}</tr>)}</tbody></table></div>
      </section>

      <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><span className="text-xs font-semibold uppercase tracking-wider text-blue-400">4 · Ergebnis</span><h2 className="mt-1 font-semibold">Stundensätze übernehmen</h2></div><label className="text-sm text-gray-400">Gewinn-/Sicherheitsaufschlag<div className="mt-1 flex items-center gap-2"><input type="number" min="0" step="0.1" value={draft.profitPercent} onChange={event => setDraft(current => ({ ...current, profitPercent: Number(event.target.value) }))} className={`${inputClass} w-28 text-right`} /><span>%</span></div></label></div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{result.rates.map(rate => <div key={rate.id} className="rounded-xl border border-gray-700 bg-gray-900 p-4"><p className="font-medium">{rate.name}</p><div className="mt-3 flex items-end justify-between"><span className="text-xs text-gray-500">Selbstkosten / Verkauf</span><span className="text-right"><strong className="block text-lg text-blue-300">{money.format(rate.hourlyRate)}</strong><span className="text-sm text-green-300">{money.format(rate.sellingRate)}</span></span></div></div>)}</div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gray-900 p-4"><div><p className="text-xs text-gray-500">Gewichteter Vollstundensatz</p><p className="mt-1 text-2xl font-semibold text-blue-300">{money.format(result.fullHourlyRate)} / h</p></div><button type="button" disabled={busy || !ready} onClick={saveRates} className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-40">Stundensätze speichern</button></div>
        {!ready && <p className="mt-3 text-right text-xs text-amber-300">Jede Tätigkeit benötigt produktive Stunden und Kosten, aus denen ein positiver Satz entsteht.</p>}
      </section>
    </div>
  </div>;
}
