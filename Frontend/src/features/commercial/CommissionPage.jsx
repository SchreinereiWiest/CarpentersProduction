import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";

import SideBar from "../../shared/components/sideBar.jsx";
import { loadCommission, saveCommissionCalculation } from "./commercialApi.js";

const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const decimal = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
const number = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const round = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

function SummaryCard({ label, value, hint }) {
  return <div className="rounded-xl border border-slate-700 bg-slate-800 p-4"><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-xl font-bold text-white">{value}</div>{hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}</div>;
}

function NumberField({ label, value, onChange, suffix = "€" }) {
  return <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span><span className="relative block"><input type="number" min="0" step="0.01" value={value} onChange={event => onChange(event.target.value === "" ? "" : Number(event.target.value))} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 pr-12 text-right outline-none focus:border-blue-500"/><span className="pointer-events-none absolute right-3 top-2.5 text-sm text-slate-500">{suffix}</span></span></label>;
}

export default function CommissionPage() {
  const { commissionId } = useParams();
  const [commission, setCommission] = useState(null);
  const [calculation, setCalculation] = useState({ projectPrices: {}, additionalCosts: 0, overheadPercent: 0, profitPercent: 0, discountPercent: 0, vatPercent: 19, notes: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loadCommission(commissionId).then(data => {
      if (!active) return;
      setCommission(data);
      const saved = data.calculation && typeof data.calculation === "object" ? data.calculation : {};
      setCalculation({
        projectPrices: Object.fromEntries(data.projects.map(project => [project.id, saved.projectPrices?.[project.id] ?? project.netSellingPrice])),
        additionalCosts: saved.additionalCosts ?? 0,
        overheadPercent: saved.overheadPercent ?? 0,
        profitPercent: saved.profitPercent ?? 0,
        discountPercent: saved.discountPercent ?? 0,
        vatPercent: saved.vatPercent ?? 19,
        notes: saved.notes ?? ""
      });
    }).catch(loadError => setError(loadError.response?.data?.message || "Kommission konnte nicht geladen werden."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [commissionId]);

  const result = useMemo(() => {
    const projectBase = round(Object.values(calculation.projectPrices).reduce((sum, value) => sum + number(value), 0));
    const withAdditional = round(projectBase + number(calculation.additionalCosts));
    const overhead = round(withAdditional * number(calculation.overheadPercent) / 100);
    const profit = round((withAdditional + overhead) * number(calculation.profitPercent) / 100);
    const beforeDiscount = round(withAdditional + overhead + profit);
    const discount = round(beforeDiscount * Math.min(99.99, number(calculation.discountPercent)) / 100);
    const net = round(beforeDiscount - discount);
    const vat = round(net * number(calculation.vatPercent) / 100);
    return { projectBase, additionalCosts: number(calculation.additionalCosts), overhead, profit, beforeDiscount, discount, net, vat, gross: round(net + vat) };
  }, [calculation]);

  const change = (key, value) => setCalculation(current => ({ ...current, [key]: value }));
  const changeProject = (id, value) => setCalculation(current => ({ ...current, projectPrices: { ...current.projectPrices, [id]: value } }));
  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await saveCommissionCalculation(commissionId, { ...calculation, result, updatedAt: new Date().toISOString() });
      setMessage("Großkalkulation wurde gespeichert.");
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Großkalkulation konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-dvh bg-gray-900 p-10 text-slate-400">Kommission wird geladen …</div>;

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-900 text-white">
      <SideBar selected={2} />
      <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px]">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div><Link to={commission ? `/Kontakte/${commission.customerId}` : "/Projects"} className="text-sm text-sky-400 hover:text-sky-300">← Zur Kundenübersicht</Link><div className="mt-2 text-xs font-semibold uppercase tracking-widest text-blue-400">Großauftrag · {commission?.commissionNumber || "ohne Nummer"}</div><h1 className="mt-1 text-2xl font-bold sm:text-3xl">{commission?.title || "Kommission"}</h1><p className="mt-2 text-sm text-slate-400">Einkauf, Projektkalkulationen und Gesamtpreis in einer unabhängigen Großkalkulation.</p></div>
            {commission && <div className="flex flex-wrap gap-2"><Link to={`/Belege/neu?customerId=${commission.customerId}&commissionId=${commission.id}&type=quote`} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800">Angebot erstellen</Link><Link to={`/Belege/neu?customerId=${commission.customerId}&commissionId=${commission.id}&type=invoice`} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800">Rechnung erstellen</Link><button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{saving ? "Speichert …" : "Kalkulation speichern"}</button></div>}
          </header>
          {message && <div className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-200">{message}</div>}
          {error && <div role="alert" className="mt-4 rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</div>}
          {commission && <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><SummaryCard label="Teilprojekte" value={commission.summary.projectCount}/><SummaryCard label="Shop-Positionen" value={commission.summary.articleCount}/><SummaryCard label="Materialbasis" value={money.format(commission.summary.materialCost)}/><SummaryCard label="Übernommene Stunden" value={`${decimal.format(commission.summary.hours)} h`}/><SummaryCard label="Gesamtpreis" value={money.format(result.gross)} hint="inkl. MwSt."/></div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
              <section className="rounded-xl border border-slate-700 bg-slate-800/80 p-5"><div><h2 className="font-semibold">Erweiterte Großkalkulation</h2><p className="mt-1 text-sm text-slate-400">Die Verkaufspreise der Projektkalkulationen werden als Ausgangswert übernommen und bleiben für den Großauftrag editierbar.</p></div>
                <div className="mt-5 space-y-3">{commission.projects.map(project => <div key={project.id} className="grid items-end gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3 sm:grid-cols-[minmax(0,1fr)_180px]"><div><Link to={`/Projects/Calculation/${project.id}`} className="font-medium text-sky-300 hover:text-sky-200">{project.title}</Link><p className="mt-1 text-xs text-slate-500">{project.projectNumber || "ohne Projektnummer"} · Material {money.format(project.materialCost)} · {decimal.format(project.hours)} h{!project.calculationAvailable && " · noch keine Kalkulation"}</p></div><NumberField label="Übernommener Nettopreis" value={calculation.projectPrices[project.id] ?? 0} onChange={value => changeProject(project.id, value)} /></div>)}</div>
                <div className="mt-5 grid gap-4 border-t border-slate-700 pt-5 sm:grid-cols-2 lg:grid-cols-3"><NumberField label="Zusatzkosten" value={calculation.additionalCosts} onChange={value => change("additionalCosts", value)}/><NumberField label="Projekt-Overhead" value={calculation.overheadPercent} onChange={value => change("overheadPercent", value)} suffix="%"/><NumberField label="Gewinnzuschlag" value={calculation.profitPercent} onChange={value => change("profitPercent", value)} suffix="%"/><NumberField label="Großauftragsrabatt" value={calculation.discountPercent} onChange={value => change("discountPercent", value)} suffix="%"/><NumberField label="Mehrwertsteuer" value={calculation.vatPercent} onChange={value => change("vatPercent", value)} suffix="%"/></div>
                <label className="mt-4 block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Kalkulationsnotiz</span><textarea rows="3" value={calculation.notes} onChange={event => change("notes", event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500"/></label>
              </section>
              <section className="rounded-xl border border-blue-900/60 bg-blue-950/20 p-5"><h2 className="font-semibold text-blue-100">Preisaufbau</h2><div className="mt-4 overflow-hidden rounded-lg border border-slate-700">{[["Projektpreise", result.projectBase], ["Zusatzkosten", result.additionalCosts], ["Overhead", result.overhead], ["Gewinn", result.profit], ["Rabatt", -result.discount], ["Netto", result.net], [`MwSt. (${decimal.format(calculation.vatPercent)} %)`, result.vat], ["Brutto", result.gross]].map(([label, value], index) => <div key={label} className={`flex justify-between border-b border-slate-700 px-4 py-3 last:border-0 ${index >= 5 ? "bg-slate-900/70 font-semibold" : ""}`}><span>{label}</span><span className="tabular-nums">{money.format(value)}</span></div>)}</div></section>
            </div>

            <section className="mt-6 rounded-xl border border-slate-700 bg-slate-800/80 p-5"><h2 className="font-semibold">Gemeinsame Shop-Übersicht</h2><p className="mt-1 text-sm text-slate-400">Alle Einkaufspositionen der Teilprojekte, ohne die Quelldaten der Einzelprojekte zu verändern.</p><div className="mt-4 max-h-[32rem] overflow-auto rounded-lg border border-slate-700"><table className="w-full min-w-[760px] text-left text-sm"><thead className="sticky top-0 bg-slate-950 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Projekt</th><th className="px-4 py-3">Artikel</th><th className="px-4 py-3">Lieferant</th><th className="px-4 py-3 text-right">Menge</th><th className="px-4 py-3 text-right">Netto</th><th className="px-4 py-3 text-right">Summe</th></tr></thead><tbody>{commission.projects.flatMap(project => project.shopItems).map(item => <tr key={`${item.projectId}-${item.id}`} className="border-t border-slate-700"><td className="px-4 py-3 text-slate-400">{item.projectTitle}</td><td className="px-4 py-3"><div>{item.name}</div><div className="text-xs text-slate-500">{item.articleNumber || "ohne Artikelnummer"}</div></td><td className="px-4 py-3 text-slate-400">{item.supplier || "—"}</td><td className="px-4 py-3 text-right">{decimal.format(item.quantity)} {item.unit}</td><td className="px-4 py-3 text-right">{money.format(item.netPrice)}</td><td className="px-4 py-3 text-right font-medium">{money.format(item.total)}</td></tr>)}</tbody></table>{commission.summary.articleCount === 0 && <p className="p-8 text-center text-sm text-slate-500">Noch keine Shop-Positionen in den Teilprojekten gespeichert.</p>}</div></section>
          </>}
        </div>
      </main>
    </div>
  );
}
