import { ACTUAL_ASSET_FIELDS } from '../../../../../shared/management/defaults/validation.defaults.mjs';
import { ACTUAL_ASSET_INPUTS } from '../../../../../shared/management/defaults/catalog.defaults.mjs';
import { useState } from "react";
import { useManagement } from '../hooks/useManagement.js';
import { BabTable } from '../components/babTable.jsx';
import { Button, Card, Input, Notice, Table } from '../components/ui.jsx';
import { money } from '../utils/format.js';

/** Erfasst kumulierte Ist-Summen und vergleicht aktuelle Stellenkosten mit dem vollständigen Vorjahr; fehlende Daten bleiben gekennzeichnet. */
export default function ManagementOperatingCosts() {
  const { state, year, busy, saveConfig } = useManagement();
  const config = state.operationalConfig;
  const actual = state.operatingActual;
  const plan = state.operatingPlan;
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      config.setup.annualCosts.map((cost) => [cost.id, cost.actualAmount ?? ""])
    )
  );
  const [assetValues, setAssetValues] = useState(() =>
    Object.fromEntries(
      config.setup.assets.map((asset) => [
        asset.id,
        Object.fromEntries(
          ACTUAL_ASSET_FIELDS.map((field) => [field, asset[field] ?? ""])
        )
      ])
    )
  );
  /** Übernimmt ausschließlich kumulierte Ist-Beträge in den Entwurf; veröffentlichte Jahresplanwerte werden nicht verändert. */
  const saveActual = () => {
    const next = structuredClone(state.config);
    for (const cost of config.setup.annualCosts) {
      const entry = next.setup.annualCosts.find((item) => item.id === cost.id);
      if (entry)
        entry.actualAmount =
          values[cost.id] === "" ? null : Number(values[cost.id]);
      else
        next.setup.annualCosts.push({
          ...cost,
          actualAmount: values[cost.id] === "" ? null : Number(values[cost.id])
        });
    }
    for (const asset of config.setup.assets) {
      let entry = next.setup.assets.find((item) => item.id === asset.id);
      if (!entry) {
        entry = structuredClone(asset);
        next.setup.assets.push(entry);
      }
      for (const [field, value] of Object.entries(assetValues[asset.id]))
        entry[field] = value === "" ? null : Number(value);
    }
    return saveConfig(next);
  };
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">
          Kostenstellen & Vorjahresvergleich
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Jahresplan, bisher erfasste Ist-Kosten und Kostenentwicklung im
          Geschäftsjahr {year}.
        </p>
      </div>
      <Notice>
        Bis zur späteren DATEV-Anbindung werden kumulierte Ist-Summen manuell
        erfasst. Ein Ist-Wert ersetzt den bisherigen Ist-Wert derselben
        Position; er wird nicht zum Jahresplan addiert. Nur Abschreibungen und
        der gewählte Zinsansatz werden rechnerisch zeitanteilig berücksichtigt.
      </Notice>
      <Card
        title="Kumulierte Ist-Betriebskosten"
        description="Leer bedeutet: noch keine Daten. Null bedeutet: geprüft, bisher keine Kosten."
        actions={
          <Button disabled={busy} onClick={saveActual}>
            Ist-Summen speichern
          </Button>
        }
      >
        <Table headers={["Kostenposition", "Jahresplan", "Ist bis heute (€)"]}>
          {config.setup.annualCosts.map((cost) => (
            <tr key={cost.id}>
              <td>{cost.name}</td>
              <td>
                {money(
                  cost.source === "staff"
                    ? config.setup.staff.reduce(
                        (sum, staff) => sum + Number(staff.annualCost),
                        0
                      )
                    : cost.amount
                )}
              </td>
              <td>
                <Input
                  label={`${cost.name} · Ist-Summe (€)`}
                  type="number"
                  min="0"
                  value={values[cost.id]}
                  disabled={busy}
                  onChange={(e) =>
                    setValues((previous) => ({
                      ...previous,
                      [cost.id]: e.target.value
                    }))
                  }
                />
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      {config.setup.assets.length > 0 && (
        <Card
          title="Kumulierte Ist-Kosten einzelner Anlagen"
          description="Nur die direkt zugehörigen Kosten erfassen; dieselben Beträge nicht zusätzlich in den Betriebskosten eintragen."
        >
          <Table
            headers={[
              "Anlage",
              "Wartung / Reparatur",
              "Energie",
              "Raumkosten",
              "Sonstige Maschinenkosten"
            ]}
          >
            {config.setup.assets.map((asset) => (
              <tr key={asset.id}>
                <td>{asset.name}</td>
                {ACTUAL_ASSET_INPUTS.map(([field, name]) => (
                  <td key={field}>
                    <Input
                      label={`${asset.name} · ${name} · Ist (€)`}
                      type="number"
                      min="0"
                      disabled={busy}
                      value={assetValues[asset.id][field]}
                      onChange={(e) =>
                        setAssetValues((previous) => ({
                          ...previous,
                          [asset.id]: {
                            ...previous[asset.id],
                            [field]: e.target.value
                          }
                        }))
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </Table>
          <Button className="mt-4" disabled={busy} onClick={saveActual}>
            Ist-Anlagenkosten speichern
          </Button>
        </Card>
      )}
      {actual.missingActual.length > 0 && (
        <Notice warning>
          Unvollständige Ist-Kosten: {actual.missingActual.join(", ")}.
        </Notice>
      )}
      <Card
        title="Kostenstellen im Vergleich"
        description="Aktuelles Ist: bisher erfasste Kosten. Vorjahres-Ist: gesamtes Vorjahr. Die unterschiedlichen Zeiträume bei der Bewertung beachten; fehlende Daten werden angezeigt."
      >
        <Table
          headers={[
            "Kostenstelle",
            "Plan aktuelles Jahr",
            "Plan Vorjahr",
            "Ist aktuelles Jahr",
            "Ist gesamtes Vorjahr",
            "Ist-Differenz"
          ]}
        >
          {plan.rates.map((rate) => {
            const current = actual.rates.find((item) => item.id === rate.id);
            const previousPlan = state.previous?.plan.rates.find(
              (item) => item.id === rate.id || item.name === rate.name
            );
            const previousActual = state.previous?.actual.rates.find(
              (item) => item.id === rate.id || item.name === rate.name
            );
            return (
              <tr key={rate.id}>
                <td>{rate.name}</td>
                <td>{money(rate.total)}</td>
                <td>
                  {previousPlan ? money(previousPlan.total) : "Keine Daten"}
                </td>
                <td>{money(current?.total || 0)}</td>
                <td>
                  {previousActual ? money(previousActual.total) : "Keine Daten"}
                </td>
                <td>
                  {previousActual
                    ? money((current?.total || 0) - previousActual.total)
                    : "—"}
                </td>
              </tr>
            );
          })}
        </Table>
        {state.previous?.actual.missingActual.length > 0 && (
          <p className="mt-3 text-sm text-amber-300">
            Auch die Vorjahres-Ist-Kosten sind noch unvollständig.
          </p>
        )}
      </Card>
      <Card title="BAB mit bisherigen Ist-Kosten">
        <BabTable calculation={actual} config={config} />
      </Card>
    </div>
  );
}
