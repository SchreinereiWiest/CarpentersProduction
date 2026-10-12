import { useManagement } from './managementContext.js';
import { Card, Empty, Notice, Table } from './managementUi.jsx';
import { decimal } from './managementFormat.js';

export default function ManagementHours() {
  const { state, activities } = useManagement();
  const actual = state.operatingActual.actualHours; const plan = state.operatingPlan;
  const centers = state.operationalConfig.costCenters;
  return <div className="space-y-5"><div><h1 className="text-2xl font-semibold">Stunden & Produktivität</h1><p className="mt-2 text-sm text-gray-400">Kalenderberichte werden beim Öffnen oder Aktualisieren der Ansicht neu ausgewertet. Manuelle Planstunden erzeugen keine Ist-Berichte.</p></div>
    {!actual.total && <Notice>Noch keine abgeschlossenen Tätigkeitsberichte vorhanden. Die manuelle Jahresplanung ist unter „Betrieb konfigurieren → Mitarbeiter & Arbeitsstunden“ verfügbar.</Notice>}
    {actual.unmapped > 0 && <Notice warning>{decimal(actual.unmapped)} Stunden fehlen in der Kostenstellenverteilung. Die zugehörigen Tätigkeiten im Einrichtungsbereich zuordnen; vorhandene Berichte werden danach automatisch berücksichtigt.</Notice>}
    <Card title="Arbeitsstunden nach Mitarbeitern"><Table headers={['Mitarbeiter', ...centers.map(center => center.name), 'Ohne Zuordnung', 'Gesamt']}>{actual.employees.map(employee => <tr key={employee.id}><td>{employee.name}</td>{centers.map(center => <td key={center.id}>{decimal(employee.values[center.id])} h <span className="block text-xs text-gray-500">{decimal(employee.total > 0 ? employee.values[center.id] / employee.total * 100 : 0)} %</span></td>)}<td>{decimal(employee.unmapped)} h</td><td>{decimal(employee.total)} h</td></tr>)}</Table>{!actual.employees.length && <Empty>Noch keine Personalstunden im ausgewählten Geschäftsjahr.</Empty>}</Card>
    <Card title="Tätigkeitsaufschlüsselung"><Table headers={['Tätigkeit', 'Kostenstelle', 'Stunden', 'Anteil']}>{actual.activities.map(activity => <tr key={activity.id}><td>{activities.find(item => item.id === activity.id)?.label || activity.id}</td><td>{centers.find(center => center.id === activity.centerId)?.name || 'Nicht zugeordnet'}</td><td>{decimal(activity.hours)} h</td><td>{decimal(actual.total > 0 ? activity.hours / actual.total * 100 : 0)} %</td></tr>)}</Table></Card>
    <Card title="Monatlicher Verlauf"><Table headers={['Monat', ...centers.map(center => center.name), 'Gesamt']}>{actual.months.map(month => <tr key={month.month}><td>{new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(new Date(`${month.month}-15T12:00:00Z`))}</td>{centers.map(center => <td key={center.id}>{decimal(month.values[center.id])} h</td>)}<td>{decimal(month.total)} h</td></tr>)}</Table></Card>
    <Card title="Plan und Produktivität"><Table headers={['Kostenstelle', 'Plan pro Jahr', 'Zeitanteiliger Plan', 'Erfasste Stunden', 'Erfüllung des zeitanteiligen Plans']}>{centers.filter(center => center.kind !== 'support').map(center => {
      const target = Number(plan.planHours[center.id] || 0); const expected = target * state.operatingActual.elapsed; const hours = actual.values[center.id] || 0;
      return <tr key={center.id}><td>{center.name}</td><td>{decimal(target)} h</td><td>{decimal(expected)} h</td><td>{decimal(hours)} h</td><td>{expected > 0 ? `${decimal(hours / expected * 100)} %` : '—'}</td></tr>;
    })}</Table><p className="mt-3 text-xs text-gray-400">Der zeitanteilige Plan verteilt die Jahresstunden gleichmäßig über den Abrechnungszeitraum. Individuelle Urlaubs- und Saisonverläufe sind darin noch nicht berücksichtigt.</p></Card>
  </div>;
}
