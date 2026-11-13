import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";

import { useAuth } from "../../app/providers/AuthContext.js";
import { isWorkspacePane } from "../../shared/workspace/workspace-settings.js";

const ACTIVE_STATUSES = new Set(["ringing", "answered"]);

const statusLabel = status => status === "answered" ? "Verbunden" : "Eingehender Anruf";

const goToCustomerCrm = customerId => {
  window.dispatchEvent(new CustomEvent("carpenters-global-navigate", {
    detail: { path: `/Kontakte/info/${customerId}/crm` }
  }));
};

function CallStatusBar({ call, onClose, onOpenCrm }) {
  if (!call) return null;
  return (
    <div role="status" className="z-40 flex min-h-11 shrink-0 items-center gap-3 border-b border-sky-700 bg-sky-950 px-3 py-2 text-white shadow-lg sm:px-5">
      <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
        {call.status === "ringing" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-300 opacity-75" />}
        <span className={`relative inline-flex h-3 w-3 rounded-full ${call.status === "answered" ? "bg-emerald-400" : "bg-sky-400"}`} />
      </span>
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-sky-200">{statusLabel(call.status)}</span>
      <span className="min-w-0 truncate text-sm font-semibold">{call.customer?.name || "Unbekannte Rufnummer"}</span>
      <span className="hidden truncate text-xs text-slate-300 md:inline">{call.customer?.email || "Keine E-Mail"}</span>
      <span className="ml-auto shrink-0 text-sm tabular-nums text-sky-100">{call.customer?.phone || call.callerNumber}</span>
      {call.customer && <button type="button" onClick={onOpenCrm} className="shrink-0 rounded-md bg-sky-600 px-3 py-1 text-xs font-semibold hover:bg-sky-500">CRM</button>}
      <button type="button" aria-label="Anrufleiste schließen" onClick={onClose} className="shrink-0 rounded-md border border-sky-700 px-2.5 py-1 text-xs text-sky-100 hover:bg-sky-900">Schließen</button>
    </div>
  );
}

function IncomingCallModal({ call, onClose, onOpenCrm }) {
  if (!call) return null;
  const ringing = call.status === "ringing";
  return (
    <div
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm"
    >
      <section role="dialog" aria-modal="true" aria-labelledby="incoming-call-title" className="w-full max-w-md rounded-2xl border border-sky-700 bg-slate-900 p-6 text-center text-white shadow-2xl shadow-sky-950/70">
        <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-sky-600/20 text-4xl" aria-hidden="true">
          {ringing && <span className="absolute inset-0 animate-ping rounded-full border-2 border-sky-400/70" />}
          <span className="relative">☎</span>
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">{statusLabel(call.status)}</p>
        <h2 id="incoming-call-title" className="mt-2 text-2xl font-bold">{call.customer?.name || "Unbekannte Rufnummer"}</h2>
        <p className="mt-2 text-lg tabular-nums text-slate-200">{call.callerNumber}</p>
        {call.customer?.email && <p className="mt-1 text-sm text-slate-400">{call.customer.email}</p>}
        <div className="mt-6 flex justify-center gap-3">
          {call.customer && <button type="button" onClick={onOpenCrm} className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold hover:bg-sky-500">Kunden-CRM öffnen</button>}
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm text-slate-200 hover:bg-slate-800">Schließen</button>
        </div>
      </section>
    </div>
  );
}

export default function GlobalPhoneCallLayer({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [calls, setCalls] = useState([]);
  const [modalCallId, setModalCallId] = useState(null);
  const [dismissedBars, setDismissedBars] = useState(() => new Set());
  const dismissedModals = useRef(new Set());
  const enabled = Boolean(user?.features?.includes("crm") && ["admin", "manager"].includes(user?.role));
  const paneMode = isWorkspacePane();

  useEffect(() => {
    if (!enabled || paneMode || location.pathname === "/login") return undefined;
    let active = true;
    const applyCall = call => {
      if (!active || !call?.id) return;
      if (!ACTIVE_STATUSES.has(call.status)) {
        setCalls(previous => previous.filter(entry => entry.id !== call.id));
        setModalCallId(previous => previous === call.id ? null : previous);
        dismissedModals.current.delete(call.id);
        setDismissedBars(previous => {
          if (!previous.has(call.id)) return previous;
          const next = new Set(previous);
          next.delete(call.id);
          return next;
        });
        return;
      }
      setCalls(previous => [call, ...previous.filter(entry => entry.id !== call.id)]);
      if (call.status === "ringing" && !dismissedModals.current.has(call.id)) setModalCallId(call.id);
    };

    const loadActiveCalls = () => axios.get("/api/contact-history/calls/active")
      .then(({ data }) => {
        if (!active) return;
        const next = Array.isArray(data.calls) ? data.calls.filter(call => ACTIVE_STATUSES.has(call.status)) : [];
        setCalls(next);
        const ringing = next.find(call => call.status === "ringing");
        if (ringing && !dismissedModals.current.has(ringing.id)) setModalCallId(ringing.id);
      })
      .catch(() => undefined);
    void loadActiveCalls();

    const source = typeof EventSource === "undefined"
      ? null
      : new EventSource("/api/contact-history/calls/events", { withCredentials: true });
    if (source) source.onopen = loadActiveCalls;
    source?.addEventListener("phone-call", event => {
      try {
        applyCall(JSON.parse(event.data));
      } catch {
        // Ein unvollständiges Live-Ereignis darf die restliche Oberfläche nicht stören.
      }
    });
    return () => {
      active = false;
      source?.close();
    };
  }, [enabled, location.pathname, paneMode]);

  const visibleCall = useMemo(
    () => calls.find(call => !dismissedBars.has(call.id)) || null,
    [calls, dismissedBars]
  );
  const modalCall = calls.find(call => call.id === modalCallId) || null;

  useEffect(() => {
    if (!modalCall) return undefined;
    const closeOnEscape = event => {
      if (event.key === "Escape") {
        dismissedModals.current.add(modalCall.id);
        setModalCallId(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [modalCall]);

  if (!enabled || paneMode || location.pathname === "/login") return children;

  const openCrm = call => {
    if (!call?.customer?.id) return;
    dismissedModals.current.add(call.id);
    setModalCallId(null);
    goToCustomerCrm(call.customer.id);
  };

  const closeModal = () => {
    if (modalCall) dismissedModals.current.add(modalCall.id);
    setModalCallId(null);
  };

  return (
    <div className="phone-call-shell">
      <CallStatusBar
        call={visibleCall}
        onClose={() => setDismissedBars(previous => new Set(previous).add(visibleCall.id))}
        onOpenCrm={() => openCrm(visibleCall)}
      />
      <div className="phone-call-content">{children}</div>
      <IncomingCallModal call={modalCall} onClose={closeModal} onOpenCrm={() => openCrm(modalCall)} />
    </div>
  );
}
