import { Table } from './ui.jsx';
import { decimal, money } from '../utils/format.js';

/** Zeigt Kostenarten, Umlagen, verbleibende Zuordnungslücken und Stundenbasis für einen Plan- oder Ist-BAB. */
export function BabTable({ calculation, config }) {
  return (
    <Table
      headers={[
        "Kostenart",
        "Gesamt",
        ...config.costCenters.map((center) => center.name),
        "Nicht verteilt"
      ]}
    >
      {calculation.rows
        .filter((row) => row.total > 0)
        .map((row) => (
          <tr key={row.id}>
            <td>{row.name}</td>
            <td>{money(row.total)}</td>
            {config.costCenters.map((center) => (
              <td key={center.id}>{money(row.values[center.id])}</td>
            ))}
            <td className={row.unallocated ? "text-amber-300" : ""}>
              {money(row.unallocated)}
            </td>
          </tr>
        ))}
      <tr className="font-semibold">
        <td>Stellenkosten nach Umlage</td>
        <td>{money(calculation.totalCosts)}</td>
        {calculation.rates.map((rate) => (
          <td key={rate.id}>{money(rate.total)}</td>
        ))}
        <td>{money(calculation.unallocated)}</td>
      </tr>
      <tr>
        <td>Produktive Stunden</td>
        <td></td>
        {calculation.rates.map((rate) => (
          <td key={rate.id}>{decimal(rate.hours)} h</td>
        ))}
        <td></td>
      </tr>
      <tr className="font-semibold text-blue-300">
        <td>Vollstundensatz</td>
        <td></td>
        {calculation.rates.map((rate) => (
          <td key={rate.id}>
            {rate.kind === "support"
              ? "Umgelegt"
              : rate.fullRate === null
                ? "Stunden fehlen"
                : `${money(rate.fullRate)} / h`}
          </td>
        ))}
        <td></td>
      </tr>
    </Table>
  );
}
