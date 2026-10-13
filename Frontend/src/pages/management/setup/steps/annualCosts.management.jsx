import { newAnnualCost } from '../../defaults/forms.defaults.js';
import { ANNUAL_COST_CATALOG } from '../../../../../../shared/management/defaults/catalog.defaults.mjs';

import { Button, Card, Empty, Input, Notice, Select } from '../../components/ui.jsx';
import { money } from '../../utils/format.js';

/** Erfasst verbleibende jährliche Betriebskosten; bereits direkt an Anlagen hinterlegte Aufwendungen werden nicht erneut vorbelegt. */
export function SetupAnnualCosts({ config, change, calculation }) {
  /** Ändert ein gezielt benanntes Eingabefeld der aktuellen Position im Einrichtungsentwurf. */
  const update = (id, key, value) =>
    change((c) => {
      c.setup.annualCosts.find((item) => item.id === id)[key] = value;
    });
  return (
    <>
      <Notice>
        Hier Jahresplanwerte eingeben. Wartung, Energie, Raumkosten und
        Abschreibungen, die bereits direkt bei Anlagen erfasst wurden, sind dort
        enthalten. Hier nur die verbleibenden Betriebskosten eintragen.
        Ist-Summen werden später separat geführt.
      </Notice>
      <Card
        title="Jährliche Betriebskosten"
        actions={
          <div className="flex gap-2">
            <Button
              secondary
              onClick={() =>
                change((c) => {
                  for (const [type, name, keyId] of ANNUAL_COST_CATALOG)
                    if (
                      !c.setup.annualCosts.some(
                        (item) => item.costTypeId === type
                      )
                    )
                      c.setup.annualCosts.push(newAnnualCost({ name, costTypeId: type, keyId }));
                })
              }
            >
              Schreinerei-Katalog übernehmen
            </Button>
            <Button
              secondary
              onClick={() =>
                change((c) => {
                  c.setup.annualCosts.push(newAnnualCost());
                })
              }
            >
              + Kostenposition
            </Button>
          </div>
        }
      >
        {!config.setup.annualCosts.length && (
          <Empty>
            Den Kostenartenkatalog übernehmen oder eine Kostenposition ergänzen.
          </Empty>
        )}
        {config.setup.annualCosts.map((cost) => (
          <div
            className="mb-3 grid gap-3 rounded-lg border border-gray-700 p-3 md:grid-cols-[2fr_1fr_1fr_auto]"
            key={cost.id}
          >
            <Input
              label="Kostenposition"
              value={cost.name}
              onChange={(e) => update(cost.id, "name", e.target.value)}
            />
            <Select
              label="Kostenart"
              value={cost.costTypeId}
              onChange={(e) => {
                update(cost.id, "costTypeId", e.target.value);
                if (e.target.value !== "personnel")
                  update(cost.id, "source", "manual");
              }}
            >
              {config.costTypes
                .filter(
                  (item) => !["depreciation", "interest"].includes(item.id)
                )
                .map((type) => (
                  <option value={type.id} key={type.id}>
                    {type.name}
                  </option>
                ))}
            </Select>
            <Input
              label={`${cost.name} · Jahresplan (€)`}
              type="number"
              min="0"
              disabled={cost.source === "staff"}
              value={
                cost.source === "staff"
                  ? config.setup.staff.reduce(
                      (sum, staff) => sum + Number(staff.annualCost),
                      0
                    )
                  : cost.amount
              }
              onChange={(e) =>
                update(cost.id, "amount", Number(e.target.value))
              }
            />
            <Button
              danger
              className="self-end"
              onClick={() =>
                change((c) => {
                  c.setup.annualCosts = c.setup.annualCosts.filter(
                    (item) => item.id !== cost.id
                  );
                })
              }
            >
              Entfernen
            </Button>
            {cost.costTypeId === "personnel" && (
              <Select
                label="Personalkostenquelle"
                value={cost.source}
                onChange={(e) => {
                  update(cost.id, "source", e.target.value);
                  if (e.target.value === "staff")
                    update(cost.id, "keyId", "hours");
                }}
              >
                <option value="manual">Jahresbetrag manuell</option>
                <option value="staff">Aus Mitarbeiterdaten (Schritt 04)</option>
              </Select>
            )}
          </div>
        ))}
        <p className="text-sm text-blue-200">
          Gesamte jährliche Kosten einschließlich Anlagen und Zinsansatz:{" "}
          {money(calculation.totalCosts)}
        </p>
      </Card>
    </>
  );
}
