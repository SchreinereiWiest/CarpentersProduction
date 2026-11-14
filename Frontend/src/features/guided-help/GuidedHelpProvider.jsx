import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../app/providers/AuthContext.js";
import { useOnboarding } from "../onboarding/OnboardingContext.js";
import { GuidedHelpContext } from "./GuidedHelpContext.js";
import { availableTours, describeRoute, filterTourSteps, tourById } from "./tourRegistry.js";

const STORAGE_KEY = "carpenters-guided-help";
const TARGET_PADDING = 8;

const readStoredTour = () => {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY));
    if (value?.active || value?.paused) return value;
    if (value?.tourId && Number.isInteger(value.index)) return { active: value, paused: null };
    return { active: null, paused: null };
  } catch {
    return { active: null, paused: null };
  }
};

const storeTourSession = (active, paused) => {
  if (!active && !paused) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ active, paused }));
};

const tourUrl = (route, mode) => {
  const url = new URL(route, window.location.origin);
  url.searchParams.set("guidedTour", mode);
  return `${url.pathname}${url.search}${url.hash}`;
};

function HelpMenu({ tours, onClose, onStart }) {
  return <div className="fixed bottom-20 right-4 z-[10002] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-600 bg-slate-900 text-white shadow-2xl" role="dialog" aria-modal="false" aria-labelledby="guided-help-menu-title">
    <div className="flex items-start justify-between gap-4 border-b border-slate-700 p-4">
      <div><h2 id="guided-help-menu-title" className="font-semibold">Hilfe für diese Ansicht</h2><p className="mt-1 text-xs text-slate-400">Funktionen direkt an der richtigen Stelle erklären. Mit F1 startest du sofort die aktuelle Ansicht.</p></div>
      <button type="button" onClick={onClose} aria-label="Hilfemenü schließen" className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white">✕</button>
    </div>
    <div className="max-h-[60dvh] space-y-2 overflow-y-auto p-3">
      {tours.map(tour => <button key={tour.id} type="button" onClick={() => onStart(tour.id)} className="block w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-left hover:border-blue-500 hover:bg-slate-800/80">
        <span className="block text-sm font-semibold text-slate-100">{tour.label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-400">{tour.description}</span>
      </button>)}
    </div>
  </div>;
}

function SpotlightLayer({ rect, step, index, count, missing, busy, error, mode, routeNotice, paused, onPrevious, onNext, onClose, onResume }) {
  const tooltipRef = useRef(null);
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const hole = rect ? {
    top: Math.max(0, rect.top - TARGET_PADDING),
    left: Math.max(0, rect.left - TARGET_PADDING),
    right: Math.min(viewportWidth, rect.right + TARGET_PADDING),
    bottom: Math.min(viewportHeight, rect.bottom + TARGET_PADDING)
  } : null;
  const tooltipWidth = Math.min(400, viewportWidth - 24);
  const placeRight = hole && step.placement === "right";
  const tooltipLeft = hole
    ? placeRight
      ? Math.min(Math.max(12, hole.right + 18), Math.max(12, viewportWidth - tooltipWidth - 12))
      : Math.min(Math.max(12, hole.left), Math.max(12, viewportWidth - tooltipWidth - 12))
    : Math.max(12, (viewportWidth - tooltipWidth) / 2);
  const roomBelow = hole ? viewportHeight - hole.bottom : 0;
  const tooltipTop = hole
    ? placeRight
      ? Math.max(12, Math.min(viewportHeight - 260, ((hole.top + hole.bottom) / 2) - 130))
      : roomBelow >= 230 ? Math.min(viewportHeight - 210, hole.bottom + 14) : Math.max(12, hole.top - 210)
    : Math.max(24, viewportHeight / 2 - 120);
  const maskClass = "pointer-events-none fixed z-[10000] bg-slate-950/60";

  useEffect(() => {
    tooltipRef.current?.focus();
  }, [index]);

  return createPortal(<>
    {hole ? <>
      <div className={maskClass} style={{ inset: `0 0 auto 0`, height: hole.top }} />
      <div className={maskClass} style={{ top: hole.top, left: 0, width: hole.left, height: hole.bottom - hole.top }} />
      <div className={maskClass} style={{ top: hole.top, left: hole.right, right: 0, height: hole.bottom - hole.top }} />
      <div className={maskClass} style={{ top: hole.bottom, right: 0, bottom: 0, left: 0 }} />
      <div className="pointer-events-none fixed z-[10001] rounded-xl border-2 border-blue-400 shadow-[0_0_0_4px_rgba(59,130,246,0.25),0_0_35px_rgba(59,130,246,0.45)] transition-all duration-200" style={{ top: hole.top, left: hole.left, width: hole.right - hole.left, height: hole.bottom - hole.top }} />
    </> : <div className={maskClass} style={{ inset: 0 }} />}
    <section ref={tooltipRef} tabIndex="-1" role="dialog" aria-modal="false" aria-labelledby="guided-help-step-title" className="fixed z-[10002] rounded-2xl border border-slate-600 bg-slate-900 p-5 text-white shadow-2xl outline-none" style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth }}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">{index + 1} von {count}</span>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white">{mode === "onboarding" ? "Später" : "Schließen"} ✕</button>
      </div>
      <h2 id="guided-help-step-title" className="mt-3 text-lg font-semibold">{step.title}</h2>
      {routeNotice && <div className="mt-3 rounded-xl border border-blue-800/70 bg-blue-950/35 px-3 py-2.5"><p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">Du bist hier · {routeNotice.label}</p><p className="mt-1 text-xs leading-5 text-slate-300">{routeNotice.description}</p></div>}
      <p className="mt-2 text-sm leading-6 text-slate-300">{step.text}</p>
      {missing && <p className="mt-3 rounded-lg border border-amber-900 bg-amber-950/40 p-2 text-xs text-amber-200">Dieses Element ist in der aktuellen Ansicht nicht verfügbar. Du kannst mit dem nächsten Schritt fortfahren.</p>}
      {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
      {paused && <button type="button" onClick={onResume} className="mt-4 w-full rounded-lg border border-amber-600/70 bg-amber-950/35 px-4 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-900/50">↩ Pausierten Rundgang an dieser Stelle fortsetzen</button>}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button type="button" disabled={index === 0 || busy} onClick={onPrevious} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-30">← Zurück</button>
        <button type="button" disabled={busy} onClick={onNext} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{busy ? "Wird abgeschlossen …" : index === count - 1 ? mode === "onboarding" ? "Einrichtung abschließen" : "Rundgang beenden" : "Weiter →"}</button>
      </div>
    </section>
  </>, document.body);
}

export default function GuidedHelpProvider({ children }) {
  const { user } = useAuth();
  const onboarding = useOnboarding();
  const location = useLocation();
  const navigate = useNavigate();
  const [initialSession] = useState(readStoredTour);
  const [active, setActive] = useState(initialSession.active);
  const [pausedTour, setPausedTour] = useState(initialSession.paused);
  const [targetRect, setTargetRect] = useState(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activatedStep = useRef("");
  const expectedPath = useRef(null);
  const lastPath = useRef(location.pathname);
  const manualPath = useRef(null);

  const tour = active ? tourById(active.tourId) : null;
  const steps = useMemo(() => {
    const allSteps = tour ? filterTourSteps(tour, user) : [];
    if (!active?.scopePath) return allSteps;
    return allSteps.filter(item => {
      if (!item.route) return true;
      if (typeof item.route === "function") return false;
      return item.route === active.scopePath;
    });
  }, [active, tour, user]);
  const currentIndex = active ? Math.min(active.index, Math.max(0, steps.length - 1)) : 0;
  const step = steps[currentIndex];
  const contextualTours = useMemo(() => availableTours(location.pathname, user), [location.pathname, user]);
  const hiddenRoute = location.pathname === "/login" || location.pathname === "/init";

  const navigateForTour = useCallback((path, mode, options) => {
    const url = tourUrl(path, mode);
    expectedPath.current = new URL(url, window.location.origin).pathname;
    navigate(url, options);
  }, [navigate]);

  const startTour = useCallback((tourId, options = {}) => {
    const selected = tourById(tourId);
    const selectedSteps = selected ? filterTourSteps(selected, user) : [];
    if (!selectedSteps.length) return false;
    const configuredRoute = typeof selectedSteps[0].route === "function" ? selectedSteps[0].route() : selectedSteps[0].route;
    const firstRoute = configuredRoute || location.pathname;
    const preservingPause = Boolean(pausedTour) && options.mode !== "onboarding";
    const next = {
      tourId,
      index: 0,
      mode: options.mode === "onboarding" ? "onboarding" : preservingPause ? "view-help" : "help",
      paths: {},
      routeNotice: firstRoute !== location.pathname ? describeRoute(firstRoute) : null
    };
    storeTourSession(next, preservingPause ? pausedTour : null);
    setError("");
    setMenuOpen(false);
    if (!preservingPause) setPausedTour(null);
    setActive(next);
    navigateForTour(firstRoute, next.mode);
    return true;
  }, [location.pathname, navigateForTour, pausedTour, user]);

  const startViewHelp = useCallback((path = location.pathname, options = {}) => {
    if (path === "/login" || path === "/init") return false;
    const contextual = availableTours(path, user).filter(item => item.id !== "system-overview");
    const selected = contextual.find(item => item.id !== "project-workflow") || contextual[0];
    const pause = options.paused || pausedTour || (active ? {
      active: { ...active, routeNotice: null },
      path: options.pausePath || location.pathname
    } : null);

    if (!selected) {
      setActive(null);
      setPausedTour(pause);
      storeTourSession(null, pause);
      return false;
    }

    const next = {
      tourId: selected.id,
      index: 0,
      mode: "view-help",
      scopePath: path,
      paths: {},
      routeNotice: options.routeChanged ? describeRoute(path) : null
    };
    setError("");
    setMenuOpen(false);
    setPausedTour(pause);
    setActive(next);
    storeTourSession(next, pause);
    const navigationMode = pause?.active?.mode === "onboarding" ? "onboarding" : "help";
    navigateForTour(path, navigationMode, { replace: true });
    return true;
  }, [active, location.pathname, navigateForTour, pausedTour, user]);

  const resumePausedTour = useCallback(() => {
    if (!pausedTour) return;
    const restored = {
      ...pausedTour.active,
      routeNotice: describeRoute(pausedTour.path)
    };
    setError("");
    setPausedTour(null);
    setActive(restored);
    storeTourSession(restored, null);
    navigateForTour(pausedTour.path, restored.mode);
  }, [navigateForTour, pausedTour]);

  useEffect(() => {
    const previousPath = lastPath.current;
    if (location.pathname === previousPath) return;
    lastPath.current = location.pathname;

    if (expectedPath.current === location.pathname) {
      expectedPath.current = null;
      return;
    }
    expectedPath.current = null;
    if (location.pathname === "/login" || location.pathname === "/init") return;

    const pause = pausedTour || (active ? {
      active: { ...active, routeNotice: null },
      path: previousPath
    } : null);
    if (!pause) return;
    manualPath.current = location.pathname;
    queueMicrotask(() => startViewHelp(location.pathname, {
      paused: pause,
      pausePath: previousPath,
      routeChanged: true
    }));
  }, [active, location.pathname, pausedTour, startViewHelp]);

  const stopTour = useCallback(() => {
    if (pausedTour) {
      storeTourSession(null, pausedTour);
      setActive(null);
      setTargetRect(null);
      setTargetMissing(false);
      setError("");
      return;
    }
    const onboardingMode = active?.mode === "onboarding";
    storeTourSession(null, null);
    setActive(null);
    setPausedTour(null);
    setTargetRect(null);
    setTargetMissing(false);
    setError("");
    const destination = onboardingMode ? "/init" : location.pathname;
    expectedPath.current = destination;
    navigate(destination, { replace: true });
  }, [active?.mode, location.pathname, navigate, pausedTour]);

  const finishTour = useCallback(async () => {
    if (active?.mode === "view-help") {
      storeTourSession(null, pausedTour);
      setActive(null);
      setTargetRect(null);
      setTargetMissing(false);
      if (!pausedTour) navigate(location.pathname, { replace: true });
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (active?.mode === "onboarding") await onboarding.advance("tour", "complete");
      storeTourSession(null, null);
      setActive(null);
      setPausedTour(null);
      setTargetRect(null);
      navigate(active?.mode === "onboarding" ? "/" : location.pathname, { replace: true });
    } catch (finishError) {
      setError(finishError.response?.data?.message || "Der Rundgang konnte nicht abgeschlossen werden.");
    } finally {
      setBusy(false);
    }
  }, [active, location.pathname, navigate, onboarding, pausedTour]);

  const moveTo = useCallback(nextIndex => {
    if (!active || !steps.length) return;
    if (nextIndex >= steps.length) {
      void finishTour();
      return;
    }
    const boundedIndex = Math.max(0, nextIndex);
    const paths = { ...(active.paths || {}), [currentIndex]: location.pathname };
    const nextStep = steps[boundedIndex];
    const configuredRoute = typeof nextStep?.route === "function" ? nextStep.route() : nextStep?.route;
    const destination = paths[boundedIndex] || configuredRoute;
    const next = {
      ...active,
      index: boundedIndex,
      paths,
      routeNotice: destination && destination !== location.pathname ? describeRoute(destination) : null
    };
    storeTourSession(next, pausedTour);
    setError("");
    setTargetRect(null);
    setTargetMissing(false);
    setActive(next);
    if (destination && destination !== location.pathname) {
      navigateForTour(destination, active.mode);
    }
  }, [active, currentIndex, finishTour, location.pathname, navigateForTour, pausedTour, steps]);

  const moveForward = useCallback(() => {
    if (targetMissing && step?.skipTo) {
      const candidates = Array.isArray(step.skipTo) ? step.skipTo : [step.skipTo];
      const destination = candidates
        .map(id => steps.findIndex((item, index) => index > currentIndex && item.id === id))
        .find(index => index >= 0);
      if (destination !== undefined) {
        moveTo(destination);
        return;
      }
    }
    moveTo(currentIndex + 1);
  }, [currentIndex, moveTo, step, steps, targetMissing]);

  useEffect(() => {
    if (!active || !step) return undefined;
    if (manualPath.current === location.pathname) {
      manualPath.current = null;
      return undefined;
    }
    const requiredPath = typeof step.route === "function" ? step.route() : step.route;
    if (requiredPath && location.pathname !== requiredPath) {
      navigateForTour(requiredPath, active.mode);
      return undefined;
    }

    const stepKey = `${active.tourId}:${step.id}`;
    let stopped = false;
    let observer;
    let target;
    const startedAt = Date.now();

    const updateRect = () => {
      if (!target?.isConnected) return;
      const next = target.getBoundingClientRect();
      setTargetRect({ top: next.top, left: next.left, right: next.right, bottom: next.bottom, width: next.width, height: next.height });
    };
    const locate = () => {
      if (stopped) return;
      const lateRoute = typeof step.route === "function" ? step.route() : null;
      if (lateRoute && location.pathname !== lateRoute) {
        const notice = describeRoute(lateRoute);
        const updated = { ...active, routeNotice: notice };
        setActive(updated);
        storeTourSession(updated, pausedTour);
        navigateForTour(lateRoute, active.mode);
        return;
      }
      if (step.activate && activatedStep.current !== stepKey) {
        const activator = document.querySelector(step.activate);
        if (activator) {
          activatedStep.current = stepKey;
          activator.click();
        }
      }
      target = document.querySelector(step.target);
      if (target) {
        setTargetMissing(false);
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        window.setTimeout(updateRect, 180);
        observer?.disconnect();
        observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateRect);
        observer?.observe(target);
        return;
      }
      if (Date.now() - startedAt > 5000) {
        setTargetRect(null);
        setTargetMissing(true);
        return;
      }
      window.setTimeout(locate, 100);
    };
    locate();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      stopped = true;
      observer?.disconnect();
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [active, location.pathname, navigateForTour, pausedTour, step]);

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === "F1") {
        event.preventDefault();
        if (!hiddenRoute && !event.repeat) startViewHelp(location.pathname, { pausePath: location.pathname });
        return;
      }
      if (!active) return;
      if (event.key === "Escape") stopTour();
      if (event.key === "ArrowLeft") moveTo(currentIndex - 1);
      if (event.key === "ArrowRight") moveForward();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, currentIndex, hiddenRoute, location.pathname, moveForward, moveTo, startViewHelp, stopTour]);

  const value = useMemo(() => ({ active: Boolean(active), startTour, stopTour }), [active, startTour, stopTour]);

  return <GuidedHelpContext.Provider value={value}>
    {children}
    {!hiddenRoute && !active && <>
      <button type="button" onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen} aria-haspopup="dialog" className="fixed bottom-4 right-4 z-[10001] grid size-12 place-items-center rounded-full border border-blue-400/50 bg-blue-600 text-xl font-bold text-white shadow-xl shadow-slate-950/50 hover:bg-blue-500" title="Hilfe für diese Ansicht (F1)">?</button>
      {menuOpen && <HelpMenu tours={contextualTours} onClose={() => setMenuOpen(false)} onStart={tourId => startTour(tourId)} />}
    </>}
    {pausedTour && <button type="button" onClick={resumePausedTour} className="fixed bottom-20 right-4 z-[10003] rounded-full border border-amber-500/70 bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white shadow-xl hover:bg-amber-600">↩ Rundgang fortsetzen</button>}
    {active && step && <SpotlightLayer rect={targetRect} step={step} index={currentIndex} count={steps.length} missing={targetMissing} busy={busy} error={error} mode={active.mode} routeNotice={active.routeNotice} paused={Boolean(pausedTour)} onPrevious={() => moveTo(currentIndex - 1)} onNext={moveForward} onClose={stopTour} onResume={resumePausedTour} />}
  </GuidedHelpContext.Provider>;
}
