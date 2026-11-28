import { useEffect, useState } from "react";
import axios from "axios";
import QRCode from "qrcode";

import { createPartCodePayload, getEticketInformationRows, normalizeEticketSettings } from "@Engine/eticket/index.js";

export default function EticketPrintDialog({ ticket, configuredSettings, onClose }) {
  const settings = normalizeEticketSettings(configuredSettings);
  const printerConfigured = configuredSettings?.printerConfigured ?? Boolean(settings.printer.host);
  const [qr, setQr] = useState("");
  const [status, setStatus] = useState(null);
  const code = createPartCodePayload(ticket);
  const rows = getEticketInformationRows(ticket, settings);

  useEffect(() => {
    let current = true;
    QRCode.toDataURL(code, { width: 420, margin: 1, errorCorrectionLevel: "M" })
      .then(value => current && setQr(value)).catch(() => current && setQr(""));
    return () => { current = false; };
  }, [code]);

  const print = async () => {
    setStatus({ type: "pending", message: "Druckauftrag wird an den Server übertragen …" });
    try {
      const { data } = await axios.post("/api/etickets/print", ticket);
      setStatus({ type: "success", message: `${data.copies} Etikett${data.copies === 1 ? "" : "en"} für PID ${data.pid} an den Drucker gesendet.` });
    } catch (error) {
      setStatus({ type: "error", message: error.response?.data?.message ?? "Der Druckauftrag ist fehlgeschlagen." });
    }
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="eticket-title" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-gray-700 px-6 py-4"><div><h2 id="eticket-title" className="text-lg font-semibold text-white">Eticket drucken</h2><p className="mt-1 text-xs text-gray-500">PID {ticket.pid} · Instanz {ticket.instanceId} · {ticket.productionPath === "1d" ? "1D-Zuschnitt" : "2D-Nesting"}</p></div><button type="button" onClick={onClose} className="rounded px-3 py-1 text-xl text-gray-400 hover:bg-gray-800 hover:text-white" aria-label="Schließen">×</button></header>
      <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <div className="rounded-xl border border-gray-700 bg-white p-4 text-gray-950">
            {settings.preprint.enabled && settings.preprint.title && <h3 className="mb-3 text-xl font-black tracking-wider">{settings.preprint.title}</h3>}
            <dl className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-1 text-sm">{rows.map(row => <div key={row.key} className="contents"><dt className="font-semibold">{row.label}</dt><dd className="min-w-0 break-words">{row.value}</dd></div>)}</dl>
            {settings.preprint.enabled && settings.preprint.footer && <p className="mt-4 border-t pt-2 text-xs text-gray-500">{settings.preprint.footer}</p>}
          </div>
          <div className="mt-4 rounded-lg border border-gray-700 bg-gray-950 p-3 font-mono text-[11px] leading-relaxed text-gray-500 break-all">{code}</div>
          {status && <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${status.type === "success" ? "border-emerald-800 bg-emerald-950 text-emerald-300" : status.type === "error" ? "border-red-900 bg-red-950 text-red-300" : "border-blue-900 bg-blue-950 text-blue-300"}`}>{status.message}</div>}
          {!printerConfigured && <div className="mt-4 rounded-lg border border-amber-900 bg-amber-950 px-4 py-3 text-sm text-amber-300">Es ist noch kein Netzwerkdrucker in den CNC-Firmeneinstellungen hinterlegt.</div>}
        </div>
        <div className="flex min-h-52 items-center justify-center rounded-xl border border-gray-700 bg-white p-3">
          {settings.code.type === "qr" ? <img src={qr} className="max-h-full max-w-full" alt="Eticket QR-Code" /> : <div className="flex h-36 w-full items-stretch justify-center gap-px">{Array.from({ length: 46 }, (_, index) => <i key={index} className="bg-black" style={{ width: `${index % 7 === 0 ? 4 : index % 3 === 0 ? 2 : 1}px` }} />)}</div>}
        </div>
      </div>
      <footer className="flex items-center justify-between gap-4 border-t border-gray-700 bg-gray-950 px-6 py-4"><p className="text-xs text-gray-500">{settings.label.widthMm} × {settings.label.heightMm} mm · {settings.printer.language.toUpperCase()} · {settings.label.copies} Kopie(n)</p><div className="flex gap-2"><button type="button" onClick={onClose} className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">Schließen</button><button type="button" onClick={print} disabled={!settings.enabled || !printerConfigured || status?.type === "pending"} className="rounded bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40">Eticket drucken</button></div></footer>
    </div>
  </div>;
}
