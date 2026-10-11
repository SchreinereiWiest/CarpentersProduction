import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import axios from 'axios';
import SideBar from '../../components/sideBar.jsx';
import ManagementBar from '../../components/managementBar.jsx';
import { today } from '../../../../shared/management.mjs';
import { Button, inputClass } from './managementUi.jsx';

export default function ManagementLayout({ sidebarSelected = 1 }) {
  const [year, setYear] = useState(Number(today().slice(0, 4)));
  const [basis, setBasis] = useState('actual');
  const [state, setState] = useState(null);
  const [references, setReferences] = useState({ projects: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async signal => {
    const [data, refs] = await Promise.all([
      axios.get('/api/management', { params: { year, basis }, signal }),
      axios.get('/api/management/references', { signal }),
    ]);
    setState(data.data); setReferences(refs.data);
  }, [year, basis]);
  useEffect(() => {
    const controller = new AbortController();
    const start = async () => {
      setLoading(true); setError(''); setMessage('');
      try { await load(controller.signal); }
      catch (err) { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Betriebsdaten konnten nicht geladen werden.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    start();
    return () => controller.abort();
  }, [load]);
  const act = async (method, path, data, success = 'Gespeichert.') => {
    if (busy) return false;
    setBusy(true); setError(''); setMessage('');
    let written = false;
    try {
      await axios({ method, url: `/api/management${path}`, params: { year }, data });
      written = true;
      await load(); setMessage(success); return true;
    } catch (err) {
      setError(written ? 'Änderung gespeichert. Die aktualisierten Daten konnten noch nicht geladen werden. Bitte „Aktualisieren“ verwenden.' : err.response?.data?.message || 'Änderung konnte nicht abgeschlossen werden. Bitte neu laden und prüfen.');
      return written;
    }
    finally { setBusy(false); }
  };
  const refresh = async () => {
    setBusy(true); setError('');
    try { await load(); } catch (err) { setError(err.response?.data?.message || 'Betriebsdaten konnten nicht geladen werden.'); }
    finally { setBusy(false); }
  };
  return <div className="flex h-dvh w-full overflow-hidden bg-gray-900 text-white">
    <SideBar selected={sidebarSelected}/>
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <ManagementBar/>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 xl:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-xs font-medium uppercase tracking-widest text-blue-400">Management</p><p className="mt-1 text-sm text-gray-400">Interne Kosten- und Leistungsrechnung · {state?.config.mode === 'full' ? 'Vollkalkulation' : 'Easy-Modus'}</p></div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs text-gray-400">Geschäftsjahr<select aria-label="Geschäftsjahr" disabled={busy} value={year} onChange={event => setYear(Number(event.target.value))} className={`${inputClass} mt-1 min-w-28`}>{Array.from(new Set([year, ...Array.from({ length: 12 }, (_, i) => Number(today().slice(0, 4)) - 6 + i)])).sort((a, b) => b - a).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
              <label className="text-xs text-gray-400">Kostenbasis<select aria-label="Kostenbasis" disabled={busy} value={basis} onChange={event => setBasis(event.target.value)} className={`${inputClass} mt-1`}><option value="actual">Ist-Werte</option><option value="plan">Plan-Werte</option></select></label>
              <Button secondary disabled={busy || loading} onClick={refresh}>Aktualisieren</Button>
            </div>
          </div>
          {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{error}</p>}
          {message && <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-200">{message}</p>}
          {loading ? <p className="py-16 text-center text-gray-400">Betriebsdaten werden geladen …</p> : state?.year === year ? <Outlet key={`${year}:${state.revision}:${basis}`} context={{ state, calculation: state.calculation, references, year, basis, busy, error, act, refresh, saveConfig: config => act('put', '/settings', { config, revision: state.revision }, 'Betriebsmodell gespeichert und neu berechnet.') }}/>: <Button secondary onClick={refresh}>Erneut laden</Button>}
        </div>
      </div>
    </main>
  </div>;
}
