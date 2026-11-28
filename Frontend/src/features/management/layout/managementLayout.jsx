import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router";
import axios from "axios";
import SideBar from "../../../shared/components/sideBar.jsx";
import { loadCompanySettings } from "../../../shared/settings/company-settings.js";
import ManagementBar from "./managementBar.jsx";
import { UI_DEFAULTS } from "../defaults/ui.defaults.js";

const berlinYear = () => Number(new Intl.DateTimeFormat("en", {
  timeZone: "Europe/Berlin", year: "numeric"
}).format(new Date()));

/** Gemeinsamer Datenrahmen der fünf Managementbereiche. */
export default function ManagementLayout({ sidebarSelected = UI_DEFAULTS.sidebarSelected }) {
  const [year, setYear] = useState(berlinYear);
  const [workspace, setWorkspace] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(sidebarSelected === 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async signal => {
    if (sidebarSelected !== 1) return;
    const [{ data }, settings] = await Promise.all([
      axios.get("/api/management/workspace", { params: { year }, signal }),
      loadCompanySettings()
    ]);
    setWorkspace(data);
    setCompanySettings(settings);
  }, [sidebarSelected, year]);

  useEffect(() => {
    if (sidebarSelected !== 1) return undefined;
    const controller = new AbortController();
    const start = window.setTimeout(() => {
      load(controller.signal)
        .catch(err => {
          if (!controller.signal.aborted) setError(err.response?.data?.message || "Managementdaten konnten nicht geladen werden.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(start);
      controller.abort();
    };
  }, [load, sidebarSelected]);

  const request = useCallback(async (method, path, data, success = "Änderung gespeichert.") => {
    if (busy) return false;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await axios({ method, url: `/api/management${path}`, data, params: { year } });
      await load();
      setMessage(success);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Änderung konnte nicht gespeichert werden.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy, load, year]);

  const context = useMemo(() => ({
    workspace,
    companySettings,
    year,
    setYear,
    busy,
    error,
    message,
    request,
    refresh: load
  }), [workspace, companySettings, year, busy, error, message, request, load]);
  const ready = workspace?.year === year && companySettings;

  if (sidebarSelected !== 1) {
    return <div className="flex h-dvh w-full overflow-hidden bg-gray-900 text-white">
      <SideBar selected={sidebarSelected} />
      <main className="min-w-0 flex-1 overflow-y-auto"><div className="mx-auto max-w-[1600px] p-4 sm:p-6 xl:p-8"><Outlet /></div></main>
    </div>;
  }

  return <div className="flex h-dvh w-full overflow-hidden bg-gray-900 text-white">
    <SideBar selected={sidebarSelected} />
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <ManagementBar />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1800px] space-y-5 p-4 sm:p-6 xl:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-400">Management</p>
              <p className="mt-1 text-sm text-gray-400">Kapazität, Projektfluss, Jahresziele und Kalkulationssätze in einer Arbeitsumgebung.</p>
            </div>
            <div className="flex items-end gap-3">
              <label className="text-xs text-gray-400">Planungsjahr
                <select value={year} disabled={busy} onChange={event => {
                  setError("");
                  setMessage("");
                  setYear(Number(event.target.value));
                }} className="mt-1 block rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
                  {Array.from(new Set([
                    ...Array.from({ length: 9 }, (_, index) => berlinYear() + 2 - index),
                    ...(workspace?.goalYears || [])
                  ])).sort((a, b) => b - a).map(value => <option key={value}>{value}</option>)}
                </select>
              </label>
              <button type="button" disabled={busy || loading} onClick={() => load()} className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700 disabled:opacity-50">Aktualisieren</button>
            </div>
          </div>
          {error && <div role="alert" className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>}
          {message && <div className="rounded-xl border border-green-900 bg-green-950/30 px-4 py-3 text-sm text-green-200">{message}</div>}
          {ready ? <Outlet key={year} context={context} />
            : error && !loading ? <button type="button" onClick={() => load()} className="rounded-lg bg-blue-600 px-4 py-2">Erneut laden</button>
              : <div className="rounded-2xl border border-gray-700 bg-gray-800 p-12 text-center text-gray-400">Managementbereich wird geladen …</div>}
        </div>
      </div>
    </main>
  </div>;
}
