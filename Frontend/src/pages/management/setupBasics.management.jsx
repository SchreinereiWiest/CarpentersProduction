import { ANNUAL_COST_CATALOG } from '../../../../shared/managementSetup.mjs';
import { fiscalRange } from '../../../../shared/management.mjs';
import { createUuid } from './managementUuid.js';
import { newAsset, suggestedCenters } from './setupHelpers.js';
import { Button, Card, Empty, Input, Notice, Select, Table } from './managementUi.jsx';
import { decimal, money } from './managementFormat.js';

export function SetupBusiness({ config, change, activities, year, previous }) {
  const range = fiscalRange(year, config.startMonth);
  return <>
    <Card title="Betrieb und Zeitraum" description="Eine gemeinsame Jahresbasis für alle Kosten, Stunden und Kalkulationssätze.">
      <div className="grid gap-4 md:grid-cols-3">
        <Input label="Betriebsname" value={config.setup.companyName} onChange={e => change(c => { c.setup.companyName = e.target.value; })}/>
        <Select label="Beginn des Geschäftsjahrs" value={config.startMonth} onChange={e => change(c => { c.startMonth = Number(e.target.value); })}>{Array.from({ length: 12 }, (_, i) => <option value={i + 1} key={i}>{new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(new Date(2026, i, 1))}</option>)}</Select>
        <Select label="Umfang der Einrichtung" value={config.mode} onChange={e => change(c => { c.mode = e.target.value; })}><option value="full">Vollkosten automatisch ermitteln</option><option value="easy">Easy: Stundensätze direkt eingeben</option></Select>
      </div><p className="mt-4 text-sm text-gray-400">Abrechnungszeitraum: {range.start} bis {range.end}</p>
      {previous && <Button secondary className="mt-4" onClick={() => change(c => {
        const name = c.setup.companyName; const approvals = c.setup.approvals;
        const inherited = structuredClone(previous.config); inherited.setup.approvals = approvals; inherited.setup.companyName = name || inherited.setup.companyName;
        inherited.setup.annualCosts.forEach(cost => { cost.actualAmount = null; });
        inherited.setup.assets.forEach(asset => {
          for (const field of ['actualMaintenance', 'actualEnergy', 'actualSpace', 'actualOperating']) asset[field] = null;
          if (asset.usedYears !== null && asset.usedYears !== undefined) asset.usedYears = Number(asset.usedYears) + 1;
        });
        inherited.openingCash = 0; inherited.openingOtherAssets = 0; inherited.openingOtherLiabilities = 0;
        Object.assign(c, inherited);
      })}>Vorjahresstruktur übernehmen</Button>}
    </Card>
    {config.mode === 'easy' ? <Notice>Im Easy-Modus genügt ein Stundensatz in Schritt 07. Die weiteren Eingaben sind optional; anschließend in Schritt 08 freigeben.</Notice> : <Notice>Die vorgeschlagenen Bereiche fassen Zuschnitt und Bekantung zusammen. Eigene Tätigkeiten lassen sich in Schritt 04 gemeinsam einem Bereich zuordnen.</Notice>}
    <Card title="Betriebsbereiche und Kostenstellen" actions={<div className="flex gap-2"><Button secondary onClick={() => change(c => { for (const center of suggestedCenters(activities)) if (!c.costCenters.some(item => item.id === center.id)) c.costCenters.push(center); })}>Betriebsbereiche vorschlagen</Button><Button secondary onClick={() => change(c => { c.costCenters.push({ id: createUuid(), name: 'Neuer Bereich', kind: 'production', hours: 0, area: 0, employees: 0, directBase: 0, redistributionKey: 'hours', consumption: 0, usage: 0, activityIds: [] }); })}>+ Kostenstelle</Button></div>}>
      {!config.costCenters.length && <Empty>Kostenstellen vorschlagen lassen oder einen eigenen Bereich anlegen.</Empty>}
      {config.costCenters.map(center => <div className="mb-3 grid gap-3 rounded-lg border border-gray-700 p-3 md:grid-cols-[2fr_1fr_1fr_auto]" key={center.id}>
        <Input label="Kostenstelle" aria-label={`Kostenstelle ${center.name}`} value={center.name} onChange={e => change(c => { c.costCenters.find(item => item.id === center.id).name = e.target.value; })}/>
        <Select label="Bereichstyp" value={center.kind} onChange={e => change(c => { c.costCenters.find(item => item.id === center.id).kind = e.target.value; })}><option value="production">Fertigung / Leistung</option><option value="machine">Maschinenbereich</option><option value="support">Hilfskostenstelle / Verwaltung</option></Select>
        <Input label="Genutzte Fläche (m²)" type="number" min="0" value={center.area} onChange={e => change(c => { c.costCenters.find(item => item.id === center.id).area = Number(e.target.value); })}/>
        <Button danger className="self-end" onClick={() => change(c => {
          c.costCenters = c.costCenters.filter(item => item.id !== center.id);
          c.setup.staff.forEach(staff => { staff.allocations = staff.allocations.filter(item => item.centerId !== center.id); });
          [...c.setup.assets, ...c.setup.loans, ...c.setup.annualCosts].forEach(item => { if (item.centerId === center.id) item.centerId = null; });
          c.distributionKeys.forEach(key => { delete key.weights[center.id]; });
          Object.values(c.babAdjustments).forEach(types => Object.values(types).forEach(values => { delete values[center.id]; }));
          c.rules.forEach(rule => { if (rule.centerId === center.id) rule.centerId = null; });
        })}>Entfernen</Button>
      </div>)}
    </Card>
  </>;
}

export function SetupAssets({ config, change, calculation, year }) {
  const updateAsset = (id, key, value) => change(c => { c.setup.assets.find(item => item.id === id)[key] = value; });
  const updateLoan = (id, key, value) => change(c => { c.setup.loans.find(item => item.id === id)[key] = value; });
  return <>
    <Card title="Bestände zum Beginn des Geschäftsjahrs" description="Diese Bestände bilden die vereinfachte interne Vermögensübersicht. Bestehende Darlehen sind Restschulden und erzeugen keine erneute Auszahlung.">
      <div className="grid gap-4 md:grid-cols-4">
        <Input label="Bankguthaben / Kasse (€)" type="number" value={config.openingCash} onChange={e => change(c => { c.openingCash = Number(e.target.value); })}/>
        <Input label="Materiallager (€)" type="number" min="0" value={config.setup.materialStock} onChange={e => change(c => { c.setup.materialStock = Number(e.target.value); })}/>
        <Input label="Weitere Vermögenswerte (€)" type="number" min="0" value={config.openingOtherAssets} onChange={e => change(c => { c.openingOtherAssets = Number(e.target.value); })}/>
        <Input label="Weitere Verbindlichkeiten (€)" type="number" min="0" value={config.openingOtherLiabilities} onChange={e => change(c => { c.openingOtherLiabilities = Number(e.target.value); })}/>
      </div>
    </Card>
    <Card title="Maschinen, Fahrzeuge und weitere Anlagen" actions={<Button onClick={() => change(c => { c.setup.assets.push(newAsset(year)); })}>+ Anlagegut</Button>}>
      {!config.setup.assets.length && <Empty>Vorhandene Anlagen einzeln erfassen. Summenpositionen dürfen dieselben Anlagen nicht zusätzlich enthalten.</Empty>}
      {config.setup.assets.map(asset => {
        const result = calculation.assets.find(item => item.id === asset.id);
        return <div className="mb-4 space-y-4 rounded-lg border border-gray-700 p-4" key={asset.id}>
          <div className="grid gap-3 md:grid-cols-3">
            <Input label="Anlagegut" value={asset.name} onChange={e => updateAsset(asset.id, 'name', e.target.value)}/>
            <Select label="Anlagenkategorie" value={asset.category} onChange={e => updateAsset(asset.id, 'category', e.target.value)}><option value="machine">Standardmaschine</option><option value="cnc">CNC</option><option value="vehicle">Fahrzeug</option><option value="building">Gebäude</option><option value="equipment">Betriebsausstattung</option></Select>
            <Select label="Zugeordnete Kostenstelle" value={asset.centerId || ''} onChange={e => updateAsset(asset.id, 'centerId', e.target.value || null)}><option value="">Über Schlüssel verteilen</option>{config.costCenters.map(center => <option key={center.id} value={center.id}>{center.name}</option>)}</Select>
            <Input label="Anschaffungswert (€)" type="number" min="0" value={asset.purchaseCost} onChange={e => updateAsset(asset.id, 'purchaseCost', Number(e.target.value))}/>
            <Input label="Anschaffungsdatum" type="date" value={asset.acquiredAt} onChange={e => updateAsset(asset.id, 'acquiredAt', e.target.value)}/>
            <Input label="Nutzungsdauer (Jahre)" type="number" min="0.01" value={asset.usefulLifeYears} onChange={e => updateAsset(asset.id, 'usefulLifeYears', Number(e.target.value))}/>
            <Input label="Restwert (€)" type="number" min="0" value={asset.residualValue} onChange={e => updateAsset(asset.id, 'residualValue', Number(e.target.value))}/>
            <Input label="Vergangene Nutzungsjahre" hint={`Leer: aus Anschaffungsdatum ermittelt (${decimal(result.yearsUsed)} Jahre).`} type="number" min="0" value={asset.usedYears ?? ''} onChange={e => updateAsset(asset.id, 'usedYears', e.target.value === '' ? null : Number(e.target.value))}/>
            <Input label="Jährliche Wartung und Instandhaltung (€)" type="number" min="0" value={asset.maintenance} onChange={e => updateAsset(asset.id, 'maintenance', Number(e.target.value))}/>
            <Select label="Abschreibungsbasis" value={asset.useReplacement ? 'replacement' : 'purchase'} onChange={e => updateAsset(asset.id, 'useReplacement', e.target.value === 'replacement')}><option value="purchase">Historischer Anschaffungswert</option><option value="replacement">Wiederbeschaffungswert</option></Select>
            {asset.useReplacement && <Input label="Begründeter Wiederbeschaffungswert (€)" type="number" min="0" value={asset.replacementCost} onChange={e => updateAsset(asset.id, 'replacementCost', Number(e.target.value))}/>}
            <Select label="Finanzierendes Darlehen" value={asset.loanId || ''} onChange={e => updateAsset(asset.id, 'loanId', e.target.value || null)}><option value="">Kein einzelnes Darlehen</option>{config.setup.loans.map(loan => <option key={loan.id} value={loan.id}>{loan.name}</option>)}</Select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-blue-200">Abschreibung in diesem Jahr: {money(result.depreciation)} · Vermögenswert: {money(result.bookValue)} · durchschnittlich gebundenes Kapital: {money(result.boundCapital)}</p><Button danger onClick={() => change(c => { c.setup.assets = c.setup.assets.filter(item => item.id !== asset.id); })}>Anlagegut entfernen</Button></div>
        </div>;
      })}
    </Card>
    <Card title="Darlehen und Finanzierung" description="Tilgungen verändern die Restschuld; sie werden nicht als Kosten angesetzt." actions={<Button secondary onClick={() => change(c => { c.setup.loans.push({ id: createUuid(), name: 'Darlehen', balance: 0, interestRate: 0, repayment: 0, centerId: null }); })}>+ Darlehen</Button>}>
      <Select label="Zinsansatz in der Kostenrechnung" value={config.setup.interestMode} onChange={e => change(c => { c.setup.interestMode = e.target.value; })}><option value="imputed">Kalkulatorische Zinsen auf Anlagenkapital</option><option value="financing">Darlehenszinsen als Finanzierungskosten</option><option value="none">Kein Zinsansatz</option></Select>
      <Notice>Es wird genau eine Zinsmethode gerechnet. Bei kalkulatorischen Zinsen bleiben Darlehenszinsen in der Finanzierungsübersicht; bei Finanzierungskosten werden keine zusätzlichen kalkulatorischen Zinsen angesetzt.</Notice>
      {config.setup.loans.map(loan => <div className="mt-4 grid gap-3 rounded-lg border border-gray-700 p-3 md:grid-cols-5" key={loan.id}>
        <Input label="Darlehen" value={loan.name} onChange={e => updateLoan(loan.id, 'name', e.target.value)}/>
        <Input label="Restschuld zu Jahresbeginn (€)" type="number" min="0" value={loan.balance} onChange={e => updateLoan(loan.id, 'balance', Number(e.target.value))}/>
        <Input label="Darlehenszinssatz (%)" type="number" min="0" value={loan.interestRate} onChange={e => updateLoan(loan.id, 'interestRate', Number(e.target.value))}/>
        <Input label="Geplante Jahrestilgung (€)" type="number" min="0" value={loan.repayment} onChange={e => updateLoan(loan.id, 'repayment', Number(e.target.value))}/>
        <Button danger className="self-end" onClick={() => change(c => { c.setup.loans = c.setup.loans.filter(item => item.id !== loan.id); c.setup.assets.forEach(asset => { if (asset.loanId === loan.id) asset.loanId = null; }); })}>Entfernen</Button>
      </div>)}<p className="mt-4 text-sm text-gray-400">Jährlicher Finanzierungszins auf die erfasste Restschuld: {money(calculation.financeInterest)}</p>
    </Card>
    <Card title="Vereinfachte Vermögensübersicht"><Table headers={['Position', 'Wert']}>
      {Object.entries({ 'Anlagen zum Jahresbeginn': calculation.balance.fixedAssets, Materiallager: calculation.balance.materialStock, 'Bank / Kasse': calculation.balance.cash, 'Weitere Vermögenswerte': calculation.balance.otherAssets, Verbindlichkeiten: -calculation.balance.liabilities, Eigenkapital: calculation.balance.equity }).map(([name, value]) => <tr key={name}><td>{name}</td><td>{money(value)}</td></tr>)}
    </Table></Card>
  </>;
}

export function SetupAnnualCosts({ config, change, calculation }) {
  const update = (id, key, value) => change(c => { c.setup.annualCosts.find(item => item.id === id)[key] = value; });
  return <>
    <Notice>Hier Jahresplanwerte eingeben. Wartung, Energie, Raumkosten und Abschreibungen, die bereits direkt bei Anlagen erfasst wurden, sind dort enthalten. Hier nur die verbleibenden Betriebskosten eintragen. Ist-Summen werden später separat geführt.</Notice>
    <Card title="Jährliche Betriebskosten" actions={<div className="flex gap-2"><Button secondary onClick={() => change(c => { for (const [type, name, keyId] of ANNUAL_COST_CATALOG) if (!c.setup.annualCosts.some(item => item.costTypeId === type)) c.setup.annualCosts.push({ id: createUuid(), name, costTypeId: type, amount: 0, actualAmount: null, centerId: null, keyId, source: 'manual' }); })}>Schreinerei-Katalog übernehmen</Button><Button secondary onClick={() => change(c => { c.setup.annualCosts.push({ id: createUuid(), name: 'Weitere Betriebskosten', costTypeId: 'other', amount: 0, actualAmount: null, centerId: null, keyId: 'hours', source: 'manual' }); })}>+ Kostenposition</Button></div>}>
      {!config.setup.annualCosts.length && <Empty>Den Kostenartenkatalog übernehmen oder eine Kostenposition ergänzen.</Empty>}
      {config.setup.annualCosts.map(cost => <div className="mb-3 grid gap-3 rounded-lg border border-gray-700 p-3 md:grid-cols-[2fr_1fr_1fr_auto]" key={cost.id}>
        <Input label="Kostenposition" value={cost.name} onChange={e => update(cost.id, 'name', e.target.value)}/>
        <Select label="Kostenart" value={cost.costTypeId} onChange={e => { update(cost.id, 'costTypeId', e.target.value); if (e.target.value !== 'personnel') update(cost.id, 'source', 'manual'); }}>{config.costTypes.filter(item => !['depreciation', 'interest'].includes(item.id)).map(type => <option value={type.id} key={type.id}>{type.name}</option>)}</Select>
        <Input label={`${cost.name} · Jahresplan (€)`} type="number" min="0" disabled={cost.source === 'staff'} value={cost.source === 'staff' ? config.setup.staff.reduce((sum, staff) => sum + Number(staff.annualCost), 0) : cost.amount} onChange={e => update(cost.id, 'amount', Number(e.target.value))}/>
        <Button danger className="self-end" onClick={() => change(c => { c.setup.annualCosts = c.setup.annualCosts.filter(item => item.id !== cost.id); })}>Entfernen</Button>
        {cost.costTypeId === 'personnel' && <Select label="Personalkostenquelle" value={cost.source} onChange={e => { update(cost.id, 'source', e.target.value); if (e.target.value === 'staff') update(cost.id, 'keyId', 'hours'); }}><option value="manual">Jahresbetrag manuell</option><option value="staff">Aus Mitarbeiterdaten (Schritt 04)</option></Select>}
      </div>)}
      <p className="text-sm text-blue-200">Gesamte jährliche Kosten einschließlich Anlagen und Zinsansatz: {money(calculation.totalCosts)}</p>
    </Card>
  </>;
}
