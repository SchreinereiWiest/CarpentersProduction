import { Navigate, useNavigate, useParams } from "react-router";
import { SETUP_STEPS } from '@Engine/management/defaults/catalog.defaults.mjs';
import { useManagement } from '../hooks/useManagement.js';
import { SetupAnnualCosts } from './steps/annualCosts.jsx';
import { SetupAssets } from './steps/assets.jsx';
import { SetupBusiness } from './steps/business.jsx';
import { SetupDistribution } from './steps/distribution.jsx';
import { SetupHours } from './steps/hours.jsx';
import { SetupBab } from './steps/bab.jsx';
import { SetupMachines } from './steps/machines.jsx';
import { SetupReview } from './steps/review.jsx';
import SetupImport from './import.panel.jsx';
import { Button } from '../components/ui.jsx';

const views = {
  Business: SetupBusiness,
  Assets: SetupAssets,
  AnnualCosts: SetupAnnualCosts,
  Hours: SetupHours,
  Distribution: SetupDistribution,
  Machines: SetupMachines,
  Bab: SetupBab,
  Review: SetupReview
};
/** Verbindet den gewählten Einrichtungsschritt mit dem gemeinsamen Entwurf und der revisionssicheren Speichern-und-Weiter-Navigation. */
export default function ManagementSetup() {
  const { step } = useParams();
  const navigate = useNavigate();
  const {
    state,
    draft,
    setDraft,
    setupCalculation,
    references,
    activities,
    companySettings,
    year,
    busy,
    dirty,
    act,
    saveConfig
  } = useManagement();
  const index = SETUP_STEPS.findIndex((item) => item[0] === step);
  const View = views[step];
  if (!View) return <Navigate to="/Management/Setup/Business" replace />;
  /** Wendet eine lokale Änderung auf eine Kopie des Entwurfs an und lässt gespeicherte sowie freigegebene Eingaben unangetastet. */
  const change = (update) =>
    setDraft((previous) => {
      const next = structuredClone(previous);
      update(next);
      return next;
    });
  const props = {
    config: draft,
    change,
    calculation: setupCalculation,
    references,
    activities,
    companySettings,
    year,
    busy,
    dirty,
    act,
    revision: state.revision,
    previous: state.previous
  };
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 text-sm text-blue-400">
          Schritt {String(index + 1).padStart(2, "0")} von 08
        </p>
        <h1 className="text-2xl font-semibold">{SETUP_STEPS[index][1]}</h1>
        <p className="mt-2 text-sm text-gray-400">{SETUP_STEPS[index][2]}</p>
        <div
          aria-label="Fortschritt der Einrichtung"
          className="mt-4 h-1.5 overflow-hidden rounded bg-gray-700"
        >
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${((index + 1) / 8) * 100}%` }}
          />
        </div>
      </div>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <View {...props} />
        {step === "Business" && (
          <SetupImport config={draft} change={change} year={year} />
        )}
      </fieldset>
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-700 bg-gray-900/95 p-4">
        <Button
          secondary
          disabled={busy || index === 0}
          onClick={() =>
            navigate(`/Management/Setup/${SETUP_STEPS[index - 1][0]}`)
          }
        >
          Zurück
        </Button>
        <p className="text-xs text-gray-400">
          {dirty
            ? "Ungespeicherter Entwurf · Änderungen bleiben beim Schrittwechsel erhalten."
            : "Entwurf gespeichert."}
        </p>
        <div className="flex flex-wrap gap-2">
          {dirty && (
            <Button
              secondary
              disabled={busy}
              onClick={() => setDraft(structuredClone(state.config))}
            >
              Änderungen verwerfen
            </Button>
          )}
          <Button
            secondary
            disabled={busy || !dirty}
            onClick={() => saveConfig(draft)}
          >
            Entwurf speichern
          </Button>
          {index < 7 && (
            <Button
              disabled={busy}
              onClick={async () => {
                if (!dirty || (await saveConfig(draft)))
                  navigate(`/Management/Setup/${SETUP_STEPS[index + 1][0]}`);
              }}
            >
              Speichern & Weiter
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
