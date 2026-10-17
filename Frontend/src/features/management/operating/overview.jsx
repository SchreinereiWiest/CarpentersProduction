import { Link } from "react-router";
import { useManagement } from '../hooks/useManagement.js';
import { Card, Notice, Table } from '../components/ui.jsx';
import { decimal, money } from '../utils/format.js';

/** Zeigt veröffentlichte Plansätze, bisherige Ist-Kosten, Arbeitsstunden und Vermögensbasis ohne den freigegebenen Plan neu zu schreiben. */
export default function ManagementOverview() {
  const { state, year } = useManagement();
  const {
    operatingPlan: plan,
    operatingActual: actual,
    operationalConfig: config
  } = state;
  const approval = state.config.setup.approvals.at(-1);
  const rates =
    config.mode === "easy"
      ? config.easyRates.map((rate) => ({
          ...rate,
          fullRate: Number(rate.rate),
          sellingRate:
            Number(rate.rate) * (1 + Number(config.profitPercent) / 100)
        }))
      : plan.rates.filter((rate) => rate.kind !== "support");
  const expected =
    Object.values(plan.planHours).reduce(
      (sum, hours) => sum + Number(hours),
      0
    ) * actual.elapsed;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Betriebsübersicht</h1>
        <p className="mt-2 text-sm text-gray-400">
          {config.setup.companyName} · Geschäftsjahr {year} · freigegebene
          Version {approval?.version}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Jährliche Plankosten", money(plan.totalCosts)],
          ["Erfasste Ist-Kosten", money(actual.totalCosts)],
          ["Erfasste Arbeitsstunden", `${decimal(actual.actualHours.total)} h`],
          [
            "Stunden zum zeitanteiligen Plan",
            expected > 0
              ? `${decimal((actual.actualHours.total / expected) * 100)} %`
              : "Noch keine Planstunden"
          ]
        ].map(([name, value]) => (
          <Card key={name} title={name}>
            <p className="text-2xl font-semibold text-blue-300">{value}</p>
          </Card>
        ))}
      </div>
      {actual.missingActual.length > 0 && (
        <Notice warning>
          Die Ist-Kosten sind noch unvollständig: Für{" "}
          {actual.missingActual.length} Kostenpositionen liegen keine Ist-Summen
          vor. Jahresplanwerte werden nicht zusätzlich als Ist-Kosten gezählt.{" "}
          <Link className="underline" to="/Management/Costs">
            Ist-Summen ergänzen
          </Link>
        </Notice>
      )}
      {!actual.actualHours.total && (
        <Notice>
          Es liegen noch keine abgeschlossenen Zeitberichte vor. Die
          freigegebenen Stundensätze verwenden weiterhin die eingerichtete
          Jahresbasis.{" "}
          <Link to="/Mitarbeiter" className="underline">
            Zur Arbeitszeiterfassung
          </Link>
        </Notice>
      )}
      <Card
        title="Freigegebene Stundensätze"
        description="Die Planbasis bleibt bis zur nächsten Freigabe unverändert."
      >
        <Table
          headers={[
            "Leistungsbereich",
            "Selbstkosten / h",
            "Mit Gewinnaufschlag / h"
          ]}
        >
          {rates.map((rate) => (
            <tr key={rate.id}>
              <td>{rate.name}</td>
              <td>{rate.fullRate === null ? "—" : money(rate.fullRate)}</td>
              <td>
                {rate.sellingRate === null ? "—" : money(rate.sellingRate)}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card
        title="Produktivität im Jahresverlauf"
        description="Stunden aus abgeschlossenen Personalberichten; Vergleich mit den geplanten produktiven Jahresstunden."
      >
        <Table
          headers={[
            "Kostenstelle",
            "Jahresplan",
            "Ist bis heute",
            "Anteil am Jahresplan"
          ]}
        >
          {plan.rates
            .filter((rate) => rate.kind !== "support")
            .map((rate) => {
              const target = Number(plan.planHours[rate.id] || rate.hours);
              const hours = Number(actual.actualHours.values[rate.id] || 0);
              return (
                <tr key={rate.id}>
                  <td>{rate.name}</td>
                  <td>{decimal(target)} h</td>
                  <td>{decimal(hours)} h</td>
                  <td>
                    {target > 0 ? `${decimal((hours / target) * 100)} %` : "—"}
                  </td>
                </tr>
              );
            })}
        </Table>
        <Link
          className="mt-4 inline-block text-sm text-blue-300 underline"
          to="/Management/Hours"
        >
          Stunden nach Mitarbeitern und Tätigkeiten aufschlüsseln
        </Link>
      </Card>
      <Card title="Vermögens- und Finanzierungsbasis zum Jahresbeginn">
        <div className="grid gap-4 md:grid-cols-3">
          <p className="text-sm text-gray-400">
            Vermögen{" "}
            <strong className="mt-1 block text-lg text-white">
              {money(plan.balance.totalAssets)}
            </strong>
          </p>
          <p className="text-sm text-gray-400">
            Verbindlichkeiten{" "}
            <strong className="mt-1 block text-lg text-white">
              {money(plan.balance.liabilities)}
            </strong>
          </p>
          <p className="text-sm text-gray-400">
            Eigenkapital{" "}
            <strong className="mt-1 block text-lg text-white">
              {money(plan.balance.equity)}
            </strong>
          </p>
        </div>
      </Card>
    </div>
  );
}
