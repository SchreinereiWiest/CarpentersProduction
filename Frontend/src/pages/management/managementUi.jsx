import { useEffect, useRef, useState } from 'react';

export const inputClass = 'w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2.5 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50';
export function Button({ children, secondary = false, danger = false, className = '', ...props }) {
  return <button type="button" {...props} className={`rounded-lg px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${danger ? 'border border-red-900 text-red-300 hover:bg-red-950' : secondary ? 'border border-gray-600 text-gray-300 hover:bg-gray-700' : 'bg-blue-600 text-white hover:bg-blue-500'} ${className}`}>{children}</button>;
}
export function Field({ label, hint, children }) {
  return <label className="block text-sm text-gray-300"><span className="mb-1.5 block">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}</label>;
}
export function Input({ label, hint, type = 'text', ...props }) {
  return <Field label={label} hint={hint}><input aria-label={label} type={type} step={type === 'number' ? '0.01' : undefined} className={inputClass} {...props}/></Field>;
}
export function Select({ label, children, ...props }) {
  return <Field label={label}><select className={inputClass} {...props}>{children}</select></Field>;
}
export function Card({ title, description, actions, children, className = '' }) {
  return <section className={`rounded-xl border border-gray-700 bg-gray-800/60 p-5 ${className}`}>
    {(title || actions) && <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-white">{title}</h2>{description && <p className="mt-1 max-w-3xl text-sm text-gray-400">{description}</p>}</div>{actions}</div>}{children}
  </section>;
}
export function Empty({ children }) { return <p className="py-7 text-center text-sm text-gray-400">{children}</p>; }
export function Notice({ children, warning = false }) {
  return <div className={`rounded-lg border p-3 text-sm ${warning ? 'border-amber-800 bg-amber-950/30 text-amber-200' : 'border-blue-900 bg-blue-950/30 text-blue-200'}`}>{children}</div>;
}
export function Modal({ title, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    (dialog.current.querySelector('input, select, textarea') || dialog.current).focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  const keyDown = event => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.current.querySelectorAll('button, input, select, textarea, a[href]')].filter(element => !element.disabled && element.type !== 'hidden');
    const target = event.shiftKey ? focusable.at(-1) : focusable[0];
    if (document.activeElement === (event.shiftKey ? focusable[0] : focusable.at(-1)) || document.activeElement === dialog.current) { event.preventDefault(); target?.focus(); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onMouseDown={event => event.target === event.currentTarget && onClose()} onKeyDown={keyDown}>
    <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-xl border border-gray-600 bg-gray-800 p-5 shadow-xl">
      <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{title}</h2><Button secondary onClick={onClose} aria-label="Dialog schließen">✕</Button></div>{children}
    </section>
  </div>;
}
export function ConfirmButton({ message, onConfirm, children = 'Löschen', ...props }) {
  const [confirming, setConfirming] = useState(false);
  return <><Button danger {...props} onClick={() => setConfirming(true)}>{children}</Button>{confirming && <Modal title="Eintrag entfernen" onClose={() => setConfirming(false)}><p className="mb-5 text-gray-300">{message}</p><div className="flex justify-end gap-3"><Button secondary onClick={() => setConfirming(false)}>Abbrechen</Button><Button danger onClick={async () => { if (await onConfirm()) setConfirming(false); }}>Entfernen</Button></div></Modal>}</>;
}
export function Table({ headers, children }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-gray-600 text-xs text-gray-400">{headers.map((header, index) => <th key={index} className="whitespace-nowrap px-3 py-3 font-medium">{header}</th>)}</tr></thead><tbody className="[&_td]:px-3 [&_td]:py-3 [&_tr]:border-b [&_tr]:border-gray-700/60">{children}</tbody></table></div>;
}
