import { useState } from "react";
import { useNavigate } from "react-router";
import { useOnboarding } from "../../onboarding/OnboardingContext.js";

const CONFIRMATION = "NEU EINRICHTEN";

export default function ResetSettingsPanel() {
  const onboarding = useOnboarding();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const restart = async () => {
    setBusy(true);
    setError("");
    try {
      await onboarding.reset();
      navigate("/init", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Die Neueinrichtung konnte nicht gestartet werden.");
      setBusy(false);
    }
  };

  return <div className="h-full overflow-y-auto p-6">
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="text-xl font-semibold">Reset & Neueinrichtung</h1><p className="mt-1 text-sm text-gray-400">Den Einrichtungsassistenten für dieses Unternehmen erneut starten.</p></div>
      <section className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800"><div className="border-b border-gray-700 p-6"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-xl text-amber-300">↻</span><div><h2 className="font-semibold">Carpenters Production neu einrichten</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Der Assistent führt erneut durch Firmeneinstellungen, Datenimporte, Management-Grundlagen und Rundgang. Bereits gespeicherte Projekte, Kontakte, Artikel, Dokumente und Einstellungen werden <strong className="text-gray-200">nicht gelöscht</strong>; Werte können im Assistenten geprüft und angepasst werden.</p></div></div></div><div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900/60 p-6"><div><p className="text-sm font-medium">Auswirkung</p><p className="mt-1 text-xs text-gray-500">Nur der Einrichtungsfortschritt wird zurückgesetzt.</p></div><button type="button" onClick={() => { setOpen(true); setConfirmation(""); setError(""); }} className="rounded-lg border border-amber-700 bg-amber-950/20 px-4 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-950/40">Neueinrichtung starten</button></div></section>
      <section className="rounded-2xl border border-gray-700 bg-gray-800 p-6"><h2 className="font-semibold">Was erhalten bleibt</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{["Projekte und Aufmaße", "Kunden und Kontaktverlauf", "Artikel, Lager und Einkauf", "Benutzer und Berechtigungen", "Dokumente und Anhänge", "Management- und Kalkulationsdaten"].map(item => <div key={item} className="flex items-center gap-3 rounded-lg bg-gray-900 px-3 py-2.5 text-sm text-gray-300"><span className="text-green-400">✓</span>{item}</div>)}</div></section>
    </div>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" onMouseDown={event => event.target === event.currentTarget && !busy && setOpen(false)}><div role="dialog" aria-modal="true" aria-labelledby="reset-init-title" className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl"><h2 id="reset-init-title" className="text-lg font-semibold">Neueinrichtung bestätigen</h2><p className="mt-3 text-sm leading-6 text-gray-400">Du wirst sofort zur Willkommensseite weitergeleitet. Gib zur Bestätigung <strong className="text-gray-200">{CONFIRMATION}</strong> ein.</p><input autoFocus value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-5 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 outline-none focus:border-amber-500" />{error && <p className="mt-3 text-sm text-red-300">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-lg border border-gray-600 px-4 py-2 text-sm">Abbrechen</button><button type="button" disabled={busy || confirmation !== CONFIRMATION} onClick={restart} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Wird gestartet …" : "Assistent neu starten"}</button></div></div></div>}
  </div>;
}
