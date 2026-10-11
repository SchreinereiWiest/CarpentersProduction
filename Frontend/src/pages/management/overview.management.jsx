import { Link } from 'react-router';
import { useManagement } from './managementContext.js';
import { Card, Empty, Notice, Table } from './managementUi.jsx';
import { money, dateLabel } from './managementFormat.js';

export default function ManagementOverview() {
  const { state, calculation: calc, basis } = useManagement();
  const chartMax = Math.max(1, ...calc.months.flatMap(month => [month.income, month.expense]));
  return <div className="space-y-5">
    <header><h1 className="text-2xl font-bold xl:text-3xl">Betriebsübersicht</h1><p className="mt-2 text-sm text-gray-400">{dateLabel(calc.range.start)} – {dateLabel(calc.range.end)} · Erträge und Kosten netto. Liquidität und offene Posten brutto zum {dateLabel(calc.cutoff)}.</p></header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Erträge', calc.income, basis === 'plan' ? 'Geplante betriebliche Erträge' : 'Erfasste Leistungen und Rechnungen', 'text-emerald-300'],
        ['Kosten', calc.totalCosts, 'Aufwand + Abschreibungen + BAB-Ergänzungen', 'text-white'],
        ['Betriebsergebnis', calc.result, basis === 'plan' ? 'Geplante Erträge minus Kosten' : 'Erträge minus interne Kosten', calc.result >= 0 ? 'text-emerald-300' : 'text-red-300'],
        ['Liquidität', calc.cash, 'Ist-Zahlungen + Anfangsbestand', calc.cash >= 0 ? 'text-blue-300' : 'text-red-300'],
      ].map(([label, value, description, color]) => <Card key={label}><p className="text-sm text-gray-400">{label}</p><p className={`mt-2 text-2xl font-semibold ${color}`}>{money(value)}</p><p className="mt-2 text-xs text-gray-400">{description}</p></Card>)}
    </div>
    {basis === 'plan' && <Notice>Planwerte werden getrennt von Ist-Werten gerechnet. Liquidität, offene Posten und Vermögensübersicht zeigen weiterhin den tatsächlichen Zahlungsstand.</Notice>}
    {state.transactions.length === 0 && <Card title="Mit wenigen Angaben starten" description="Zuerst einen Stundensatz festlegen oder den ersten Geschäftsvorfall erfassen. Die Übersicht wächst mit deinen Daten."><div className="flex flex-wrap gap-3"><Link className="rounded-lg bg-blue-600 px-4 py-2 text-sm" to="/Management/Calculation">Stundensätze einrichten</Link><Link className="rounded-lg border border-gray-600 px-4 py-2 text-sm" to="/Management/Transactions">Geschäftsvorfall erfassen</Link><Link className="rounded-lg border border-gray-600 px-4 py-2 text-sm" to="/Management/Settings">Betrieb einrichten</Link></div></Card>}
    <div className="grid gap-5 xl:grid-cols-3">
      <Card className="xl:col-span-2" title="Erträge und Ausgaben im Jahresverlauf" description="Leistungsdatum bestimmt die Periode. Abschreibungen und manuelle BAB-Ergänzungen sind im Kosten-KPI enthalten.">
        <div className="mb-4 flex gap-4 text-xs text-gray-400"><span><span className="mr-2 inline-block size-2 rounded bg-emerald-500"/>Erträge</span><span><span className="mr-2 inline-block size-2 rounded bg-blue-500"/>Ausgaben</span></div>
        <div className="grid h-48 grid-cols-12 items-end gap-2" role="img" aria-label="Monatliche Erträge und Ausgaben">
          {calc.months.map(month => <div key={month.month} className="flex h-full flex-col justify-end gap-2" title={`${month.month}: Erträge ${money(month.income)}, Ausgaben ${money(month.expense)}`}><div className="flex h-36 items-end justify-center gap-1"><div className="w-3 rounded-t bg-emerald-500" style={{ height: `${month.income / chartMax * 100}%`, minHeight: month.income ? 3 : 0 }}/><div className="w-3 rounded-t bg-blue-500" style={{ height: `${month.expense / chartMax * 100}%`, minHeight: month.expense ? 3 : 0 }}/></div><span className="text-center text-[10px] text-gray-400">{month.month.slice(5)}</span></div>)}
        </div>
        <details className="mt-3 text-xs text-gray-400"><summary className="cursor-pointer">Monatswerte anzeigen</summary><Table headers={['Monat', 'Erträge', 'Ausgaben']}>{calc.months.map(month => <tr key={month.month}><td>{month.month}</td><td>{money(month.income)}</td><td>{money(month.expense)}</td></tr>)}</Table></details>
      </Card>
      <Card title="Offene Posten" description="Auch unbezahlte Vorjahresrechnungen sind enthalten."><div className="space-y-4"><div><p className="text-xs text-gray-400">Forderungen an Kunden</p><p className="mt-1 text-xl font-semibold text-emerald-300">{money(calc.receivables)}</p></div><div><p className="text-xs text-gray-400">Verbindlichkeiten aus Rechnungen</p><p className="mt-1 text-xl font-semibold text-amber-300">{money(calc.payables)}</p></div><p className="text-sm text-gray-400">{calc.openItems.filter(item => item.overdue).length} überfällige Posten</p><Link to="/Management/Transactions?filter=open" className="inline-block text-sm text-blue-300 hover:underline">Zahlungen und Zuordnungen bearbeiten →</Link></div></Card>
    </div>
    <Card title="Nächste fällige Zahlungen" actions={<Link className="text-sm text-blue-300" to="/Management/Transactions?filter=open">Alle offenen Posten</Link>}>
      {!calc.openItems.length ? <Empty>Alle erfassten Rechnungen sind ausgeglichen.</Empty> : <Table headers={['Geschäftsvorfall', 'Art', 'Fällig am', 'Offener Betrag', 'Status']}>{[...calc.openItems].sort((a, b) => String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999'))).slice(0, 6).map(item => <tr key={item.id}><td><Link className="text-blue-300 hover:underline" to={`/Management/Transactions?item=${item.id}`}>{item.title}</Link></td><td>{item.kind === 'income' ? 'Forderung' : 'Verbindlichkeit'}</td><td>{dateLabel(item.dueDate)}</td><td>{money(item.open)}</td><td className={item.overdue ? 'text-amber-300' : 'text-gray-400'}>{item.overdue ? 'Überfällig' : 'Offen'}</td></tr>)}</Table>}
    </Card>
    <div className="grid gap-5 xl:grid-cols-2">
      <Card title="Vermögensübersicht" description={`Interne Bestandsrechnung zum ${dateLabel(calc.cutoff)}. Weitere Vermögenswerte und Verpflichtungen können in den Einstellungen ergänzt werden.`}>
        <dl className="space-y-3 text-sm">{[['Anlagevermögen', calc.balance.fixedAssets], ['Liquidität', calc.cash], ['Forderungen', calc.receivables], ['Weitere Vermögenswerte', calc.balance.otherAssets], ['Gesamtvermögen', calc.balance.totalAssets], ['Verbindlichkeiten inkl. Darlehen', calc.balance.liabilities], ['Eigenkapital (rechnerisch)', calc.balance.equity]].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-gray-400">{label}</dt><dd className="font-medium">{money(value)}</dd></div>)}</dl>
      </Card>
      <Card title="Stand der Betriebskalkulation" description={state.config.mode === 'easy' ? 'Easy-Modus: Preise auf Basis selbst gepflegter Stundensätze.' : 'Vollkalkulation: Geschäftsvorfälle → Kostenarten → Kostenstellen / BAB → Kalkulationssätze.'}>
        <div className="space-y-3 text-sm text-gray-300">{state.config.mode === 'easy' ? <><p>{state.config.easyRates.length} einfache Stundensätze</p><p className="text-gray-400">Kostenstellen und BAB können später ergänzt werden.</p></> : <><p>{state.config.costCenters.length} Kostenstellen</p><p>{money(calc.unallocated)} noch nicht auf Kostenstellen verteilt</p>{calc.warnings.slice(0, 2).map(warning => <Notice key={warning} warning>{warning}</Notice>)}</>}<Link to={state.config.mode === 'easy' ? '/Management/Calculation' : '/Management/CostAccounting'} className="inline-block text-blue-300 hover:underline">Kalkulation öffnen →</Link></div>
      </Card>
    </div>
  </div>;
}
