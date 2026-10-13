import { MACHINE_COST_LABELS } from '../../../../../../shared/management/defaults/catalog.defaults.mjs';
import { Card, Empty, Input, Notice, Select, Table } from '../../components/ui.jsx';
import { decimal, money } from '../../utils/format.js';

/** Ergänzt laufende Maschinenaufwendungen und Laufzeiten und zeigt die reine Maschinenrate innerhalb der gesamten Stellenkosten. */
export function SetupMachines({ config, change, calculation, activities }) {
  return (
    <>
      <Notice>
        Abschreibung, Wartung und Zinsansatz werden aus Schritt 02 übernommen.
        Die weiteren Maschinenkosten ergänzen den BAB genau einmal. Die Laufzeit
        kann manuell angegeben oder aus den zugeordneten Tätigkeitsberichten
        abgeleitet werden. Personalstunden sind nur dann Maschinenlaufzeit, wenn
        die Tätigkeit tatsächlich den Maschinenbetrieb erfasst.
      </Notice>
      {!calculation.machines.length && (
        <Card title="Maschinenkosten">
          <Empty>In Schritt 02 eine Standardmaschine oder CNC erfassen.</Empty>
        </Card>
      )}
      {calculation.machines.map((machine) => {
        /** Ändert ein gezielt benanntes Eingabefeld der aktuellen Position im Einrichtungsentwurf. */
        const update = (key, value) =>
          change((c) => {
            c.setup.assets.find((item) => item.id === machine.id)[key] = value;
          });
        return (
          <Card
            key={machine.id}
            title={machine.name || "Neue Maschine"}
            description={
              machine.category === "cnc"
                ? "CNC-Bearbeitungszentrum"
                : "Standardmaschine"
            }
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label={`${machine.name} · Strom und Betriebsmittel (€ / Jahr)`}
                type="number"
                min="0"
                value={machine.energy}
                onChange={(e) => update("energy", Number(e.target.value))}
              />
              <Input
                label={`${machine.name} · zugeordnete Raumkosten (€ / Jahr)`}
                type="number"
                min="0"
                value={machine.space}
                onChange={(e) => update("space", Number(e.target.value))}
              />
              <Input
                label={`${machine.name} · sonstige Maschinenkosten (€ / Jahr)`}
                type="number"
                min="0"
                value={machine.operating}
                onChange={(e) => update("operating", Number(e.target.value))}
              />
              <Input
                label={`${machine.name} · kalkulatorischer Zinssatz (%)`}
                type="number"
                min="0"
                disabled={config.setup.interestMode !== "imputed"}
                value={machine.interestRate}
                onChange={(e) => update("interestRate", Number(e.target.value))}
              />
              <Input
                label={`${machine.name} · kalkulatorische Zinsen manuell (€ / Jahr)`}
                type="number"
                min="0"
                disabled={config.setup.interestMode !== "imputed"}
                hint="Leer: aus gebundenem Kapital und Zinssatz berechnen."
                value={machine.interestAmount ?? ""}
                onChange={(e) =>
                  update(
                    "interestAmount",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
              />
              <Input
                label={`${machine.name} · verrechenbare Laufzeit (h / Jahr)`}
                type="number"
                min="0"
                hint="0: aus Tätigkeitsstunden bzw. dem zugeordneten Betriebsbereich ableiten."
                value={
                  config.setup.assets.find((item) => item.id === machine.id)
                    .hours
                }
                onChange={(e) => update("hours", Number(e.target.value))}
              />
              <Select
                label={`${machine.name} · Maschinenkostenstelle`}
                value={machine.centerId || ""}
                onChange={(e) => update("centerId", e.target.value || null)}
              >
                <option value="">Kosten über Schlüssel verteilen</option>
                {config.costCenters.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="my-4">
              <p className="mb-2 text-sm text-gray-400">
                Tätigkeiten zur Ableitung der Laufzeit:
              </p>
              <div className="flex flex-wrap gap-4">
                {activities.map((activity) => (
                  <label
                    key={activity.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={machine.activityIds.includes(activity.id)}
                      onChange={(e) =>
                        update(
                          "activityIds",
                          e.target.checked
                            ? [...machine.activityIds, activity.id]
                            : machine.activityIds.filter(
                                (id) => id !== activity.id
                              )
                        )
                      }
                    />
                    {activity.label}
                  </label>
                ))}
              </div>
            </div>
            <Table headers={["Kostenbestandteil", "Pro Jahr"]}>
              {Object.entries(MACHINE_COST_LABELS).map(([name, field]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{money(machine.costs[field])}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td>Jährliche Maschinenkosten</td>
                <td>{money(machine.total)}</td>
              </tr>
              <tr>
                <td>Verrechenbare Laufzeit</td>
                <td>{decimal(machine.hours)} h</td>
              </tr>
              <tr className="font-semibold text-blue-300">
                <td>Reiner Maschinenstundensatz</td>
                <td>
                  {machine.rate === null
                    ? "Laufzeit fehlt"
                    : `${money(machine.rate)} / h`}
                </td>
              </tr>
            </Table>
            <p className="mt-3 text-xs text-gray-400">
              Dieser reine Maschinensatz ist bereits Bestandteil der
              zugeordneten Kostenstelle. In der Vollkostenkalkulation darf er
              nicht nochmals zusätzlich zum vollen Stellenstundensatz angesetzt
              werden.
            </p>
          </Card>
        );
      })}
    </>
  );
}
