import { useState } from 'react';
import axios from 'axios';
import { useManagement } from './managementContext.js';
import { Card, ConfirmButton, Empty, Table } from './managementUi.jsx';

export function DocumentInbox({ compact = false }) {
  const { references, refresh, busy } = useManagement();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const files = references.files.filter(file => file.category === 'management-document');
  const upload = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    setError('');
    if (file.size > 50 * 1024 * 1024 || !['application/pdf', 'image/jpeg'].includes(file.type)) { setError('Bitte PDF oder JPG mit maximal 50 MB auswählen.'); return; }
    setUploading(true);
    try {
      const body = new FormData(); body.append('file', file); body.append('fileName', file.name);
      await axios.post('/api/files/management-document', body); await refresh();
    } catch (err) { setError(err.response?.data?.message || 'Beleg konnte nicht hochgeladen werden.'); }
    finally { setUploading(false); event.target.value = ''; }
  };
  const download = async file => {
    setError('');
    try { const { data } = await axios.get(`/api/files/download/${file.id}`); window.open(data.url, '_blank', 'noopener,noreferrer'); }
    catch { setError('Beleg konnte nicht geöffnet werden.'); }
  };
  const remove = async file => {
    setError(''); setUploading(true);
    try { await axios.delete(`/api/files/delete/${file.id}`); await refresh(); return true; }
    catch (err) { setError(err.response?.data?.message || 'Beleg konnte nicht entfernt werden.'); return false; }
    finally { setUploading(false); }
  };
  return <Card title="Belegeingang" description="Dokumente sammeln und öffnen. Die Kalkulation arbeitet derzeit mit Jahreskosten und Zeitberichten; eine automatische Übernahme ist für die spätere DATEV-Anbindung vorgesehen." actions={<label className={`cursor-pointer rounded-lg border border-gray-600 px-4 py-2.5 text-sm ${uploading || busy ? 'pointer-events-none opacity-50' : 'hover:bg-gray-700'}`}>{uploading ? 'Lädt hoch …' : 'Beleg hochladen'}<input aria-label="Beleg hochladen" type="file" className="sr-only" accept="application/pdf,image/jpeg" disabled={busy || uploading} onChange={upload}/></label>}>
    {error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}
    {!files.length ? <Empty>Noch keine Betriebsbelege vorhanden. PDF oder JPG hochladen.</Empty> : <Table headers={['Beleg', 'Aktion']}>{files.slice(0, compact ? 5 : undefined).map(file => <tr key={file.id}><td><button className="text-blue-300 hover:underline" onClick={() => download(file)}>{file.fileName}</button></td><td><div className="flex flex-wrap items-center gap-3"><ConfirmButton disabled={busy || uploading} message="Diese Belegdatei entfernen?" onConfirm={() => remove(file)}/></div></td></tr>)}</Table>}
  </Card>;
}

export function ManagementDocuments() {
  return <div className="space-y-5"><header><h1 className="text-2xl font-bold">Dokumente</h1><p className="mt-2 text-sm text-gray-400">Betriebsbelege sammeln. Die Erfassung einzelner Geschäftsvorfälle ist derzeit ausgeblendet.</p></header><DocumentInbox/></div>;
}
