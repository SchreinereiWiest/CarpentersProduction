import { useState } from 'react';
import { IMPORT_TEMPLATE, importManagementCsv } from '../../../../shared/managementImport.mjs';
import { createUuid } from './managementUuid.js';
import { Button, Card, Notice } from './managementUi.jsx';

function download(content, name) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}
export default function SetupImport({ config, change, year }) {
  const [preview, setPreview] = useState(null); const [error, setError] = useState('');
  return <Card title="Vorhandene Kalkulationsdaten importieren" description="CSV für Anlagen, Restschulden, Bestände und jährliche Kosten. Der Import wird zuerst geprüft und danach in den Entwurf übernommen. Eine direkte DATEV-Anbindung ist noch nicht eingerichtet." actions={<Button secondary onClick={() => download(IMPORT_TEMPLATE, 'Betrieb-Import-Vorlage.csv')}>CSV-Vorlage herunterladen</Button>}>
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Bereiche: maschine, cnc, fahrzeug, gebäude, ausstattung, darlehen, kosten oder bilanz. Beträge ohne Umsatzsteuer; bei Bilanzbeständen die tatsächlichen Bestandswerte verwenden. Wiederholte Kennungen ersetzen vorhandene Positionen; ohne Kennung wird der Positionsname abgeglichen.</p>
      <label className="block text-sm">CSV-Datei auswählen<input aria-label="CSV-Datei auswählen" className="mt-2 block text-sm" type="file" accept=".csv,text/csv" onChange={async e => {
        setPreview(null); setError(''); const file = e.target.files[0]; if (!file) return;
        try { if (file.size > 2000000) throw new Error('Datei darf maximal 2 MB groß sein.'); setPreview(importManagementCsv(await file.text(), config, createUuid)); }
        catch (err) { setError(err.message); }
        e.target.value = '';
      }}/></label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {preview && <Notice>{preview.counts.assets} Anlagen · {preview.counts.loans} Darlehen · {preview.counts.annualCosts} Kostenpositionen · {preview.counts.balances} Bestände geprüft. Vorhandene Positionen werden bei gleicher Kennung oder gleichem Namen aktualisiert.<Button className="ml-3" onClick={() => { change(c => { Object.assign(c, preview.config); }); setPreview(null); }}>In Entwurf übernehmen</Button></Notice>}
      <p className="text-xs text-gray-500">Import gilt für Geschäftsjahr {year}. Erst „Speichern“ übernimmt den Entwurf dauerhaft; eine Freigabe erfolgt separat in Schritt 08.</p>
    </div>
  </Card>;
}
