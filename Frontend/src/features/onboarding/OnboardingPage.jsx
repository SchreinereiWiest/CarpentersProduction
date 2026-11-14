import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "../../app/providers/AuthContext.js";
import { useOnboarding } from "./OnboardingContext.js";
import { metaForStep } from "./onboardingSteps.js";
import CompanySettingsPanel from "../company-settings/panels/companySettingsPanel.jsx";
import UserSettingsPanel from "../company-settings/panels/userSettingsPanel.jsx";
import UserInterfaceSettingsPanel from "../company-settings/panels/userInterfaceSettingsPanel.jsx";
import ProgramSettingsPanel from "../company-settings/panels/programSettingsPanel.jsx";
import StorageSettingsPanel from "../company-settings/panels/storageSettingsPanel.jsx";
import CabinetSettingsPanel from "../company-settings/panels/cabinetSettingsPanel.jsx";
import CncSettingsPanel from "../company-settings/panels/cncSettingsPanel.jsx";
import EstimationSettingsPanel from "../company-settings/panels/estimationSettingsPanel.jsx";
import HourlyRatesSettingsPanel from "../company-settings/panels/hourlyRatesSettingsPanel.jsx";
import AttachmentSearchSettingsPanel from "../company-settings/panels/attachmentSearchSettingsPanel.jsx";
import PaperlessSettingsPanel from "../company-settings/panels/paperlessSettingsPanel.jsx";
import ContactHistorySettingsPanel from "../company-settings/panels/contactHistorySettingsPanel.jsx";
import ShopSettingsPanel from "../company-settings/panels/shopSettingsPanel.jsx";
import ManagementSettingsPanel from "../company-settings/panels/managementSettingsPanel.jsx";
import ShopImportStep from "./steps/ShopImportStep.jsx";
import CustomerImportStep from "./steps/CustomerImportStep.jsx";
import ManagementFinanceSetup from "./steps/ManagementFinanceSetup.jsx";
import { useGuidedHelp } from "../guided-help/GuidedHelpContext.js";

function BrandMark() {
  return <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-950">CP</span>;
}

function WelcomeStep({ companyName, stepCount }) {
  return <div className="h-full overflow-y-auto p-5 sm:p-8 lg:p-12">
    <div className="mx-auto flex min-h-full max-w-6xl items-center">
      <div className="grid w-full items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
        <div><span className="inline-flex items-center gap-2 rounded-full border border-blue-800 bg-blue-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300"><span className="size-1.5 rounded-full bg-blue-400"/>Ersteinrichtung</span><h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Willkommen bei Carpenters Production</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-gray-400">Wir richten <strong className="text-gray-200">{companyName}</strong> gemeinsam in einer sinnvollen Reihenfolge ein – von Arbeitszeiten und Fertigungsstandards über vorhandene Daten bis zur Stundensatzkalkulation.</p><div className="mt-8 flex flex-wrap gap-3 text-sm text-gray-300"><span className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">Automatisch gespeichert</span><span className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">Jederzeit fortsetzbar</span><span className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">Bestehende Daten bleiben erhalten</span></div></div>
        <div className="rounded-3xl border border-gray-700 bg-gray-800 p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wider text-gray-500">Ihr Einrichtungsweg</p><p className="mt-1 text-2xl font-semibold">{stepCount} Schritte</p></div><span className="grid size-14 place-items-center rounded-2xl bg-blue-500/10 text-2xl text-blue-300">✓</span></div><ol className="mt-6 space-y-4">{[["01", "System konfigurieren", "Firmenweite Grundlagen und Module"], ["02", "Daten übernehmen", "Artikel und Kontakte importieren"], ["03", "Betrieb kalkulieren", "Personal, Kosten und Stundensätze"], ["04", "System kennenlernen", "Kompakter Rundgang zum Abschluss"]].map(item => <li key={item[0]} className="flex gap-4"><span className="text-sm font-semibold text-blue-400">{item[0]}</span><span><strong className="block text-sm">{item[1]}</strong><span className="mt-1 block text-xs text-gray-500">{item[2]}</span></span></li>)}</ol></div>
      </div>
    </div>
  </div>;
}

function SectionTabs({ tabs }) {
  const [selected, setSelected] = useState(tabs[0]?.id);
  const active = tabs.find(tab => tab.id === selected) || tabs[0];
  return <div className="flex h-full min-h-0 flex-col"><div className="shrink-0 border-b border-gray-700 bg-gray-900 px-4"><nav className="flex h-13 items-end gap-1 overflow-x-auto" aria-label="Einstellungsbereiche">{tabs.map(tab => <button key={tab.id} type="button" onClick={() => setSelected(tab.id)} aria-current={active?.id === tab.id ? "page" : undefined} className={`h-full whitespace-nowrap border-b-2 px-4 text-sm font-medium ${active?.id === tab.id ? "border-blue-500 text-blue-300" : "border-transparent text-gray-500 hover:text-gray-300"}`}>{tab.label}</button>)}</nav></div><div className="min-h-0 flex-1">{active?.content}</div></div>;
}

function TourLaunchStep() {
  return <div className="h-full overflow-y-auto p-5 sm:p-8 lg:p-12">
    <div className="mx-auto flex min-h-full max-w-4xl items-center">
      <section className="w-full rounded-3xl border border-gray-700 bg-gray-800 p-6 shadow-2xl sm:p-10">
        <span className="grid size-14 place-items-center rounded-2xl bg-blue-500/10 text-2xl text-blue-300">?</span>
        <h1 className="mt-6 text-3xl font-semibold">Carpenters direkt im System kennenlernen</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-gray-400">Der Rundgang verlässt jetzt die Einrichtung und führt durch die echten Ansichten. Wichtige Schaltflächen und Arbeitsbereiche werden dort mit einer Erklärung hervorgehoben.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {["Echte Funktionsansichten", "Sicher ohne Datenänderung", "Später über ? wiederholbar"].map(item => <div key={item} className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-300">✓ {item}</div>)}
        </div>
      </section>
    </div>
  </div>;
}

function StepContent({ stepId, user, stepCount }) {
  const features = new Set(user?.features || []);
  switch (stepId) {
    case "welcome": return <WelcomeStep companyName={user?.tenant?.name || "Ihr Unternehmen"} stepCount={stepCount} />;
    case "company": return <CompanySettingsPanel />;
    case "team": return <UserSettingsPanel />;
    case "workspace": return <SectionTabs tabs={[
      { id: "interface", label: "Benutzeroberfläche", content: <UserInterfaceSettingsPanel /> },
      { id: "license", label: "Lizenz & Module", content: <ProgramSettingsPanel /> },
      ...(features.has("work-preparation") ? [{ id: "storage", label: "Storage & Sicherung", content: <StorageSettingsPanel /> }] : [])
    ]} />;
    case "production": return <SectionTabs tabs={[
      { id: "project", label: "Projekt & Möbel", content: <CabinetSettingsPanel /> },
      { id: "cnc", label: "CNC & Postprozessoren", content: <CncSettingsPanel /> }
    ]} />;
    case "calculation": return <SectionTabs tabs={[
      { id: "estimation", label: "Stundenschätzung", content: <EstimationSettingsPanel /> },
      ...(!features.has("business-management") ? [{ id: "rates", label: "Stundensätze", content: <HourlyRatesSettingsPanel /> }] : [])
    ]} />;
    case "integrations": return <SectionTabs tabs={[
      { id: "documents", label: "Dokumente & Paperless", content: <PaperlessSettingsPanel /> },
      ...(features.has("work-preparation") ? [{ id: "ai", label: "AI & Anhangssuche", content: <AttachmentSearchSettingsPanel /> }] : []),
      ...(features.has("crm") ? [{ id: "contact", label: "E-Mail & Telefonie", content: <ContactHistorySettingsPanel /> }] : [])
    ]} />;
    case "shop-settings": return <ShopSettingsPanel />;
    case "articles": return <ShopImportStep />;
    case "customers": return <CustomerImportStep />;
    case "management": return <SectionTabs tabs={[
      { id: "structure", label: "Status & Jahresziele", content: <ManagementSettingsPanel /> },
      { id: "finance", label: "Personal & Stundensätze", content: <ManagementFinanceSetup /> }
    ]} />;
    case "tour": return <TourLaunchStep />;
    default: return null;
  }
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const onboarding = useOnboarding();
  const guidedHelp = useGuidedHelp();
  const navigate = useNavigate();
  const state = onboarding?.state;
  const steps = useMemo(() => state?.steps || [], [state?.steps]);
  const currentIndex = steps.findIndex(step => step.id === state?.currentStep);
  const [viewStepId, setViewStepId] = useState(state?.currentStep || "welcome");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!onboarding || !state) return <div className="grid h-dvh place-items-center bg-gray-900 text-gray-400">Einrichtung wird geladen …</div>;
  if (!state.required) return <Navigate to="/" replace />;

  const viewIndex = Math.max(0, steps.findIndex(step => step.id === viewStepId));
  const viewStep = steps[viewIndex];
  const meta = metaForStep(viewStep?.id);
  const optional = Boolean(viewStep?.optional);
  const isCurrent = viewStep?.id === state.currentStep;
  const isLast = viewIndex === steps.length - 1;
  const completed = new Set(state.completedSteps || []);
  const skipped = new Set(state.skippedSteps || []);
  const percent = steps.length ? Math.round(((currentIndex < 0 ? steps.length : currentIndex) / steps.length) * 100) : 0;

  const goForward = async action => {
    setError("");
    if (!isCurrent) {
      setViewStepId(steps[Math.min(viewIndex + 1, currentIndex)]?.id || state.currentStep);
      return;
    }
    setBusy(true);
    try {
      if (viewStep.id === "tour" && action === "complete") {
        if (!guidedHelp.startTour("system-overview", { mode: "onboarding" })) {
          throw new Error("Für die freigeschalteten Module ist kein Rundgang verfügbar.");
        }
        return;
      }
      const next = await onboarding.advance(viewStep.id, action);
      if (!next.required) navigate("/", { replace: true });
      else setViewStepId(next.currentStep);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Der Schritt konnte nicht abgeschlossen werden.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="flex h-dvh w-full flex-col overflow-hidden bg-gray-900 text-white">
    <header className="flex h-18 shrink-0 items-center justify-between border-b border-gray-700 bg-gray-800 px-4 sm:px-6"><div className="flex min-w-0 items-center gap-3"><BrandMark /><div className="min-w-0"><p className="truncate font-semibold">Carpenters Production</p><p className="truncate text-xs text-gray-500">Einrichtung · {user?.tenant?.name}</p></div></div><div className="hidden items-center gap-4 sm:flex"><div className="w-40"><div className="mb-1 flex justify-between text-[11px] text-gray-500"><span>Fortschritt</span><span>{percent} %</span></div><div className="h-1.5 overflow-hidden rounded-full bg-gray-700"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${percent}%` }} /></div></div><span className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-400">Admin</span></div></header>
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-gray-700 bg-gray-800/70 p-4 lg:block"><nav aria-label="Einrichtungsschritte" className="space-y-1">{steps.map((step, index) => {
        const itemMeta = metaForStep(step.id);
        const active = step.id === viewStep?.id;
        const done = completed.has(step.id);
        const wasSkipped = skipped.has(step.id);
        const available = index <= currentIndex;
        const previousGroup = index > 0 ? metaForStep(steps[index - 1].id).group : null;
        return <div key={step.id}>{itemMeta.group !== previousGroup && <p className="mb-2 mt-5 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600 first:mt-0">{itemMeta.group}</p>}<button type="button" disabled={!available} onClick={() => setViewStepId(step.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${active ? "bg-blue-600 text-white" : available ? "text-gray-300 hover:bg-gray-700" : "cursor-not-allowed text-gray-600"}`}><span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${active ? "bg-white/15" : done ? "bg-green-500/15 text-green-300" : wasSkipped ? "bg-gray-700 text-gray-400" : "bg-gray-900"}`}>{done ? "✓" : wasSkipped ? "–" : String(index + 1).padStart(2, "0")}</span><span className="min-w-0"><strong className="block truncate text-sm font-medium">{itemMeta.label}</strong><span className={`mt-0.5 block truncate text-[11px] ${active ? "text-blue-100" : "text-gray-500"}`}>{itemMeta.description}</span></span></button></div>;
      })}</nav></aside>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden"><div className="flex shrink-0 items-center justify-between border-b border-gray-700 bg-gray-900 px-4 py-3 lg:hidden"><div><p className="text-xs text-blue-400">Schritt {viewIndex + 1} von {steps.length}</p><p className="font-medium">{meta.label}</p></div><select value={viewStep?.id} onChange={event => setViewStepId(event.target.value)} className="max-w-48 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm">{steps.map((step, index) => <option key={step.id} value={step.id} disabled={index > currentIndex}>{index + 1}. {metaForStep(step.id).label}</option>)}</select></div>
        <div className="min-h-0 flex-1"><StepContent stepId={viewStep?.id} user={user} stepCount={steps.length} /></div>
        <footer className="shrink-0 border-t border-gray-700 bg-gray-800 px-4 py-3 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={busy || viewIndex === 0} onClick={() => setViewStepId(steps[viewIndex - 1].id)} className="rounded-lg border border-gray-600 px-4 py-2.5 text-sm hover:bg-gray-700 disabled:opacity-30">← Zurück</button><div className="flex flex-1 items-center justify-end gap-3">{error && <p role="alert" className="mr-auto text-sm text-red-300">{error}</p>}{optional && isCurrent && <button type="button" disabled={busy} onClick={() => goForward("skip")} className="rounded-lg px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-700">{viewStep.id === "tour" ? "Rundgang überspringen" : "Jetzt überspringen"}</button>}<button type="button" disabled={busy} onClick={() => goForward("complete")} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{busy ? "Wird gespeichert …" : !isCurrent ? "Weiter" : viewStep.id === "tour" ? "Rundgang in Carpenters starten →" : isLast ? "Einrichtung abschließen" : viewStep.id === "welcome" ? "Einrichtung starten →" : "Eingerichtet & weiter →"}</button></div></div></footer>
      </main>
    </div>
  </div>;
}
