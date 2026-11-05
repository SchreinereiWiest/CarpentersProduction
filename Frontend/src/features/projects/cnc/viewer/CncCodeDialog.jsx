export default function CncCodeDialog({ part, postprocessor, result, onClose }) {
    const code = result?.content ?? result?.code ?? "";
    return (
        <section role="dialog" aria-modal="true" aria-label="Postprozessor-Code ansehen" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-5">
            <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-blue-800 bg-gray-900 shadow-2xl">
                <header className="flex items-start justify-between border-b border-gray-700 px-5 py-4">
                    <div>
                        <h2 className="font-semibold text-white">Postprozessor-Code</h2>
                        <p className="mt-1 text-xs text-gray-500">{part?.Objektname ?? part?.PID} · {postprocessor?.name} · {result?.fileName}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-white">×</button>
                </header>
                {!!result?.diagnostics?.length && <div className="border-b border-amber-900 bg-amber-950/30 px-4 py-2 text-xs text-amber-300">{result.diagnostics.map((entry, index) => <div key={index}>{entry.message}</div>)}</div>}
                <pre className="min-h-0 flex-1 overflow-auto bg-gray-950 p-5 font-mono text-xs leading-relaxed text-emerald-200">{String(code)}</pre>
                <footer className="flex justify-end border-t border-gray-700 p-3">
                    <button type="button" onClick={onClose} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500">Schließen</button>
                </footer>
            </div>
        </section>
    );
}
