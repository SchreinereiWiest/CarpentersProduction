import { createUuid } from './managementUuid.js';
import { useState } from 'react';
import { Link } from 'react-router';
import { useManagement } from './managementContext.js';
import { calculateManagement, round } from '../../../../shared/management.mjs';
import { Button, Card, Empty, Input, Modal, Notice, Select, Table, inputClass } from './managementUi.jsx';
import { decimal, money } from './managementFormat.js';
import { exportBab } from './managementExport.js';

const suggestions = [
  ['Werkstatt', 'production'], ['Montage', 'production'], ['Maschinen / CNC', 'machine'], ['Verwaltung', 'support'],
];
const newCenter = (name = 'Neue Kostenstelle', kind = 'production') => ({ id: createUuid(), name, kind, hours: 0, area: 0, employees: 0, directBase: 0, redistributionKey: 'hours' });

function CapacityCalculator({ center, onApply, onClose }) {
  const machine = center.kind === 'machine';
  const [values, setValues] = useState({ count: machine ? 1 : center.employees || 1, days: 260, vacation: machine ? 0 : 30, holidays: 10, downtime: 10, dailyHours: 8, productivity: 70 });
  const fields = [['count', machine ? 'Maschinenanzahl' : 'Mitarbeitende (Vollzeitäquivalente)'], ['days', 'Mögliche Arbeitstage / Jahr'], ['vacation', machine ? 'Geplante Stillstandstage' : 'Urlaubstage'], ['holidays', 'Feiertage an Arbeitstagen'], ['downtime', machine ? 'Wartung / weitere Ausfalltage' : 'Krankheit / weitere Ausfalltage'], ['dailyHours', 'Stunden pro Tag'], ['productivity', 'Produktiv / verrechenbar (%)']];
  const hours = round(Number(values.count) * Math.max(0, Number(values.days) - Number(values.vacation) - Number(values.holidays) - Number(values.downtime)) * Number(values.dailyHours) * Number(values.productivity) / 100);
  return <Modal title={`Jahresstunden ermitteln · ${center.name}`} onClose={onClose}><form className="space-y-4" onSubmit={event => { event.preventDefault(); onApply(hours, machine ? center.employees : Number(values.count)); onClose(); }}><Notice>Diese Werte sind veränderbare Planannahmen. Nur produktive bzw. verrechenbare Stunden dienen als Basis für den Kostensatz.</Notice><div className="grid gap-3 sm:grid-cols-2">{fields.map(([id, label]) => <Input key={id} label={label} type="number" min="0" max={id === 'productivity' ? 100 : undefined} required value={values[id]} onChange={event => setValues(current => ({ ...current, [id]: Number(event.target.value) }))}/>)}</div><p className="text-xl font-semibold text-blue-300">{decimal(hours)} produktive Stunden / Jahr</p><div className="flex justify-end gap-3"><Button secondary onClick={onClose}>Abbrechen</Button><Button type="submit">In Vorschau übernehmen</Button></div></form></Modal>;
}

export default function ManagementCostAccounting() {
  const { state, year, basis, busy, saveConfig, error } = useManagement();
  const [config, setConfig] = useState(() => structuredClone(state.config));
  const [tab, setTab] = useState('bab');
  const [selected, setSelected] = useState(suggestions.map(([name]) => name));
  const [manual, setManual] = useState(false);
  const [capacityCenter, setCapacityCenter] = useState(null);
  const dirty = JSON.stringify(config) !== JSON.stringify(state.config);
  const calc = calculateManagement({ ...state, config }, { year, basis });
  const update = (list, id, field, value) => setConfig(current => ({ ...current, [list]: current[list].map(item => item.id === id ? { ...item, [field]: value } : item) }));
  const remove = (list, id) => setConfig(current => {
    const next = structuredClone(current);
    next[list] = next[list].filter(item => item.id !== id);
    next.rules = next.rules.map(rule => ({ ...rule, ...(list === 'costTypes' && rule.costTypeId === id ? { costTypeId: null } : {}), ...(list === 'costCenters' && rule.centerId === id ? { centerId: null } : {}) })).filter(rule => rule.costTypeId || rule.centerId);
    for (const basis of ['actual', 'plan']) {
      if (list === 'costTypes') delete next.babAdjustments[basis][id];
      else for (const values of Object.values(next.babAdjustments[basis])) delete values[id];
    }
    if (list === 'costCenters') for (const key of next.distributionKeys) delete key.weights[id];
    return next;
  });
  const setAdjustment = (typeId, centerId, value) => setConfig(current => ({ ...current, babAdjustments: { ...current.babAdjustments, [basis]: { ...current.babAdjustments[basis], [typeId]: { ...current.babAdjustments[basis][typeId], [centerId]: Number(value) || 0 } } } }));
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Kostenrechnung</h1><p className="mt-2 text-sm text-gray-400">Kostenarten definieren, betriebliche Bereiche erfassen und Gemeinkosten nachvollziehbar verteilen.</p></div><Button disabled={busy || !dirty} onClick={() => saveConfig(config)}>{busy ? 'Speichert …' : 'Modell speichern'}</Button></header>
    {state.config.mode === 'easy' && <Notice>Du verwendest den Easy-Modus. Kostenrechnung kann schrittweise vorbereitet werden. Die aktive Preisgrundlage wählst du unter <Link className="underline" to="/Management/Settings">Einstellungen</Link>.</Notice>}
    {dirty && <Notice>Ungespeicherte Vorschau: BAB und Sätze zeigen bereits deine Änderungen. Mit „Modell speichern“ werden sie für den Betrieb übernommen.</Notice>}
    <nav className="flex flex-wrap gap-2" aria-label="Ebenen der Kostenrechnung">{[['types', '1 · Kostenarten'], ['centers', '2 · Kostenstellen'], ['bab', '3 · Betriebsabrechnungsbogen']].map(([id, name]) => <Button key={id} secondary={tab !== id} onClick={() => setTab(id)} aria-pressed={tab === id}>{name}</Button>)}</nav>
    {tab === 'types' && <Card title="Kostenarten" description="Einzelkosten benötigen eine direkte Kostenstelle. Gemeinkosten werden direkt zugeordnet oder über einen Schlüssel verteilt. Die Stundenbasis legt fest, welche Kosten der Stundensatz bereits abdeckt." actions={<Button secondary onClick={() => setConfig(current => ({ ...current, costTypes: [...current.costTypes, { id: createUuid(), name: 'Neue Kostenart', treatment: 'overhead', hourly: true, key: 'hours' }] }))}>+ Kostenart</Button>}>
      <div className="space-y-4">{config.costTypes.map(type => <div key={type.id} className="grid items-end gap-3 rounded-lg bg-gray-900/60 p-4 md:grid-cols-4 xl:grid-cols-5">
        <Input label="Bezeichnung" value={type.name} onChange={event => update('costTypes', type.id, 'name', event.target.value)}/>
        <Select label="Kostencharakter" value={type.treatment} onChange={event => update('costTypes', type.id, 'treatment', event.target.value)}><option value="direct">Einzelkosten</option><option value="overhead">Gemeinkosten</option></Select>
        <Select label="Verteilungsschlüssel" value={type.key || ''} onChange={event => update('costTypes', type.id, 'key', event.target.value)}><option value="">Nur direkte Zuordnung</option>{config.distributionKeys.map(key => <option key={key.id} value={key.id}>{key.name}</option>)}</Select>
        <label className="flex min-h-11 items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={type.hourly} onChange={event => update('costTypes', type.id, 'hourly', event.target.checked)} className="size-4 accent-blue-500"/>Im Vollstundensatz enthalten</label>
        <Button danger disabled={type.id === 'depreciation'} onClick={() => remove('costTypes', type.id)}>Entfernen</Button>
      </div>)}</div>
    </Card>}
    {tab === 'centers' && <>
      <Card title="Kostenstellen gemeinsam ermitteln" description="Welche Bereiche erbringen Leistungen oder unterstützen die Arbeit? Wähle die passenden Bereiche. Danach werden produktive Jahresstunden, Fläche und Mitarbeitende eingetragen.">
        <div className="flex flex-wrap gap-4">{suggestions.map(([name]) => <label key={name} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-blue-500" checked={selected.includes(name)} onChange={event => setSelected(current => event.target.checked ? [...current, name] : current.filter(item => item !== name))}/>{name}</label>)}</div>
        <Button className="mt-4" disabled={!selected.length} onClick={() => setConfig(current => ({ ...current, costCenters: [...current.costCenters, ...suggestions.filter(([name]) => selected.includes(name) && !current.costCenters.some(center => center.name === name)).map(([name, kind]) => newCenter(name, kind))] }))}>Ausgewählte Bereiche ergänzen</Button>
      </Card>
      <Card title="Kostenstellen und Bezugsgrößen" description="Hauptkostenstellen kalkulieren Leistungen. Maschinen nutzen Maschinenstunden. Hilfskostenstellen wie Verwaltung werden auf die Hauptkostenstellen umgelegt." actions={<Button secondary onClick={() => setConfig(current => ({ ...current, costCenters: [...current.costCenters, newCenter()] }))}>+ Kostenstelle</Button>}>
        {!config.costCenters.length ? <Empty>Noch keine Kostenstellen. Oben passende Bereiche auswählen.</Empty> : <div className="space-y-4">{config.costCenters.map(center => <div key={center.id} className="rounded-lg border border-gray-700 bg-gray-900/60 p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Input label="Bezeichnung" value={center.name} onChange={event => update('costCenters', center.id, 'name', event.target.value)}/><Select label="Funktion" value={center.kind} onChange={event => update('costCenters', center.id, 'kind', event.target.value)}><option value="production">Hauptkostenstelle / Leistung</option><option value="machine">Maschinenkostenstelle</option><option value="support">Hilfskostenstelle</option></Select><Input label={center.kind === 'machine' ? 'Produktive Maschinenstunden / Jahr' : 'Produktive Stunden / Jahr'} type="number" min="0" value={center.hours} onChange={event => update('costCenters', center.id, 'hours', Number(event.target.value))}/><Input label="Fläche (m²)" type="number" min="0" value={center.area} onChange={event => update('costCenters', center.id, 'area', Number(event.target.value))}/><Input label="Mitarbeitende (Vollzeitäquivalente)" type="number" min="0" value={center.employees} onChange={event => update('costCenters', center.id, 'employees', Number(event.target.value))}/><Input label="Zuschlagsbasis (€ / Jahr)" hint="Zum Beispiel Materialeinsatz oder Fertigungslohn." type="number" min="0" value={center.directBase} onChange={event => update('costCenters', center.id, 'directBase', Number(event.target.value))}/>{center.kind === 'support' && <Select label="Umlage auf Hauptkostenstellen" value={center.redistributionKey || ''} onChange={event => update('costCenters', center.id, 'redistributionKey', event.target.value)}><option value="">Keine Umlage</option>{config.distributionKeys.map(key => <option key={key.id} value={key.id}>{key.name}</option>)}</Select>}</div><Button danger className="mt-3" onClick={() => remove('costCenters', center.id)}>Kostenstelle entfernen</Button>
          <div className="mt-3 flex flex-wrap gap-3">{center.kind !== 'support' && <Button secondary onClick={() => setCapacityCenter(center)}>Jahresstunden gemeinsam ermitteln</Button>}</div>
        </div>)}</div>}
      </Card>
    </>}
    {tab === 'bab' && <>
      <div className="grid gap-4 sm:grid-cols-3"><Card><p className="text-xs text-gray-400">Kosten gesamt</p><p className="mt-2 text-xl font-semibold">{money(calc.totalCosts)}</p></Card><Card><p className="text-xs text-gray-400">Noch nicht verteilt</p><p className="mt-2 text-xl font-semibold text-amber-300">{money(calc.unallocated)}</p></Card><Card><p className="text-xs text-gray-400">Kostenstellen</p><p className="mt-2 text-xl font-semibold">{config.costCenters.length}</p></Card></div>
      {calc.warnings.map(warning => <Notice key={warning} warning>{warning}</Notice>)}
      <Card title="Betriebsabrechnungsbogen" description={`${basis === 'plan' ? 'Plan' : 'Ist'}-Kosten nach Umlage der Hilfskostenstellen. Belegkosten und Abschreibungen fließen automatisch ein. Ergänzungen sind zusätzliche interne Kostenwerte, keine Zahlungen.`} actions={<div className="flex gap-2"><Button secondary onClick={() => setManual(value => !value)} aria-pressed={manual}>{manual ? 'Ergänzungen ausblenden' : 'BAB ergänzen'}</Button><Button secondary onClick={() => exportBab(calc, config, year, basis, dirty)}>CSV exportieren</Button></div>}>
        {!config.costCenters.length ? <Empty>Für einen BAB zuerst Kostenstellen anlegen und Bezugsgrößen eintragen.</Empty> : <Table headers={['Kostenart', 'Gesamt', 'Nicht verteilt', ...config.costCenters.map(center => center.name)]}>
          {calc.rows.map(row => <tr key={row.id}><td><p className="font-medium">{row.name}</p><p className="text-xs text-gray-400">{row.treatment === 'direct' ? 'Einzelkosten' : 'Gemeinkosten'}{row.hourly ? ' · Stundenbasis' : ''}</p></td><td className="whitespace-nowrap">{money(row.total)}</td><td className="whitespace-nowrap text-amber-300">{money(row.unallocated)}</td>{config.costCenters.map(center => <td key={center.id} className="min-w-36"><p className="whitespace-nowrap">{money(row.values[center.id])}</p>{manual && <label className="mt-2 block text-xs text-gray-400">Ergänzung (€)<input aria-label={`${row.name} · ${center.name} · Ergänzung`} className={`${inputClass} mt-1`} type="number" step="0.01" value={config.babAdjustments[basis]?.[row.id]?.[center.id] || 0} onChange={event => setAdjustment(row.id, center.id, event.target.value)}/></label>}</td>)}</tr>)}
          <tr className="font-semibold"><td>Stellenkosten nach Umlage</td><td>{money(calc.totalCosts)}</td><td>{money(calc.unallocated)}</td>{calc.rates.map(rate => <td key={rate.id} className="whitespace-nowrap">{money(rate.total)}</td>)}</tr>
          <tr className="text-gray-400"><td>Davon Umlage (+ / −)</td><td>{money(0)}</td><td>–</td>{config.costCenters.map(center => <td key={center.id}>{money(calc.transfers[center.id])}</td>)}</tr>
          <tr><td>Produktive Jahresstunden</td><td>–</td><td>–</td>{config.costCenters.map(center => <td key={center.id}>{decimal(center.hours)}</td>)}</tr>
          <tr className="text-blue-300"><td>Vollstundensatz</td><td>–</td><td>–</td>{calc.rates.map(rate => <td key={rate.id}>{rate.kind === 'support' || rate.fullRate === null ? '–' : `${money(rate.fullRate)} / h`}</td>)}</tr>
        </Table>}
      </Card>
      {manual && <Notice>Ergänzungen werden zur jeweiligen Zelle addiert. Negative Beträge korrigieren interne Kosten. Bei Hilfskostenstellen wird auch die Ergänzung umgelegt. Zahlungen und offene Posten ändern sich dadurch nicht.</Notice>}
      <Card title="Abstimmung der Kosten"><div className="flex flex-wrap gap-5 text-sm text-gray-300"><span>Geschäftsvorfälle: {money(calc.expense)}</span><span>Abschreibungen: {money(calc.depreciation)}</span><span>BAB-Ergänzungen: {money(calc.manualCosts)}</span><span>Summe: {money(round(calc.expense + calc.depreciation + calc.manualCosts))}</span></div><Link className="mt-4 inline-block text-sm text-blue-300" to="/Management/Calculation">Daraus Kalkulationssätze und Preise ermitteln →</Link></Card>
    </>}
    {error && <Notice warning>{error}</Notice>}
    {capacityCenter && <CapacityCalculator center={capacityCenter} onClose={() => setCapacityCenter(null)} onApply={(hours, employees) => { update('costCenters', capacityCenter.id, 'hours', hours); update('costCenters', capacityCenter.id, 'employees', employees); }}/>}
    <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-xl border border-gray-600 bg-gray-800 p-3 shadow-lg"><span className="text-sm text-gray-400">{dirty ? 'Vorschau · Änderungen noch nicht gespeichert' : 'Betriebsmodell gespeichert'}</span><Button disabled={busy || !dirty} onClick={() => saveConfig(config)}>Modell speichern</Button></div>
  </div>;
}
