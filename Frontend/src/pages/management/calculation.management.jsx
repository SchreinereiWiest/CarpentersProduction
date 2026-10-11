import { createUuid } from './managementUuid.js';
import { useState } from 'react';
import { Link } from 'react-router';
import { useManagement } from './managementContext.js';
import { round } from '../../../../shared/management.mjs';
import { Button, Card, Empty, Input, Notice, Select, Table } from './managementUi.jsx';
import { decimal, money } from './managementFormat.js';

export default function ManagementCalculation() {
  const { state, calculation, basis, busy, saveConfig, error } = useManagement();
  const [config, setConfig] = useState(() => structuredClone(state.config));
  const [quantities, setQuantities] = useState({});
  const [material, setMaterial] = useState(0);
  const [other, setOther] = useState(0);
  const [method, setMethod] = useState('hours');
  const [base, setBase] = useState(0);
  const [surchargeId, setSurchargeId] = useState('');
  const dirty = JSON.stringify(config) !== JSON.stringify(state.config);
  const full = config.mode === 'full';
  const rates = full ? calculation.rates.filter(rate => rate.kind !== 'support') : config.easyRates.map(rate => ({ ...rate, fullRate: Number(rate.rate), sellingRate: round(Number(rate.rate) * (1 + Number(config.profitPercent) / 100)), kind: 'production' }));
  const surcharge = calculation.rates.find(rate => rate.id === surchargeId)?.surcharge;
  const hoursTotal = round(rates.reduce((sum, rate) => sum + Number(quantities[rate.id] || 0) * Number(rate.fullRate || 0), 0));
  const surchargeCosts = round(Number(base) * Number(surcharge || 0) / 100);
  const selfCosts = round(Number(material) + Number(other) + (method === 'hours' ? hoursTotal : Number(base) + surchargeCosts));
  const profit = round(selfCosts * Number(config.profitPercent) / 100);
  const missingRates = rates.some(rate => Number(quantities[rate.id] || 0) > 0 && rate.fullRate === null);
  return <div className="space-y-5">
    <header><h1 className="text-2xl font-bold">Kalkulationsgrundlagen</h1><p className="mt-2 text-sm text-gray-400">Stundensätze, Maschinenkosten und Zuschlagssätze für nachvollziehbare Angebotspreise.</p></header>
    {!full ? <Card title="Einfache Stundensätze" description="Netto-Stundensatz einschließlich der darin abgedeckten Lohn- und Gemeinkosten, vor Gewinnaufschlag. Du entscheidest selbst, wie viele Leistungsbereiche du benötigst." actions={<Button secondary onClick={() => setConfig(current => ({ ...current, easyRates: [...current.easyRates, { id: createUuid(), name: 'Neuer Leistungsbereich', rate: 0 }] }))}>+ Stundensatz</Button>}>
      {!config.easyRates.length ? <Empty>Ersten Stundensatz für Werkstatt, Montage oder eine andere Leistung anlegen.</Empty> : <div className="space-y-3">{config.easyRates.map(rate => <div key={rate.id} className="grid items-end gap-3 rounded-lg bg-gray-900/50 p-4 sm:grid-cols-3"><Input label="Leistungsbereich" value={rate.name} onChange={event => setConfig(current => ({ ...current, easyRates: current.easyRates.map(item => item.id === rate.id ? { ...item, name: event.target.value } : item) }))}/><Input label="Stundensatz ohne Gewinn (€ netto / h)" type="number" min="0" value={rate.rate} onChange={event => setConfig(current => ({ ...current, easyRates: current.easyRates.map(item => item.id === rate.id ? { ...item, rate: Number(event.target.value) } : item) }))}/><Button danger onClick={() => setConfig(current => ({ ...current, easyRates: current.easyRates.filter(item => item.id !== rate.id) }))}>Entfernen</Button></div>)}</div>}
      <Button className="mt-4" disabled={!dirty || busy} onClick={() => saveConfig(config)}>Stundensätze speichern</Button>
      {dirty && <p className="mt-3 text-sm text-amber-200">Die Preiskalkulation zeigt deine noch ungespeicherten Stundensätze.</p>}
    </Card> : <>
      <Notice>Vollstundensatz = enthaltene Stellenkosten ÷ produktive Jahresstunden. Material und andere ausgeschlossene Einzelkosten werden im Auftrag separat ergänzt. {basis === 'actual' ? 'Ist-Sätze verwenden die bislang erfassten Kosten ohne Hochrechnung; für zukünftige Preise vollständige Jahresplanwerte verwenden.' : 'Plan-Sätze beruhen auf den erfassten Jahresplanwerten.'}</Notice>
      {calculation.warnings.map(warning => <Notice key={warning} warning>{warning}</Notice>)}
      <Card title="Stunden- und Maschinenkostensätze" description="Hilfskostenstellen sind bereits umgelegt. Enthaltene Kostenarten werden unter Kostenrechnung festgelegt." actions={<Link className="text-sm text-blue-300" to="/Management/CostAccounting">BAB und Bezugsgrößen bearbeiten →</Link>}>
        {!rates.length ? <Empty>Zuerst Hauptkostenstellen oder Maschinenkostenstellen in der Kostenrechnung einrichten.</Empty> : <Table headers={['Kostenstelle', 'Enthaltene Jahreskosten', 'Produktive Stunden', 'Gemeinkosten / h', 'Vollstundensatz', 'Mit Gewinnaufschlag']}>{rates.map(rate => <tr key={rate.id}><td>{rate.name}<p className="text-xs text-gray-400">{rate.kind === 'machine' ? 'Maschinenstundensatz' : 'Leistungsstundensatz'}</p></td><td>{money(rate.hourlyCosts)}</td><td>{decimal(rate.hours)} h</td><td>{rate.overheadRate === null ? 'Stunden fehlen' : money(rate.overheadRate)}</td><td className="font-semibold text-blue-300">{rate.fullRate === null ? 'Stunden fehlen' : money(rate.fullRate) + ' / h'}</td><td>{rate.sellingRate === null ? '–' : money(rate.sellingRate) + ' / h'}</td></tr>)}</Table>}
      </Card>
      <Card title="Zuschlagssätze" description="Gemeinkostenzuschlag = Gemeinkosten der Stelle ÷ definierte Zuschlagsbasis × 100. Die Basis wird bei der Kostenstelle eingetragen, zum Beispiel jährlicher Materialeinsatz oder Fertigungslohn.">
        {!rates.length ? <Empty>Keine Hauptkostenstellen vorhanden.</Empty> : <Table headers={['Kostenstelle', 'Gemeinkosten', 'Zuschlagsbasis', 'Zuschlag']}>{rates.map(rate => <tr key={rate.id}><td>{rate.name}</td><td>{money(rate.overhead)}</td><td>{money(rate.directBase)}</td><td>{rate.surcharge === null ? 'Basis fehlt' : `${decimal(rate.surcharge)} %`}</td></tr>)}</Table>}
      </Card>
    </>}
    <Card title="Preis ausprobieren" description="Diese Vorschau speichert keinen Auftrag. Stunden- und Zuschlagsmethode sind alternative Wege. Derselbe Kostenanteil darf im Preis nur einmal enthalten sein.">
      {full && <div className="mb-4 max-w-sm"><Select label="Kalkulationsmethode" value={method} onChange={event => setMethod(event.target.value)}><option value="hours">Vollstundensätze</option><option value="surcharge">Einzelkosten + Zuschlag einer Kostenstelle</option></Select></div>}
      <div className="grid gap-5 xl:grid-cols-2"><div className="space-y-4">
        {method === 'hours' ? <div className="grid gap-3 sm:grid-cols-2">{rates.map(rate => <Input key={rate.id} label={`${rate.name} · Stunden`} type="number" min="0" value={quantities[rate.id] || 0} onChange={event => setQuantities(current => ({ ...current, [rate.id]: Number(event.target.value) }))}/>)}</div> : <div className="grid gap-3 sm:grid-cols-2"><Select label="Kostenstelle für den Zuschlag" value={surchargeId} onChange={event => setSurchargeId(event.target.value)}><option value="">Kostenstelle auswählen</option>{rates.filter(rate => rate.surcharge !== null).map(rate => <option key={rate.id} value={rate.id}>{rate.name} · {decimal(rate.surcharge)} %</option>)}</Select><Input label="Auftragsbezogene Zuschlagsbasis (€)" hint="Diese Einzelkosten werden im Preis mitgerechnet." type="number" min="0" value={base} onChange={event => setBase(Number(event.target.value))}/></div>}
        <Input label="Zusätzliches Material (€ netto)" hint="Nur Kosten, die noch nicht im Stundensatz oder in der Zuschlagsbasis enthalten sind." type="number" min="0" value={material} onChange={event => setMaterial(Number(event.target.value))}/>
        <Input label="Weitere Einzelkosten (€ netto)" type="number" min="0" value={other} onChange={event => setOther(Number(event.target.value))}/>
      </div><div className="rounded-xl border border-blue-900 bg-blue-950/20 p-5"><dl className="space-y-4 text-sm"><div className="flex justify-between"><dt className="text-gray-400">{method === 'hours' ? 'Stundenkosten' : 'Basis + Gemeinkostenzuschlag'}</dt><dd>{money(method === 'hours' ? hoursTotal : Number(base) + surchargeCosts)}</dd></div><div className="flex justify-between"><dt className="text-gray-400">Material + weitere Einzelkosten</dt><dd>{money(Number(material) + Number(other))}</dd></div><div className="flex justify-between border-t border-gray-700 pt-3"><dt>Selbstkosten</dt><dd className="font-semibold">{money(selfCosts)}</dd></div><div className="flex justify-between"><dt className="text-gray-400">Gewinn / Wagnis ({decimal(config.profitPercent)} %)</dt><dd>{money(profit)}</dd></div><div className="flex justify-between border-t border-gray-700 pt-4"><dt className="font-semibold">Verkaufspreis netto</dt><dd className="text-2xl font-bold text-blue-300">{missingRates || method === 'surcharge' && surcharge == null ? 'Unvollständig' : money(round(selfCosts + profit))}</dd></div></dl></div></div>
      {missingRates && <p role="alert" className="mt-4 text-sm text-amber-300">Für ausgewählte Stunden fehlt noch ein berechenbarer Kostensatz.</p>}
    </Card>
    {error && <Notice warning>{error}</Notice>}
    <Link className="inline-block text-sm text-blue-300" to="/Management/Settings">Modus und Gewinnaufschlag ändern →</Link>
  </div>;
}
