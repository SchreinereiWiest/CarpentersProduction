export default function ProgramHeaderDialog({ header, locations = [], onChange, onCancel, onSave }) {
    return (
        <section role="dialog" aria-modal="true" aria-label="CNC-Header ändern" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-xl border border-emerald-800 bg-gray-900 shadow-2xl">
                <header className="flex items-start justify-between border-b border-gray-700 px-5 py-4">
                    <div>
                        <h2 className="font-semibold text-white">CNC-Header ändern</h2>
                        <p className="mt-1 text-xs text-gray-500">Anschlag und Bauteilorientierung werden vom aktiven Postprozessor aufgelöst.</p>
                    </div>
                    <button type="button" onClick={onCancel} className="rounded px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-white">×</button>
                </header>
                <div className="space-y-4 p-5">
                    <label>
                        <span className="mb-1 block text-xs text-gray-400">Anschlag</span>
                        <select value={header.stopId ?? locations[0]?.id ?? ""} onChange={event => onChange({ ...header, stopId: event.target.value })} className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white">
                            {locations.map(location => <option key={location.id} value={location.id}>{location.label ?? location.id} · {location.anchorCorner === "top-right" ? "oben rechts" : "oben links"}</option>)}
                        </select>
                    </label>
                    <label>
                        <span className="mb-1 block text-xs text-gray-400">Kante am Anschlag</span>
                        <select value={header.edgeAtStop ?? "front"} onChange={event => onChange({ ...header, edgeAtStop: event.target.value })} className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white">
                            <option value="front">Frontkante</option>
                            <option value="back">Bauteilrücken</option>
                        </select>
                    </label>
                    <label>
                        <span className="mb-1 block text-xs text-gray-400">Bauteilkommentar</span>
                        <textarea value={header.comment ?? ""} maxLength={120} rows={3} onChange={event => onChange({ ...header, comment: event.target.value })} placeholder="Optionaler Kommentar im Programmheader" className="w-full resize-none rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-600" />
                        <span className="mt-1 block text-right text-[10px] text-gray-600">{String(header.comment ?? "").length}/120</span>
                    </label>
                </div>
                <footer className="flex justify-end gap-2 border-t border-gray-700 p-4">
                    <button type="button" onClick={onCancel} className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300">Abbrechen</button>
                    <button type="button" onClick={onSave} className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">Übernehmen</button>
                </footer>
            </div>
        </section>
    );
}
