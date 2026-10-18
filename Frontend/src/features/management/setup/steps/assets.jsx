import { newLoan } from '../../defaults/forms.defaults.js';

import { newAsset } from '../../defaults/forms.defaults.js';
import { Button, Card, Empty, Input, Notice, Select, Table } from '../../components/ui.jsx';
import { decimal, money } from '../../utils/format.js';

/** Erfasst Anlagen, Eröffnungsbestände und Restschulden und zeigt daraus die interne Vermögens- und Abschreibungsbasis. */
export function SetupAssets({ config, change, calculation, year }) {
  /** Ändert ein Anlagefeld anhand der stabilen Positions-ID im lokalen Entwurf. */
  const updateAsset = (id, key, value) =>
    change((c) => {
      c.setup.assets.find((item) => item.id === id)[key] = value;
    });
  /** Ändert ein Feld der vorhandenen Restschuldposition im lokalen Entwurf. */
  const updateLoan = (id, key, value) =>
    change((c) => {
      c.setup.loans.find((item) => item.id === id)[key] = value;
    });
  return (
    <>
      <Card
        title="Bestände zum Beginn des Geschäftsjahrs"
        description="Diese Bestände bilden die vereinfachte interne Vermögensübersicht. Bestehende Darlehen sind Restschulden und erzeugen keine erneute Auszahlung."
      >
        <div className="grid gap-4 md:grid-cols-4">
          <Input
            label="Bankguthaben / Kasse (€)"
            type="number"
            value={config.openingCash}
            onChange={(e) =>
              change((c) => {
                c.openingCash = Number(e.target.value);
              })
            }
          />
          <Input
            label="Materiallager (€)"
            type="number"
            min="0"
            value={config.setup.materialStock}
            onChange={(e) =>
              change((c) => {
                c.setup.materialStock = Number(e.target.value);
              })
            }
          />
          <Input
            label="Weitere Vermögenswerte (€)"
            type="number"
            min="0"
            value={config.openingOtherAssets}
            onChange={(e) =>
              change((c) => {
                c.openingOtherAssets = Number(e.target.value);
              })
            }
          />
          <Input
            label="Weitere Verbindlichkeiten (€)"
            type="number"
            min="0"
            value={config.openingOtherLiabilities}
            onChange={(e) =>
              change((c) => {
                c.openingOtherLiabilities = Number(e.target.value);
              })
            }
          />
        </div>
      </Card>
      <Card
        title="Maschinen, Fahrzeuge und weitere Anlagen"
        actions={
          <Button
            onClick={() =>
              change((c) => {
                c.setup.assets.push(newAsset(year));
              })
            }
          >
            + Anlagegut
          </Button>
        }
      >
        {!config.setup.assets.length && (
          <Empty>
            Vorhandene Anlagen einzeln erfassen. Summenpositionen dürfen
            dieselben Anlagen nicht zusätzlich enthalten.
          </Empty>
        )}
        {config.setup.assets.map((asset) => {
          const result = calculation.assets.find(
            (item) => item.id === asset.id
          );
          return (
            <div
              className="mb-4 space-y-4 rounded-lg border border-gray-700 p-4"
              key={asset.id}
            >
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  label="Anlagegut"
                  value={asset.name}
                  onChange={(e) =>
                    updateAsset(asset.id, "name", e.target.value)
                  }
                />
                <Select
                  label="Anlagenkategorie"
                  value={asset.category}
                  onChange={(e) =>
                    updateAsset(asset.id, "category", e.target.value)
                  }
                >
                  <option value="machine">Standardmaschine</option>
                  <option value="cnc">CNC</option>
                  <option value="vehicle">Fahrzeug</option>
                  <option value="building">Gebäude</option>
                  <option value="equipment">Betriebsausstattung</option>
                </Select>
                <Select
                  label="Zugeordnete Kostenstelle"
                  value={asset.centerId || ""}
                  onChange={(e) =>
                    updateAsset(asset.id, "centerId", e.target.value || null)
                  }
                >
                  <option value="">Über Schlüssel verteilen</option>
                  {config.costCenters.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Anschaffungswert (€)"
                  type="number"
                  min="0"
                  value={asset.purchaseCost}
                  onChange={(e) =>
                    updateAsset(
                      asset.id,
                      "purchaseCost",
                      Number(e.target.value)
                    )
                  }
                />
                <Input
                  label="Anschaffungsdatum"
                  type="date"
                  value={asset.acquiredAt}
                  onChange={(e) =>
                    updateAsset(asset.id, "acquiredAt", e.target.value)
                  }
                />
                <Input
                  label="Nutzungsdauer (Jahre)"
                  type="number"
                  min="0.01"
                  value={asset.usefulLifeYears}
                  onChange={(e) =>
                    updateAsset(
                      asset.id,
                      "usefulLifeYears",
                      Number(e.target.value)
                    )
                  }
                />
                <Input
                  label="Restwert (€)"
                  type="number"
                  min="0"
                  value={asset.residualValue}
                  onChange={(e) =>
                    updateAsset(
                      asset.id,
                      "residualValue",
                      Number(e.target.value)
                    )
                  }
                />
                <Input
                  label="Vergangene Nutzungsjahre"
                  hint={`Leer: aus Anschaffungsdatum ermittelt (${decimal(result.yearsUsed)} Jahre).`}
                  type="number"
                  min="0"
                  value={asset.usedYears ?? ""}
                  onChange={(e) =>
                    updateAsset(
                      asset.id,
                      "usedYears",
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                />
                <Input
                  label="Jährliche Wartung und Instandhaltung (€)"
                  type="number"
                  min="0"
                  value={asset.maintenance}
                  onChange={(e) =>
                    updateAsset(asset.id, "maintenance", Number(e.target.value))
                  }
                />
                <Select
                  label="Abschreibungsbasis"
                  value={asset.useReplacement ? "replacement" : "purchase"}
                  onChange={(e) =>
                    updateAsset(
                      asset.id,
                      "useReplacement",
                      e.target.value === "replacement"
                    )
                  }
                >
                  <option value="purchase">
                    Historischer Anschaffungswert
                  </option>
                  <option value="replacement">Wiederbeschaffungswert</option>
                </Select>
                {asset.useReplacement && (
                  <Input
                    label="Begründeter Wiederbeschaffungswert (€)"
                    type="number"
                    min="0"
                    value={asset.replacementCost}
                    onChange={(e) =>
                      updateAsset(
                        asset.id,
                        "replacementCost",
                        Number(e.target.value)
                      )
                    }
                  />
                )}
                <Select
                  label="Finanzierendes Darlehen"
                  value={asset.loanId || ""}
                  onChange={(e) =>
                    updateAsset(asset.id, "loanId", e.target.value || null)
                  }
                >
                  <option value="">Kein einzelnes Darlehen</option>
                  {config.setup.loans.map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      {loan.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-blue-200">
                  Abschreibung in diesem Jahr: {money(result.depreciation)} ·
                  Vermögenswert: {money(result.bookValue)} · durchschnittlich
                  gebundenes Kapital: {money(result.boundCapital)}
                </p>
                <Button
                  danger
                  onClick={() =>
                    change((c) => {
                      c.setup.assets = c.setup.assets.filter(
                        (item) => item.id !== asset.id
                      );
                    })
                  }
                >
                  Anlagegut entfernen
                </Button>
              </div>
            </div>
          );
        })}
      </Card>
      <Card
        title="Darlehen und Finanzierung"
        description="Tilgungen verändern die Restschuld; sie werden nicht als Kosten angesetzt."
        actions={
          <Button
            secondary
            onClick={() =>
              change((c) => {
                c.setup.loans.push(newLoan());
              })
            }
          >
            + Darlehen
          </Button>
        }
      >
        <Select
          label="Zinsansatz in der Kostenrechnung"
          value={config.setup.interestMode}
          onChange={(e) =>
            change((c) => {
              c.setup.interestMode = e.target.value;
            })
          }
        >
          <option value="imputed">
            Kalkulatorische Zinsen auf Anlagenkapital
          </option>
          <option value="financing">
            Darlehenszinsen als Finanzierungskosten
          </option>
          <option value="none">Kein Zinsansatz</option>
        </Select>
        <Notice>
          Es wird genau eine Zinsmethode gerechnet. Bei kalkulatorischen Zinsen
          bleiben Darlehenszinsen in der Finanzierungsübersicht; bei
          Finanzierungskosten werden keine zusätzlichen kalkulatorischen Zinsen
          angesetzt.
        </Notice>
        {config.setup.loans.map((loan) => (
          <div
            className="mt-4 grid gap-3 rounded-lg border border-gray-700 p-3 md:grid-cols-5"
            key={loan.id}
          >
            <Input
              label="Darlehen"
              value={loan.name}
              onChange={(e) => updateLoan(loan.id, "name", e.target.value)}
            />
            <Input
              label="Restschuld zu Jahresbeginn (€)"
              type="number"
              min="0"
              value={loan.balance}
              onChange={(e) =>
                updateLoan(loan.id, "balance", Number(e.target.value))
              }
            />
            <Input
              label="Darlehenszinssatz (%)"
              type="number"
              min="0"
              value={loan.interestRate}
              onChange={(e) =>
                updateLoan(loan.id, "interestRate", Number(e.target.value))
              }
            />
            <Input
              label="Geplante Jahrestilgung (€)"
              type="number"
              min="0"
              value={loan.repayment}
              onChange={(e) =>
                updateLoan(loan.id, "repayment", Number(e.target.value))
              }
            />
            <Button
              danger
              className="self-end"
              onClick={() =>
                change((c) => {
                  c.setup.loans = c.setup.loans.filter(
                    (item) => item.id !== loan.id
                  );
                  c.setup.assets.forEach((asset) => {
                    if (asset.loanId === loan.id) asset.loanId = null;
                  });
                })
              }
            >
              Entfernen
            </Button>
          </div>
        ))}
        <p className="mt-4 text-sm text-gray-400">
          Jährlicher Finanzierungszins auf die erfasste Restschuld:{" "}
          {money(calculation.financeInterest)}
        </p>
      </Card>
      <Card title="Vereinfachte Vermögensübersicht">
        <Table headers={["Position", "Wert"]}>
          {Object.entries({
            "Anlagen zum Jahresbeginn": calculation.balance.fixedAssets,
            Materiallager: calculation.balance.materialStock,
            "Bank / Kasse": calculation.balance.cash,
            "Weitere Vermögenswerte": calculation.balance.otherAssets,
            Verbindlichkeiten: -calculation.balance.liabilities,
            Eigenkapital: calculation.balance.equity
          }).map(([name, value]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{money(value)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
