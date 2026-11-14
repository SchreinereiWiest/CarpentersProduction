import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../../app/providers/AuthContext.js";
import { loadOnboarding, resetOnboarding, updateOnboardingStep } from "./onboardingApi.js";
import { OnboardingContext } from "./OnboardingContext.js";

const hasActiveOnboardingTour = () => {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem("carpenters-guided-help"));
    const activeMode = stored?.active?.mode || stored?.mode;
    const pausedMode = stored?.paused?.active?.mode;
    return activeMode === "onboarding" || pausedMode === "onboarding";
  } catch {
    return false;
  }
};

export default function OnboardingGate({ children }) {
  const { user, loading: authLoading } = useAuth();
  const tenantId = user?.tenant?.id;
  const location = useLocation();
  const [state, setState] = useState(null);
  const [loadedTenantId, setLoadedTenantId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (user?.role !== "admin") {
      setState(null);
      setLoadedTenantId(null);
      return null;
    }
    setLoading(true);
    setError("");
    try {
      const next = await loadOnboarding();
      setState(next);
      setLoadedTenantId(tenantId);
      return next;
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Der Einrichtungsstatus konnte nicht geladen werden.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [tenantId, user?.role]);

  useEffect(() => {
    if (authLoading) return undefined;
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, refresh, tenantId]);

  const advance = useCallback(async (stepId, action = "complete") => {
    const next = await updateOnboardingStep(stepId, action);
    setState(next);
    return next;
  }, []);

  const reset = useCallback(async () => {
    const next = await resetOnboarding();
    setState(next);
    return next;
  }, []);

  const activeState = loadedTenantId === tenantId ? state : null;
  const value = useMemo(() => ({ state: activeState, loading, error, refresh, advance, reset }), [activeState, loading, error, refresh, advance, reset]);

  if (authLoading || (user?.role === "admin" && !activeState && !error)) {
    return <div className="grid h-dvh place-items-center bg-gray-900 text-sm text-gray-400">Einrichtungsstatus wird geprüft …</div>;
  }

  if (user?.role === "admin" && error && !activeState) {
    return <div className="grid h-dvh place-items-center bg-gray-900 p-6 text-white"><div className="max-w-md rounded-2xl border border-red-900 bg-gray-800 p-6 text-center"><h1 className="text-lg font-semibold">Einrichtung konnte nicht geprüft werden</h1><p className="mt-2 text-sm text-gray-400">{error}</p><button type="button" onClick={() => refresh()} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium">Erneut versuchen</button></div></div>;
  }

  const guidedOnboarding = activeState?.currentStep === "tour"
    && (new URLSearchParams(location.search).get("guidedTour") === "onboarding" || hasActiveOnboardingTour());

  if (user?.role === "admin" && activeState?.required && location.pathname !== "/init" && !guidedOnboarding) {
    return <Navigate to="/init" replace state={{ from: location.pathname }} />;
  }

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
