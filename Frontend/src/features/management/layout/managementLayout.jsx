import { useCallback, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import axios from "axios";
import SideBar from "../../../shared/components/sideBar.jsx";
import ManagementBar from './managementBar.jsx';
import { today } from '@Engine/management/utils/dates.mjs';
import { approvedConfig } from '@Engine/management/config/approval.mjs';
import { calculateSetup } from '@Engine/management/calculation/accounting.mjs';
import { prepareSetupConfig } from '@Engine/management/config/normalize.mjs';
import {
  DEFAULT_COMPANY_SETTINGS,
  loadCompanySettings
} from "../../../shared/settings/company-settings.js";
import { Button } from '../components/ui.jsx';
import { EMPTY_REFERENCES, inputClass, UI_DEFAULTS } from '../defaults/ui.defaults.js';
import { YEAR_SELECT_DEFAULTS } from '../defaults/navigation.defaults.js';

/** Lädt Jahresdaten und Tätigkeiten, hält den gemeinsamen Entwurf und stellt Speichern, Navigation und Freigabestatus für alle Managementseiten bereit. */
export default function ManagementLayout({ sidebarSelected = UI_DEFAULTS.sidebarSelected }) {
  const [year, setYear] = useState(Number(today().slice(0, 4)));
  const [state, setState] = useState(null);
  const [draft, setDraft] = useState(null);
  const [references, setReferences] = useState(() => structuredClone(EMPTY_REFERENCES));
  const [workTypes, setWorkTypes] = useState(
    DEFAULT_COMPANY_SETTINGS.workTypes
  );
  const [companySettings, setCompanySettings] = useState(
    DEFAULT_COMPANY_SETTINGS
  );
  const [settingsError, setSettingsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const setupMode = location.pathname.includes("/Setup/");
  const approved = state && approvedConfig(state.config);
  const visibleMode = setupMode
    ? draft?.mode
    : state?.operationalConfig?.mode || state?.config.mode;
  const dirty = Boolean(
    draft && state && JSON.stringify(draft) !== JSON.stringify(state.config)
  );
  /** Lädt Jahres-Snapshot und Referenzen gemeinsam in einer Anfrage und erzeugt eine unabhängige Entwurfskopie. */
  const load = useCallback(
    async (signal) => {
      const data = await axios.get("/api/management", { params: { year }, signal });
      const next = { ...data.data, config: prepareSetupConfig(data.data) };
      setState(next);
      setDraft(structuredClone(next.config));
      setReferences(data.data.references || structuredClone(EMPTY_REFERENCES));
    },
    [year]
  );
  useEffect(() => {
    let active = true;
    loadCompanySettings()
      .then((settings) => {
        if (active) {
          setCompanySettings(settings);
          setWorkTypes(settings.workTypes);
          setSettingsError("");
        }
      })
      .catch(() => {
        if (active)
          setSettingsError(
            "Firmeneigene Tätigkeiten konnten nicht geladen werden. Bis zur Aktualisierung wird der Standardkatalog angezeigt."
          );
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    /** Lädt die gewählte Jahresbasis mit Abbruchsignal und hält Lade- sowie Fehlerzustand konsistent. */
    const start = async () => {
      setLoading(true);
      setError("");
      setMessage("");
      try {
        await load(controller.signal);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(
            err.response?.data?.message ||
              "Betriebsdaten konnten nicht geladen werden."
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    start();
    return () => controller.abort();
  }, [load]);
  /** Führt eine Managementänderung aus und lädt danach neu; ein erfolgreicher Schreibzugriff mit fehlgeschlagenem Reload wird ausdrücklich unterschieden. */
  const act = async (method, path, data, success = "Gespeichert.") => {
    if (busy) return false;
    setBusy(true);
    setError("");
    setMessage("");
    let written = false;
    try {
      await axios({
        method,
        url: `/api/management${path}`,
        params: { year },
        data
      });
      written = true;
      await load();
      setMessage(success);
      return true;
    } catch (err) {
      setError(
        written
          ? "Änderung gespeichert. Aktualisierte Daten konnten noch nicht geladen werden. Bitte „Aktualisieren“ verwenden."
          : err.response?.data?.message ||
              "Änderung konnte nicht gespeichert werden."
      );
      return false;
    } finally {
      setBusy(false);
    }
  };
  /** Lädt Jahresdaten und Firmeneinstellungen erneut, damit neue Tätigkeitsberichte und Änderungen sichtbar werden. */
  const refresh = async () => {
    setBusy(true);
    setError("");
    try {
      await load();
      const settings = await loadCompanySettings();
      setCompanySettings(settings);
      setWorkTypes(settings.workTypes);
      setSettingsError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Betriebsdaten oder Tätigkeiten konnten nicht geladen werden."
      );
    } finally {
      setBusy(false);
    }
  };
  const setupCalculation = draft
    ? calculateSetup(draft, { year, timeEntries: state?.timeEntries || [] })
    : null;
  const activities = [...workTypes];
  for (const entry of state?.timeEntries || []) {
    const id = entry.customWorkType
      ? `custom:${entry.customWorkType}`
      : entry.workType;
    if (!activities.some((item) => item.id === id))
      activities.push({ id, label: entry.customWorkType || entry.workType });
  }
  /** Übermittelt den gesamten Entwurf mit der zuletzt geladenen Revision an die validierende API. */
  const saveConfig = (config) =>
    act(
      "put",
      "/settings",
      { config, revision: state.revision },
      "Betriebsmodell gespeichert und neu berechnet."
    );
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-gray-900 text-white">
      <SideBar selected={sidebarSelected} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {sidebarSelected === 1 && (
          <ManagementBar setupMode={setupMode || Boolean(state && !approved)} />
        )}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 xl:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-blue-400">
                  {setupMode || !approved ? "Betrieb einrichten" : "Management"}
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  {visibleMode === "full"
                    ? "Vollkostenkalkulation"
                    : "Easy-Stundensätze"}{" "}
                  ·{" "}
                  {approved
                    ? `Freigegebene Version ${state.config.setup.approvals.at(-1).version}`
                    : "Noch nicht freigegeben"}
                  {dirty ? " · Ungespeicherter Entwurf" : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs text-gray-400">
                  Geschäftsjahr
                  <select
                    aria-label="Geschäftsjahr"
                    disabled={busy || dirty}
                    value={year}
                    onChange={(event) => setYear(Number(event.target.value))}
                    className={`${inputClass} mt-1 min-w-28`}
                  >
                    {Array.from(
                      new Set([
                        year,
                        ...Array.from(
                          { length: YEAR_SELECT_DEFAULTS.count },
                          (_, i) => Number(today().slice(0, 4)) - YEAR_SELECT_DEFAULTS.pastYears + i
                        )
                      ])
                    )
                      .sort((a, b) => b - a)
                      .map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                  </select>
                </label>
                {approved && (
                  <Button
                    secondary
                    disabled={busy || dirty}
                    onClick={() =>
                      navigate(
                        setupMode ? "/Management" : "/Management/Setup/Business"
                      )
                    }
                  >
                    {setupMode ? "Zur Jahresansicht" : "Betrieb konfigurieren"}
                  </Button>
                )}
                <Button
                  secondary
                  disabled={busy || loading || dirty}
                  onClick={refresh}
                >
                  Aktualisieren
                </Button>
              </div>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200"
              >
                {error}
              </p>
            )}
            {settingsError && setupMode && (
              <p
                role="alert"
                className="rounded-lg border border-amber-800 p-3 text-sm text-amber-200"
              >
                {settingsError}
              </p>
            )}
            {message && (
              <p
                role="status"
                className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-200"
              >
                {message}
              </p>
            )}
            {loading ? (
              <p className="py-16 text-center text-gray-400">
                Betriebsdaten werden geladen …
              </p>
            ) : state?.year === year ? (
              !approved && !setupMode && sidebarSelected === 1 ? (
                <Navigate to="/Management/Setup/Business" replace />
              ) : (
                <Outlet
                  key={setupMode ? "setup" : `${year}:${state.revision}`}
                  context={{
                    state,
                    draft,
                    setDraft,
                    dirty,
                    setupCalculation,
                    references,
                    activities,
                    companySettings,
                    year,
                    busy,
                    error,
                    act,
                    refresh,
                    saveConfig
                  }}
                />
              )
            ) : (
              <Button secondary onClick={refresh}>
                Erneut laden
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
