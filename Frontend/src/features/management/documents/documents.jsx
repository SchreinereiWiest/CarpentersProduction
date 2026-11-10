import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router';
import { MeasurementScanInbox } from './measurementScanInbox.jsx';
import { CarpentersGarageLibrary, ManualDocumentFolders, PaperlessInbox, PaperlessLibrary } from './paperlessDocuments.jsx';

/** Zeigt die Betriebsdokumentenablage ohne die entfernte Erfassung einzelner Geschäftsvorfälle. */
export function ManagementDocuments() {
  const [status, setStatus] = useState({ configured: false, connected: false, folders: [] });
  const [tab, setTab] = useState('inbox');

  useEffect(() => {
    let active = true;
    axios.get('/api/paperless/status')
      .then(({ data }) => active && setStatus(data))
      .catch(() => active && setStatus({ configured: false, connected: false, folders: [] }));
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Dokumente</h1>
        <p className="mt-2 text-sm text-gray-400">
          Paperless- und Carpenters-Dokumente gemeinsam prüfen und mit Kunden, Projekten oder internen Ordnern verknüpfen.
        </p>
      </header>
      {!status.connected && <div className="rounded-xl border border-amber-900 bg-amber-950/30 p-5 text-sm text-amber-100"><h2 className="font-semibold">Paperless-ngx ist noch nicht verbunden</h2><p className="mt-1 text-amber-200/70">Die bestehende Carpenters-Ablage bleibt verfügbar. Die externe Bibliothek erscheint nach der Einrichtung unter Advanced → Dokumente.</p><Link to="/CompanySettings?section=advanced&tab=documents" className="mt-3 inline-block rounded-lg bg-amber-700 px-4 py-2 font-medium hover:bg-amber-600">Zu den Einstellungen</Link></div>}
      <nav aria-label="Dokumentbereiche" className="flex gap-1 overflow-x-auto border-b border-slate-700">
        {[
          ['inbox', 'Eingang'],
          ...(status.connected ? [['library', 'Paperless-Bibliothek']] : []),
          ['local', 'Carpenters-Dateien']
        ].map(([id, label]) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${tab === id ? 'border-blue-500 text-blue-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>{label}</button>)}
      </nav>
      {tab === 'inbox' && <PaperlessInbox connected={status.connected} />}
      {status.connected && tab === 'library' && <PaperlessLibrary paperlessUrl={status.baseUrl} />}
      {tab === 'local' && <div className="space-y-8"><MeasurementScanInbox /><ManualDocumentFolders folders={status.folders} /><CarpentersGarageLibrary /></div>}
    </div>
  );
}
