import { createUuid } from './managementUuid.js';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import axios from 'axios';
import { useManagement } from './managementContext.js';
import { day, grossAmount, round, today } from '../../../../shared/management.mjs';
import { Button, Card, ConfirmButton, Empty, Field, Input, Modal, Notice, Select, Table, inputClass } from './managementUi.jsx';
import { dateLabel, money } from './managementFormat.js';

const kinds = { income: 'Einnahme / Ertrag', expense: 'Ausgabe / Kosten', cash_in: 'Neutraler Geldzugang', cash_out: 'Neutraler Geldabgang' };
const sources = { manual: 'Manuell', invoice: 'Rechnung', payroll: 'Lohn / Gehalt', rent: 'Miete', insurance: 'Versicherung', bank: 'Bankbewegung', imputed: 'Kalkulatorischer Wert' };

function TransactionForm({ entry, fileId, onClose }) {
  const { state, calculation, references, basis, act, busy, error } = useManagement();
  const initialDate = today() >= calculation.range.start && today() <= calculation.range.end ? today() : calculation.range.start;
  const [form, setForm] = useState(entry ? { ...entry, date: day(entry.date), dueDate: day(entry.dueDate), fileId: entry.fileId || '', projectId: entry.projectId || '' } : { title: '', kind: 'expense', basis, source: 'manual', sourceKey: `manual:${createUuid()}`, date: initialDate, dueDate: '', amount: '', vatRate: 0, counterparty: '', costTypeId: '', centerId: '', fileId: fileId || '', projectId: '', note: '' });
  const change = (field, value) => setForm(current => ({ ...current, [field]: value }));
  const submit = async event => { event.preventDefault(); if (await act(entry ? 'put' : 'post', `/transactions${entry ? `/${entry.id}` : ''}`, form)) onClose(); };
  return <Modal title={entry ? 'Geschäftsvorfall bearbeiten' : 'Geschäftsvorfall erfassen'} onClose={onClose}><form onSubmit={submit} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Bezeichnung" required value={form.title} onChange={event => change('title', event.target.value)}/>
      <Input label="Kunde / Lieferant" value={form.counterparty || ''} onChange={event => change('counterparty', event.target.value)}/>
      <Select label="Art" value={form.kind} onChange={event => change('kind', event.target.value)}>{Object.entries(kinds).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</Select>
      <Select label="Datenbasis" value={form.basis} onChange={event => change('basis', event.target.value)}><option value="actual">Ist-Wert</option><option value="plan">Plan-Wert (ohne Zahlungen)</option></Select>
      <Input label="Leistungsdatum" type="date" required value={form.date} onChange={event => change('date', event.target.value)}/>
      <Input label="Fälligkeit (optional)" type="date" value={form.dueDate} onChange={event => change('dueDate', event.target.value)}/>
      <Input label={form.kind.startsWith('cash_') ? 'Geldbetrag (€)' : 'Nettobetrag (€)'} type="number" min="0.01" required value={form.amount} onChange={event => change('amount', event.target.value)}/>
      {!form.kind.startsWith('cash_') && <Input label="Umsatzsteueranteil (%)" hint="Nur zur Ermittlung von Zahlbetrag und offenen Posten." type="number" min="0" max="100" required value={form.vatRate} onChange={event => change('vatRate', event.target.value)}/>}
      <Select label="Herkunft" value={form.source} onChange={event => change('source', event.target.value)}>{Object.entries(sources).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</Select>
      <Select label="Projekt (optional)" value={form.projectId} onChange={event => change('projectId', event.target.value)}><option value="">Betriebsweiter Vorgang</option>{references.projects.map(project => <option key={project.id} value={project.id}>{project.projectNumber ? `${project.projectNumber} · ` : ''}{project.title}</option>)}</Select>
      {form.kind === 'expense' && <><Select label="Kostenart" value={form.costTypeId || ''} onChange={event => change('costTypeId', event.target.value)}><option value="">Noch nicht zugeordnet / Regel anwenden</option>{state.config.costTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</Select><Select label="Kostenstelle" value={form.centerId || ''} onChange={event => change('centerId', event.target.value)}><option value="">Über Verteilungsschlüssel / Regel</option>{state.config.costCenters.map(center => <option key={center.id} value={center.id}>{center.name}</option>)}</Select></>}
      <Select label="Beleg (optional)" value={form.fileId} onChange={event => change('fileId', event.target.value)}><option value="">Kein Beleg verknüpft</option>{references.files.map(file => <option key={file.id} value={file.id}>{file.fileName}</option>)}</Select>
    </div>
    <Field label="Notiz"><textarea className={inputClass} value={form.note || ''} onChange={event => change('note', event.target.value)}/></Field>
    <Notice>{form.source === 'imputed' ? 'Kalkulatorische Werte sind interne Kosten ohne Umsatzsteueranteil, offene Posten oder Zahlungen.' : form.kind.startsWith('cash_') ? 'Neutrale Geldbewegungen verändern ausschließlich die Liquidität. Anlagenkäufe und Tilgungen zählen über ihre Abschreibung bzw. Zinsen zu den Kosten.' : `Zahlbetrag: ${money(grossAmount(form))}. Zahlungen nach dem Speichern separat erfassen; eine Rechnung wird dadurch nicht nochmals als Kosten gezählt.`}</Notice>
    {error && <Notice warning>{error}</Notice>}
    <div className="flex justify-end gap-3"><Button secondary disabled={busy} onClick={onClose}>Abbrechen</Button><Button type="submit" disabled={busy}>{busy ? 'Speichert …' : 'Speichern'}</Button></div>
  </form></Modal>;
}

function Payments({ entry, onClose }) {
  const { act, busy, error } = useManagement();
  const [amount, setAmount] = useState(round(grossAmount(entry) - (entry.payments || []).reduce((sum, payment) => sum + Number(payment.amount), 0)));
  const [date, setDate] = useState(today());
  return <Modal title={`Zahlungen · ${entry.title}`} onClose={onClose}><form className="space-y-4" onSubmit={async event => { event.preventDefault(); if (await act('post', `/transactions/${entry.id}/payments`, { amount, date })) onClose(); }}>
    <Notice>Gesamtbetrag {money(grossAmount(entry))}. Bankzahlungen zu dieser Rechnung hier zuordnen, damit Ertrag oder Kosten nur einmal erfasst werden.</Notice>
    <Table headers={['Datum', 'Zahlung', 'Aktion']}>{(entry.payments || []).map(payment => <tr key={payment.id}><td>{dateLabel(payment.date)}</td><td>{money(payment.amount)}</td><td><ConfirmButton disabled={busy} message="Diese Zahlung entfernen? Liquidität und offener Betrag werden neu berechnet." onConfirm={async () => { const ok = await act('delete', `/payments/${payment.id}`); if (ok) onClose(); return ok; }}/></td></tr>)}</Table>
    <div className="grid gap-4 sm:grid-cols-2"><Input label="Zahlbetrag (€)" type="number" min="0.01" required value={amount} onChange={event => setAmount(event.target.value)}/><Input label="Zahlungsdatum" type="date" required value={date} onChange={event => setDate(event.target.value)}/></div>
    {error && <Notice warning>{error}</Notice>}
    <div className="flex justify-end gap-3"><Button secondary onClick={onClose}>Schließen</Button><Button type="submit" disabled={busy || Number(amount) <= 0}>Zahlung erfassen</Button></div>
  </form></Modal>;
}

export function DocumentInbox({ compact = false }) {
  const { references, state, refresh, busy } = useManagement();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const linked = new Map(state.transactions.filter(entry => entry.fileId).map(entry => [entry.fileId, entry.id]));
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
  return <Card title="Belegeingang" description="Beleg hochladen und mit einem Geschäftsvorfall verknüpfen. Beträge, Leistungsdatum und Zuordnung werden ausdrücklich erfasst." actions={<label className={`cursor-pointer rounded-lg border border-gray-600 px-4 py-2.5 text-sm ${uploading || busy ? 'pointer-events-none opacity-50' : 'hover:bg-gray-700'}`}>{uploading ? 'Lädt hoch …' : 'Beleg hochladen'}<input aria-label="Beleg hochladen" type="file" className="sr-only" accept="application/pdf,image/jpeg" disabled={busy || uploading} onChange={upload}/></label>}>
    {error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}
    {!files.length ? <Empty>Noch keine Betriebsbelege vorhanden. PDF oder JPG hochladen.</Empty> : <Table headers={['Beleg', 'Zuordnung', 'Aktion']}>{files.slice(0, compact ? 5 : undefined).map(file => <tr key={file.id}><td><button className="text-blue-300 hover:underline" onClick={() => download(file)}>{file.fileName}</button></td><td className={linked.has(file.id) ? 'text-emerald-300' : 'text-amber-300'}>{linked.has(file.id) ? 'Verknüpft' : 'Zuordnung offen'}</td><td><div className="flex flex-wrap items-center gap-3"><Link className="text-blue-300" to={linked.has(file.id) ? `/Management/Transactions?item=${linked.get(file.id)}` : `/Management/Transactions?file=${file.id}`}>{linked.has(file.id) ? 'Geschäftsvorfall öffnen' : 'Geschäftsvorfall erfassen'}</Link><ConfirmButton disabled={busy || uploading} message="Belegdatei entfernen? Verknüpfte Geschäftsvorfälle und Zahlungen bleiben erhalten." onConfirm={() => remove(file)}/></div></td></tr>)}</Table>}
  </Card>;
}

export function ManagementDocuments() {
  return <div className="space-y-5"><header><h1 className="text-2xl font-bold">Dokumente</h1><p className="mt-2 text-sm text-gray-400">Betriebsbelege sammeln und mit der laufenden Betriebskalkulation verbinden.</p></header><DocumentInbox/><Link className="inline-block text-sm text-blue-300" to="/Management/Transactions">Zu Geschäftsvorfällen und Zahlungen →</Link></div>;
}

export default function ManagementTransactions() {
  const { state, calculation, basis, busy, act, references } = useManagement();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState(params.get('filter') || 'all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);
  const fileId = params.get('file');
  const selected = params.get('item');
  const editEntry = editing || (selected && state.transactions.find(entry => entry.id === selected));
  const close = () => { setEditing(null); setPaying(null); setParams({}); };
  const openIds = new Set(calculation.openItems.map(entry => entry.id));
  const entries = state.transactions.filter(entry => entry.basis === basis && day(entry.date) >= calculation.range.start && day(entry.date) <= calculation.range.end || filter === 'open' && openIds.has(entry.id)).filter(entry => {
    if (filter === 'open' && !openIds.has(entry.id)) return false;
    if (filter === 'unassigned' && !(entry.kind === 'expense' && (!entry.costTypeId || !entry.centerId))) return false;
    if (['income', 'expense'].includes(filter) && entry.kind !== filter) return false;
    return `${entry.title} ${entry.counterparty || ''}`.toLocaleLowerCase('de').includes(search.toLocaleLowerCase('de'));
  });
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Belege & Geschäftsvorfälle</h1><p className="mt-2 text-sm text-gray-400">Einnahmen, Ausgaben und Zahlungen erfassen. Jede Ausgabe kann einer Kostenart, Kostenstelle und einem Projekt zugeordnet werden.</p></div><Button disabled={busy} onClick={() => setEditing({ new: true })}>+ Geschäftsvorfall</Button></header>
    <Card><div className="flex flex-wrap gap-3"><select aria-label="Geschäftsvorfälle filtern" className={`${inputClass} sm:w-auto`} value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Alle Geschäftsvorfälle</option><option value="income">Einnahmen</option><option value="expense">Ausgaben</option><option value="open">Offene Posten (Ist, alle Jahre)</option><option value="unassigned">Zuordnung prüfen</option></select><input aria-label="Geschäftsvorfälle suchen" placeholder="Bezeichnung oder Geschäftspartner suchen …" className={`${inputClass} sm:max-w-md`} value={search} onChange={event => setSearch(event.target.value)}/></div></Card>
    <Card title={`${entries.length} Geschäftsvorfälle`}>
      {!entries.length ? <Empty>Keine Einträge für diese Auswahl. Einen Geschäftsvorfall anlegen oder den Filter ändern.</Empty> : <Table headers={['Datum / Bezeichnung', 'Art', 'Netto / Brutto', 'Zuordnung', 'Zahlungsstand', 'Aktionen']}>{entries.map(entry => {
        const paid = round(entry.payments.filter(payment => day(payment.date) <= calculation.cutoff).reduce((sum, payment) => sum + Number(payment.amount), 0));
        const project = references.projects.find(item => item.id === entry.projectId);
        return <tr key={entry.id}><td><p>{dateLabel(entry.date)}</p><p className="mt-1 font-medium">{entry.title}</p><p className="text-xs text-gray-400">{entry.counterparty}</p>{project && <Link className="text-xs text-blue-300" to={`/Projects/${project.id}`}>{project.title}</Link>}</td><td className="text-gray-400">{kinds[entry.kind]}</td><td className="whitespace-nowrap"><p>{money(entry.amount)}</p><p className="text-xs text-gray-400">{money(grossAmount(entry))} brutto</p></td><td><p>{state.config.costTypes.find(type => type.id === entry.costTypeId)?.name || (entry.kind === 'expense' ? 'Kostenart fehlt' : '–')}</p><p className="text-xs text-gray-400">{state.config.costCenters.find(center => center.id === entry.centerId)?.name || (entry.kind === 'expense' ? 'Verteilungsschlüssel / offen' : '')}</p>{entry.fileId && <span className="text-xs text-emerald-300">Beleg verknüpft</span>}</td><td className="whitespace-nowrap"><p>{entry.source === 'imputed' ? 'Kalkulatorischer Wert' : entry.basis === 'plan' ? 'Planwert' : money(grossAmount(entry) - paid) + ' offen'}</p>{entry.dueDate && <p className="text-xs text-gray-400">Fällig {dateLabel(entry.dueDate)}</p>}</td><td><div className="flex flex-wrap gap-2">{entry.source !== 'loan' ? <><Button secondary disabled={busy} onClick={() => { setParams({}); setEditing(entry); }}>Bearbeiten</Button>{entry.basis === 'actual' && entry.source !== 'imputed' && <Button secondary disabled={busy} onClick={() => setPaying(entry)}>Zahlungen</Button>}<ConfirmButton disabled={busy} message="Diesen Geschäftsvorfall einschließlich seiner Zahlungen entfernen?" onConfirm={() => act('delete', `/transactions/${entry.id}?version=${entry.version}`)}/></> : <Link className="text-blue-300" to="/Management/Assets">Darlehen öffnen</Link>}</div></td></tr>;
      })}</Table>}
    </Card>
    <DocumentInbox compact/>
    {(editEntry || fileId) && <TransactionForm key={editEntry?.id || fileId || 'new'} entry={editEntry?.new ? null : editEntry || null} fileId={fileId} onClose={close}/>}
    {paying && <Payments entry={paying} onClose={close}/>}
  </div>;
}
