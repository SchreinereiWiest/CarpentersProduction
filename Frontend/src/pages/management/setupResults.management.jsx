import { useState } from 'react';
import { useNavigate } from 'react-router';
import { setupChecks } from '../../../../shared/managementSetup.mjs';
import { round } from '../../../../shared/management.mjs';
import { createUuid } from './managementUuid.js';
import { exportBab } from './managementExport.js';
import { Button, Card, Empty, Input, Notice, Select, Table } from './managementUi.jsx';
import { dateLabel, decimal, money } from './managementFormat.js';

export function SetupMachines({ config, change, calculation, activities }) {
  return <>
    <Notice>Abschreibung, Wartung und Zinsansatz werden aus Schritt 02 übernommen. Die weiteren Maschinenkosten ergänzen den BAB genau einmal. Die Laufzeit kann manuell angegeben oder aus den zugeordneten Tätigkeitsberichten abgeleitet werden. Personalstunden sind nur dann Maschinenlaufzeit, wenn die Tätigkeit tatsächlich den Maschinenbetrieb erfasst.</Notice>
    {!calculation.machines.length && <Card title="Maschinenkosten"><Empty>In Schritt 02 eine Standardmaschine oder CNC erfassen.</Empty></Card>}
    {calculation.machines.map(machine => {
      const update = (key, value) => change(c => { c.setup.assets.find(item => item.id === machine.id)[key] = value; });
      return <Card key={machine.id} title={machine.name || 'Neue Maschine'} description={machine.category === 'cnc' ? 'CNC-Bearbeitungszentrum' : 'Standardmaschine'}>
        <div className="grid gap-4 md:grid-cols-3">
          <Input label={`${machine.name} · Strom und Betriebsmittel (€ / Jahr)`} type="number" min="0" value={machine.energy} onChange={e => update('energy', Number(e.target.value))}/>
          <Input label={`${machine.name} · zugeordnete Raumkosten (€ / Jahr)`} type="number" min="0" value={machine.space} onChange={e => update('space', Number(e.target.value))}/>
          <Input label={`${machine.name} · sonstige Maschinenkosten (€ / Jahr)`} type="number" min="0" value={machine.operating} onChange={e => update('operating', Number(e.target.value))}/>
          <Input label={`${machine.name} · kalkulatorischer Zinssatz (%)`} type="number" min="0" disabled={config.setup.interestMode !== 'imputed'} value={machine.interestRate} onChange={e => update('interestRate', Number(e.target.value))}/>
          <Input label={`${machine.name} · kalkulatorische Zinsen manuell (€ / Jahr)`} type="number" min="0" disabled={config.setup.interestMode !== 'imputed'} hint="Leer: aus gebundenem Kapital und Zinssatz berechnen." value={machine.interestAmount ?? ''} onChange={e => update('interestAmount', e.target.value === '' ? null : Number(e.target.value))}/>
          <Input label={`${machine.name} · verrechenbare Laufzeit (h / Jahr)`} type="number" min="0" hint="0: aus Tätigkeitsstunden bzw. dem zugeordneten Betriebsbereich ableiten." value={config.setup.assets.find(item => item.id === machine.id).hours} onChange={e => update('hours', Number(e.target.value))}/>
          <Select label={`${machine.name} · Maschinenkostenstelle`} value={machine.centerId || ''} onChange={e => update('centerId', e.target.value || null)}><option value="">Kosten über Schlüssel verteilen</option>{config.costCenters.map(center => <option key={center.id} value={center.id}>{center.name}</option>)}</Select>
        </div>
        <div className="my-4"><p className="mb-2 text-sm text-gray-400">Tätigkeiten zur Ableitung der Laufzeit:</p><div className="flex flex-wrap gap-4">{activities.map(activity => <label key={activity.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={machine.activityIds.includes(activity.id)} onChange={e => update('activityIds', e.target.checked ? [...machine.activityIds, activity.id] : machine.activityIds.filter(id => id !== activity.id))}/>{activity.label}</label>)}</div></div>
        <Table headers={['Kostenbestandteil', 'Pro Jahr']}>
          {Object.entries({ Abschreibung: machine.costs.depreciation, Zinsansatz: machine.costs.interest, 'Wartung / Reparatur': machine.costs.maintenance, 'Strom / Betriebsmittel': machine.costs.energy, Raumkosten: machine.costs.space, 'Sonstige Maschinenkosten': machine.costs.operating }).map(([name, value]) => <tr key={name}><td>{name}</td><td>{money(value)}</td></tr>)}
          <tr className="font-semibold"><td>Jährliche Maschinenkosten</td><td>{money(machine.total)}</td></tr>
          <tr><td>Verrechenbare Laufzeit</td><td>{decimal(machine.hours)} h</td></tr>
          <tr className="font-semibold text-blue-300"><td>Reiner Maschinenstundensatz</td><td>{machine.rate === null ? 'Laufzeit fehlt' : `${money(machine.rate)} / h`}</td></tr>
        </Table>
        <p className="mt-3 text-xs text-gray-400">Dieser reine Maschinensatz ist bereits Bestandteil der zugeordneten Kostenstelle. In der Vollkostenkalkulation darf er nicht nochmals zusätzlich zum vollen Stellenstundensatz angesetzt werden.</p>
      </Card>;
    })}
  </>;
}
export function BabTable({ calculation, config }) {
  return <Table headers={['Kostenart', 'Gesamt', ...config.costCenters.map(center => center.name), 'Nicht verteilt']}>
    {calculation.rows.filter(row => row.total > 0).map(row => <tr key={row.id}><td>{row.name}</td><td>{money(row.total)}</td>{config.costCenters.map(center => <td key={center.id}>{money(row.values[center.id])}</td>)}<td className={row.unallocated ? 'text-amber-300' : ''}>{money(row.unallocated)}</td></tr>)}
    <tr className="font-semibold"><td>Stellenkosten nach Umlage</td><td>{money(calculation.totalCosts)}</td>{calculation.rates.map(rate => <td key={rate.id}>{money(rate.total)}</td>)}<td>{money(calculation.unallocated)}</td></tr>
    <tr><td>Produktive Stunden</td><td></td>{calculation.rates.map(rate => <td key={rate.id}>{decimal(rate.hours)} h</td>)}<td></td></tr>
    <tr className="font-semibold text-blue-300"><td>Vollstundensatz</td><td></td>{calculation.rates.map(rate => <td key={rate.id}>{rate.kind === 'support' ? 'Umgelegt' : rate.fullRate === null ? 'Stunden fehlen' : `${money(rate.fullRate)} / h`}</td>)}<td></td></tr>
  </Table>;
}
export function SetupBab({ config, change, calculation, year, dirty }) {
  return <>
    {config.mode === 'easy' ? <Card title="Easy-Stundensätze" description="Direkt vorgegebene Selbstkosten je Stunde; ein BAB ist im Easy-Modus optional." actions={<Button secondary onClick={() => change(c => { c.easyRates.push({ id: createUuid(), name: 'Werkstatt', rate: 0 }); })}>+ Stundensatz</Button>}>
      {config.easyRates.map(rate => <div key={rate.id} className="mb-4 grid gap-3 md:grid-cols-[2fr_1fr_auto]"><Input label="Leistungsbereich" value={rate.name} onChange={e => change(c => { c.easyRates.find(item => item.id === rate.id).name = e.target.value; })}/><Input label="Selbstkosten (€ / h)" type="number" min="0" value={rate.rate} onChange={e => change(c => { c.easyRates.find(item => item.id === rate.id).rate = Number(e.target.value); })}/><Button danger className="self-end" onClick={() => change(c => { c.easyRates = c.easyRates.filter(item => item.id !== rate.id); })}>Entfernen</Button></div>)}
    </Card> : <>
      <Card title="Automatisch erzeugter Betriebsabrechnungsbogen" description="Alle Jahreskosten werden mit den erfassten Zuordnungen verteilt. Hilfskostenstellen werden anschließend auf die Hauptkostenstellen umgelegt." actions={<Button secondary onClick={() => exportBab(calculation, config, year, 'plan', dirty)}>BAB als CSV exportieren</Button>}><BabTable calculation={calculation} config={config}/></Card>
      <Card title="Umlagen nachvollziehen"><Table headers={['Kostenstelle', 'Vor Umlage', 'Umlage', 'Nach Umlage']}>{calculation.rates.map(center => <tr key={center.id}><td>{center.name}</td><td>{money(calculation.beforeTransfers[center.id])}</td><td>{money(calculation.transfers[center.id])}</td><td>{money(center.total)}</td></tr>)}</Table></Card>
      {calculation.warnings.length > 0 && <Notice warning><ul className="list-inside list-disc">{calculation.warnings.map(item => <li key={item}>{item}</li>)}</ul></Notice>}
    </>}
    <Card title="Preisgrundlage"><Input label="Gewinnaufschlag auf Selbstkosten (%)" type="number" min="0" value={config.profitPercent} onChange={e => change(c => { c.profitPercent = Number(e.target.value); })}/><p className="mt-3 text-sm text-gray-400">Materialeinzelkosten werden zusätzlich zum Stundensatz kalkuliert, sofern die Kostenart nicht in den Stundensatz einbezogen wird.</p></Card>
  </>;
}
export function SetupReview({ config, calculation, dirty, busy, act, revision }) {
  const [note, setNote] = useState(''); const [quantities, setQuantities] = useState({}); const [material, setMaterial] = useState(0);
  const [historicalVersion, setHistoricalVersion] = useState('');
  const historical = config.setup.approvals.find(item => String(item.version) === historicalVersion);
  const navigate = useNavigate();
  const errors = setupChecks(config, calculation);
  const rates = config.mode === 'easy' ? config.easyRates.map(rate => ({ ...rate, fullRate: Number(rate.rate), sellingRate: round(Number(rate.rate) * (1 + Number(config.profitPercent) / 100)) })) : calculation.rates.filter(rate => rate.kind !== 'support');
  const simulatedCost = round(rates.reduce((sum, rate) => sum + Number(quantities[rate.id] || 0) * Number(rate.fullRate || 0), 0) + material);
  return <>
    <Card title="Einrichtung prüfen" description="Eine Freigabe speichert die Eingaben und die berechneten Sätze als neue Version. Änderungen im Entwurf wirken erst nach erneuter Freigabe auf die veröffentlichte Planbasis.">
      {errors.length ? <Notice warning><ul className="list-inside list-disc">{errors.map(item => <li key={item}>{item}</li>)}</ul></Notice> : <Notice>Die benötigten Angaben sind vollständig. Das Betriebsmodell kann freigegeben werden.</Notice>}
      {dirty && <p className="mt-4 text-sm text-amber-300">Den Entwurf vor der Freigabe unten speichern.</p>}
      <Table headers={['Bereich', 'Selbstkosten / h', 'Mit Gewinnaufschlag / h']}>{rates.map(rate => <tr key={rate.id}><td>{rate.name}</td><td>{rate.fullRate === null ? 'Fehlt' : money(rate.fullRate)}</td><td>{rate.sellingRate === null ? 'Fehlt' : money(rate.sellingRate)}</td></tr>)}</Table>
    </Card>
    <Card title="Kalkulation simulieren" description="Stellenstunden und Material ergeben eine nachvollziehbare Preisvorschau ohne doppelte Maschinenkosten.">
      <div className="grid gap-3 md:grid-cols-3">{rates.map(rate => <Input label={`${rate.name} · Simulationsstunden`} type="number" min="0" value={quantities[rate.id] || 0} key={rate.id} onChange={e => setQuantities(values => ({ ...values, [rate.id]: Number(e.target.value) }))}/>)}<Input label="Materialeinzelkosten (€)" type="number" min="0" value={material} onChange={e => setMaterial(Number(e.target.value))}/></div>
      <p className="mt-5 text-sm">Selbstkosten: <strong>{money(simulatedCost)}</strong> · Preis mit {decimal(config.profitPercent)} % Aufschlag: <strong className="text-blue-300">{money(simulatedCost * (1 + Number(config.profitPercent) / 100))}</strong></p>
    </Card>
    <Card title="Freigabe und Versionierung"><Input label="Versionsnotiz" placeholder="Zum Beispiel: Erstkalkulation oder neue CNC" value={note} onChange={e => setNote(e.target.value)}/><Button className="mt-4" disabled={busy || dirty || errors.length > 0} onClick={async () => { if (await act('post', '/setup/approve', { revision, note }, 'Kalkulation freigegeben.')) navigate('/Management'); }}>Freigeben & Jahresansicht öffnen</Button>
      <div className="mt-5"><Table headers={['Version', 'Freigabe', 'Notiz', 'Jährliche Plankosten']}>{[...config.setup.approvals].reverse().map(approval => <tr key={approval.version}><td>Version {approval.version}</td><td>{dateLabel(approval.approvedAt)}</td><td>{approval.note || '—'}</td><td>{money(approval.totalCosts)}</td></tr>)}</Table>{!config.setup.approvals.length && <Empty>Noch keine freigegebene Version.</Empty>}</div>
      {config.setup.approvals.length > 0 && <div className="mt-5"><Select label="Freigegebene Version ansehen" value={historicalVersion} onChange={e => setHistoricalVersion(e.target.value)}><option value="">Version auswählen</option>{config.setup.approvals.map(item => <option key={item.version} value={item.version}>Version {item.version} · {dateLabel(item.approvedAt)}</option>)}</Select>{historical && <div className="mt-3"><p className="mb-3 text-sm text-gray-400">Gespeicherte Jahresbasis: {money(historical.totalCosts)}</p><Table headers={['Bereich', 'Gespeicherter Selbstkostensatz']}>{(historical.config.mode === 'easy' ? historical.config.easyRates.map(item => ({ ...item, fullRate: item.rate })) : historical.rates.filter(item => item.kind !== 'support')).map(item => <tr key={item.id}><td>{item.name}</td><td>{item.fullRate === null ? '—' : `${money(item.fullRate)} / h`}</td></tr>)}</Table></div>}</div>}
    </Card>
  </>;
}
