import { useState } from 'react';
import { useManagement } from './managementContext.js';
import { day, round, today } from '../../../../shared/management.mjs';
import { Button, Card, ConfirmButton, Empty, Input, Modal, Notice, Select, Table } from './managementUi.jsx';
import { dateLabel, decimal, money } from './managementFormat.js';

function AssetForm({ entry, onClose }) {
  const { state, busy, act, error } = useManagement();
  const [form, setForm] = useState(entry ? { ...entry, acquiredAt: day(entry.acquiredAt) } : { name: '', acquiredAt: today(), purchaseCost: '', residualValue: 0, usefulLifeYears: 5, centerId: '', note: '' });
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));
  return <Modal title={entry ? 'Anlagegut bearbeiten' : 'Anlagegut erfassen'} onClose={onClose}><form className="space-y-4" onSubmit={async event => { event.preventDefault(); if (await act(entry ? 'put' : 'post', `/assets${entry ? `/${entry.id}` : ''}`, form)) onClose(); }}>
    <div className="grid gap-4 sm:grid-cols-2"><Input label="Anlagegut" required value={form.name} onChange={event => set('name', event.target.value)}/><Input label="Anschaffungsdatum" type="date" required value={form.acquiredAt} onChange={event => set('acquiredAt', event.target.value)}/><Input label="Anschaffungskosten (€ netto)" type="number" min="0.01" required value={form.purchaseCost} onChange={event => set('purchaseCost', event.target.value)}/><Input label="Restwert (€)" type="number" min="0" required value={form.residualValue} onChange={event => set('residualValue', event.target.value)}/><Input label="Interne Nutzungsdauer (Jahre)" type="number" min="0.01" max="100" required value={form.usefulLifeYears} onChange={event => set('usefulLifeYears', event.target.value)}/><Select label="Kostenstelle" value={form.centerId || ''} onChange={event => set('centerId', event.target.value)}><option value="">Über Schlüssel Abschreibungen</option>{state.config.costCenters.map(center => <option key={center.id} value={center.id}>{center.name}</option>)}</Select></div>
    <Notice>Lineare interne Abschreibung ab dem Anschaffungsmonat, begrenzt auf den Restwert. Der Kauf wird separat als neutraler Geldabgang mit Zahlung erfasst. Den Kaufpreis nicht zusätzlich als laufende Ausgabe erfassen.</Notice>
    {error && <Notice warning>{error}</Notice>}
    <div className="flex justify-end gap-3"><Button secondary onClick={onClose}>Abbrechen</Button><Button type="submit" disabled={busy}>Speichern</Button></div>
  </form></Modal>;
}
function LoanForm({ entry, onClose }) {
  const { busy, act, error } = useManagement();
  const [form, setForm] = useState(entry ? { ...entry, startDate: day(entry.startDate) } : { name: '', startDate: today(), principal: '', interestRate: 0, note: '' });
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));
  return <Modal title={entry ? 'Darlehen bearbeiten' : 'Darlehen erfassen'} onClose={onClose}><form className="space-y-4" onSubmit={async event => { event.preventDefault(); if (await act(entry ? 'put' : 'post', `/loans${entry ? `/${entry.id}` : ''}`, form)) onClose(); }}>
    <div className="grid gap-4 sm:grid-cols-2"><Input label="Darlehen / Kreditgeber" required value={form.name} onChange={event => set('name', event.target.value)}/><Input label="Auszahlungsdatum" type="date" required disabled={Boolean(entry)} value={form.startDate} onChange={event => set('startDate', event.target.value)}/><Input label="Ursprünglicher Darlehensbetrag (€)" type="number" min="0.01" required disabled={Boolean(entry)} value={form.principal} onChange={event => set('principal', event.target.value)}/><Input label="Zinssatz (% / Jahr, Information)" type="number" min="0" max="100" required value={form.interestRate} onChange={event => set('interestRate', event.target.value)}/></div>
    <Notice>Die Auszahlung wird automatisch als neutraler Geldzugang erfasst. Tilgungen erfassen wir am Darlehen. Zinsen als eigene Ausgabe mit der Kostenart Finanzierungskosten erfassen. Bei Altdarlehen den ursprünglichen Betrag und bereits geleistete Tilgungen mit ihren historischen Daten eintragen.</Notice>
    {error && <Notice warning>{error}</Notice>}
    <div className="flex justify-end gap-3"><Button secondary onClick={onClose}>Abbrechen</Button><Button type="submit" disabled={busy}>Speichern</Button></div>
  </form></Modal>;
}
function RepaymentForm({ loan, onClose }) {
  const { busy, act, error } = useManagement();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  return <Modal title={`Tilgungen · ${loan.name}`} onClose={onClose}><form className="space-y-4" onSubmit={async event => { event.preventDefault(); if (await act('post', `/loans/${loan.id}/repayments`, { amount, date })) onClose(); }}>
    <Table headers={['Datum', 'Tilgung', 'Aktion']}>{loan.repayments.map(payment => <tr key={payment.id}><td>{dateLabel(payment.date)}</td><td>{money(payment.amount)}</td><td><ConfirmButton disabled={busy} message="Tilgung und zugehörigen Geldabgang entfernen?" onConfirm={async () => { const ok = await act('delete', `/repayments/${payment.id}`); if (ok) onClose(); return ok; }}/></td></tr>)}</Table>
    <div className="grid gap-4 sm:grid-cols-2"><Input label="Tilgungsbetrag ohne Zinsen (€)" type="number" min="0.01" required value={amount} onChange={event => setAmount(event.target.value)}/><Input label="Zahlungsdatum" type="date" required value={date} onChange={event => setDate(event.target.value)}/></div><Notice>Diese Zahlung verringert Restschuld und Liquidität. Sie ist kein Kostenaufwand.</Notice>
    {error && <Notice warning>{error}</Notice>}
    <div className="flex justify-end gap-3"><Button secondary onClick={onClose}>Schließen</Button><Button type="submit" disabled={busy}>Tilgung erfassen</Button></div>
  </form></Modal>;
}

export default function ManagementAssets() {
  const { state, calculation, act, busy } = useManagement();
  const [asset, setAsset] = useState(null);
  const [loan, setLoan] = useState(null);
  const [repaying, setRepaying] = useState(null);
  return <div className="space-y-5">
    <header><h1 className="text-2xl font-bold">Vermögen & Finanzierung</h1><p className="mt-2 text-sm text-gray-400">Anlagegüter, interne Abschreibungen und Darlehen. Bestände zum {dateLabel(calculation.cutoff)}.</p></header>
    <div className="grid gap-4 sm:grid-cols-3">{[['Anlagevermögen', calculation.balance.fixedAssets], ['Abschreibungen im Geschäftsjahr', calculation.depreciation], ['Darlehensrestschuld', calculation.loanBalance]].map(([label, value]) => <Card key={label}><p className="text-sm text-gray-400">{label}</p><p className="mt-2 text-2xl font-semibold">{money(value)}</p></Card>)}</div>
    <Card title="Anlagegüter" description="Abschreibungen fließen automatisch in Kostenarten, BAB und Stundensätze ein." actions={<Button disabled={busy} onClick={() => setAsset({ new: true })}>+ Anlagegut</Button>}>
      {!state.assets.length ? <Empty>Noch keine Anlagegüter. Maschinen, Fahrzeuge und Einrichtung hier erfassen.</Empty> : <Table headers={['Anlagegut', 'Anschaffung', 'Nutzungsdauer', 'Restwert / Buchwert', 'Jahresabschreibung', 'Aktionen']}>{calculation.assets.map(item => <tr key={item.id}><td>{item.name}<p className="text-xs text-gray-400">{state.config.costCenters.find(center => center.id === item.centerId)?.name || 'Verteilung nach Schlüssel'}</p></td><td>{dateLabel(item.acquiredAt)}<p className="text-xs text-gray-400">{money(item.purchaseCost)}</p></td><td>{decimal(item.usefulLifeYears)} Jahre</td><td>{money(item.residualValue)} / {money(item.bookValue)}</td><td>{money(item.depreciation)}</td><td><div className="flex gap-2"><Button secondary disabled={busy} onClick={() => setAsset(item)}>Bearbeiten</Button><ConfirmButton disabled={busy} message="Anlagegut und seine kalkulatorischen Abschreibungen entfernen? Separat erfasste Zahlungen bleiben bestehen." onConfirm={() => act('delete', `/assets/${item.id}`)}/></div></td></tr>)}</Table>}
    </Card>
    <Card title="Darlehen" description="Auszahlung und Tilgung verändern Bestände und Liquidität. Finanzierungskosten werden als eigene Ausgabe erfasst." actions={<Button disabled={busy} onClick={() => setLoan({ new: true })}>+ Darlehen</Button>}>
      {!state.loans.length ? <Empty>Noch keine Darlehen erfasst.</Empty> : <Table headers={['Darlehen', 'Auszahlung', 'Zinssatz', 'Restschuld zum Stichtag', 'Aktionen']}>{state.loans.map(item => <tr key={item.id}><td>{item.name}</td><td>{dateLabel(item.startDate)}<p className="text-xs text-gray-400">{money(item.principal)}</p></td><td>{decimal(item.interestRate)} %</td><td>{day(item.startDate) > calculation.cutoff ? 'Noch nicht ausgezahlt' : money(round(Number(item.principal) - item.repayments.filter(payment => day(payment.date) <= calculation.cutoff).reduce((sum, payment) => sum + Number(payment.amount), 0)))}</td><td><div className="flex flex-wrap gap-2"><Button secondary disabled={busy} onClick={() => setRepaying(item)}>Tilgungen</Button><Button secondary disabled={busy} onClick={() => setLoan(item)}>Bearbeiten</Button><ConfirmButton disabled={busy} message="Darlehen einschließlich Auszahlung, Tilgungen und zugehörigen Geldbewegungen entfernen?" onConfirm={() => act('delete', `/loans/${item.id}`)}/></div></td></tr>)}</Table>}
    </Card>
    {asset && <AssetForm entry={asset.new ? null : asset} onClose={() => setAsset(null)}/>}
    {loan && <LoanForm entry={loan.new ? null : loan} onClose={() => setLoan(null)}/>}
    {repaying && <RepaymentForm loan={repaying} onClose={() => setRepaying(null)}/>}
  </div>;
}
