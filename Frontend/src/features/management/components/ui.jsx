import { useEffect, useRef, useState } from "react";

import { inputClass, UI_DEFAULTS } from '../defaults/ui.defaults.js';

/** Rendert eine einheitliche Aktion mit deaktiviertem Zustand und optionalem Neben- oder Löschstil. */
export function Button({
  children,
  secondary = UI_DEFAULTS.secondary,
  danger = UI_DEFAULTS.danger,
  className = UI_DEFAULTS.className,
  ...props
}) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "border border-red-900 text-red-300 hover:bg-red-950" : secondary ? "border border-gray-600 text-gray-300 hover:bg-gray-700" : "bg-blue-600 text-white hover:bg-blue-500"} ${className}`}
    >
      {children}
    </button>
  );
}
/** Verbindet Feldbezeichnung, Eingabeelement und optionalen erklärenden Hinweis. */
export function Field({ label, hint, children }) {
  return (
    <label className="block text-sm text-gray-300">
      <span className="mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}
/** Rendert ein beschriftetes Eingabefeld mit gemeinsamen Vorgaben und optionaler numerischer Schrittweite. */
export function Input({ label, hint, type = UI_DEFAULTS.inputType, ...props }) {
  return (
    <Field label={label} hint={hint}>
      <input
        aria-label={label}
        type={type}
        step={type === "number" ? UI_DEFAULTS.numberStep : undefined}
        className={inputClass}
        {...props}
      />
    </Field>
  );
}
/** Rendert eine beschriftete Auswahlliste mit der gemeinsamen Managementgestaltung. */
export function Select({ label, children, ...props }) {
  return (
    <Field label={label}>
      <select className={inputClass} {...props}>
        {children}
      </select>
    </Field>
  );
}
/** Gruppiert zusammengehörige Eingaben oder Ergebnisse mit optionaler Überschrift und Aktionen. */
export function Card({
  title,
  description,
  actions,
  children,
  className = UI_DEFAULTS.className
}) {
  return (
    <section
      className={`rounded-xl border border-gray-700 bg-gray-800/60 p-5 ${className}`}
    >
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">{title}</h2>
            {description && (
              <p className="mt-1 max-w-3xl text-sm text-gray-400">
                {description}
              </p>
            )}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
/** Zeigt einen verständlichen Hinweis, wenn eine Liste noch keine Einträge enthält. */
export function Empty({ children }) {
  return <p className="py-7 text-center text-sm text-gray-400">{children}</p>;
}
/** Kennzeichnet Erläuterungen oder fachliche Warnungen in der Ansicht. */
export function Notice({ children, warning = UI_DEFAULTS.warning }) {
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${warning ? "border-amber-800 bg-amber-950/30 text-amber-200" : "border-blue-900 bg-blue-950/30 text-blue-200"}`}
    >
      {children}
    </div>
  );
}
/** Zeigt einen Dialog mit Fokusübernahme, Fokusbegrenzung und Schließen per Escape. */
export function Modal({ title, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    (
      dialog.current.querySelector("input, select, textarea") || dialog.current
    ).focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  /** Behandelt Escape und Tab, damit der Fokus im geöffneten Dialog bleibt. */
  const keyDown = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
    if (event.key !== "Tab") return;
    const focusable = [
      ...dialog.current.querySelectorAll(
        "button, input, select, textarea, a[href]"
      )
    ].filter((element) => !element.disabled && element.type !== "hidden");
    const target = event.shiftKey ? focusable.at(-1) : focusable[0];
    if (
      document.activeElement ===
        (event.shiftKey ? focusable[0] : focusable.at(-1)) ||
      document.activeElement === dialog.current
    ) {
      event.preventDefault();
      target?.focus();
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      onKeyDown={keyDown}
    >
      <section
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-xl border border-gray-600 bg-gray-800 p-5 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{title}</h2>
          <Button secondary onClick={onClose} aria-label="Dialog schließen">
            ✕
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}
/** Fordert vor dem Entfernen eines Dokuments eine ausdrückliche Bestätigung an. */
export function ConfirmButton({
  message,
  onConfirm,
  children = UI_DEFAULTS.confirmLabel,
  ...props
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <Button danger {...props} onClick={() => setConfirming(true)}>
        {children}
      </Button>
      {confirming && (
        <Modal title="Eintrag entfernen" onClose={() => setConfirming(false)}>
          <p className="mb-5 text-gray-300">{message}</p>
          <div className="flex justify-end gap-3">
            <Button secondary onClick={() => setConfirming(false)}>
              Abbrechen
            </Button>
            <Button
              danger
              onClick={async () => {
                if (await onConfirm()) setConfirming(false);
              }}
            >
              Entfernen
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
/** Rendert eine horizontal scrollbar angelegte Tabelle mit konsistenten Kopf- und Datenzellen. */
export function Table({ headers, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-600 text-xs text-gray-400">
            {headers.map((header, index) => (
              <th
                key={index}
                className="whitespace-nowrap px-3 py-3 font-medium"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:px-3 [&_td]:py-3 [&_tr]:border-b [&_tr]:border-gray-700/60">
          {children}
        </tbody>
      </table>
    </div>
  );
}
