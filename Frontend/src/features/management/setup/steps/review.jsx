import { useState } from 'react';
import { useNavigate } from 'react-router';
import { setupChecks } from '@Engine/management/config/approval.mjs';
import { round } from '@Engine/management/utils/numbers.mjs';
import { Button, Card, Empty, Input, Notice, Select, Table } from '../../components/ui.jsx';
import { dateLabel, decimal, money } from '../../utils/format.js';

/** Prüft und simuliert den Entwurf, veröffentlicht eine gespeicherte Version und macht frühere Freigabesätze nachvollziehbar. */
export function SetupReview({
  config,
  calculation,
  dirty,
  busy,
  act,
  revision
}) {
  const [note, setNote] = useState("");
  const [quantities, setQuantities] = useState({});
  const [material, setMaterial] = useState(0);
  const [historicalVersion, setHistoricalVersion] = useState("");
  const historical = config.setup.approvals.find(
    (item) => String(item.version) === historicalVersion
  );
  const navigate = useNavigate();
  const errors = setupChecks(config, calculation);
  const rates =
    config.mode === "easy"
      ? config.easyRates.map((rate) => ({
          ...rate,
          fullRate: Number(rate.rate),
          sellingRate: round(
            Number(rate.rate) * (1 + Number(config.profitPercent) / 100)
          )
        }))
      : calculation.rates.filter((rate) => rate.kind !== "support");
  const simulatedCost = round(
    rates.reduce(
      (sum, rate) =>
        sum + Number(quantities[rate.id] || 0) * Number(rate.fullRate || 0),
      0
    ) + material
  );
  return (
    <>
      <Card
        title="Einrichtung prüfen"
        description="Eine Freigabe speichert die Eingaben und die berechneten Sätze als neue Version. Änderungen im Entwurf wirken erst nach erneuter Freigabe auf die veröffentlichte Planbasis."
      >
        {errors.length ? (
          <Notice warning>
            <ul className="list-inside list-disc">
              {errors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Notice>
        ) : (
          <Notice>
            Die benötigten Angaben sind vollständig. Das Betriebsmodell kann
            freigegeben werden.
          </Notice>
        )}
        {dirty && (
          <p className="mt-4 text-sm text-amber-300">
            Den Entwurf vor der Freigabe unten speichern.
          </p>
        )}
        <Table
          headers={["Bereich", "Selbstkosten / h", "Mit Gewinnaufschlag / h"]}
        >
          {rates.map((rate) => (
            <tr key={rate.id}>
              <td>{rate.name}</td>
              <td>{rate.fullRate === null ? "Fehlt" : money(rate.fullRate)}</td>
              <td>
                {rate.sellingRate === null ? "Fehlt" : money(rate.sellingRate)}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card
        title="Kalkulation simulieren"
        description="Stellenstunden und Material ergeben eine nachvollziehbare Preisvorschau ohne doppelte Maschinenkosten."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {rates.map((rate) => (
            <Input
              label={`${rate.name} · Simulationsstunden`}
              type="number"
              min="0"
              value={quantities[rate.id] || 0}
              key={rate.id}
              onChange={(e) =>
                setQuantities((values) => ({
                  ...values,
                  [rate.id]: Number(e.target.value)
                }))
              }
            />
          ))}
          <Input
            label="Materialeinzelkosten (€)"
            type="number"
            min="0"
            value={material}
            onChange={(e) => setMaterial(Number(e.target.value))}
          />
        </div>
        <p className="mt-5 text-sm">
          Selbstkosten: <strong>{money(simulatedCost)}</strong> · Preis mit{" "}
          {decimal(config.profitPercent)} % Aufschlag:{" "}
          <strong className="text-blue-300">
            {money(simulatedCost * (1 + Number(config.profitPercent) / 100))}
          </strong>
        </p>
      </Card>
      <Card title="Freigabe und Versionierung">
        <Input
          label="Versionsnotiz"
          placeholder="Zum Beispiel: Erstkalkulation oder neue CNC"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          className="mt-4"
          disabled={busy || dirty || errors.length > 0}
          onClick={async () => {
            if (
              await act(
                "post",
                "/setup/approve",
                { revision, note },
                "Kalkulation freigegeben."
              )
            )
              navigate("/Management");
          }}
        >
          Freigeben & Jahresansicht öffnen
        </Button>
        <div className="mt-5">
          <Table
            headers={["Version", "Freigabe", "Notiz", "Jährliche Plankosten"]}
          >
            {[...config.setup.approvals].reverse().map((approval) => (
              <tr key={approval.version}>
                <td>Version {approval.version}</td>
                <td>{dateLabel(approval.approvedAt)}</td>
                <td>{approval.note || "—"}</td>
                <td>{money(approval.totalCosts)}</td>
              </tr>
            ))}
          </Table>
          {!config.setup.approvals.length && (
            <Empty>Noch keine freigegebene Version.</Empty>
          )}
        </div>
        {config.setup.approvals.length > 0 && (
          <div className="mt-5">
            <Select
              label="Freigegebene Version ansehen"
              value={historicalVersion}
              onChange={(e) => setHistoricalVersion(e.target.value)}
            >
              <option value="">Version auswählen</option>
              {config.setup.approvals.map((item) => (
                <option key={item.version} value={item.version}>
                  Version {item.version} · {dateLabel(item.approvedAt)}
                </option>
              ))}
            </Select>
            {historical && (
              <div className="mt-3">
                <p className="mb-3 text-sm text-gray-400">
                  Gespeicherte Jahresbasis: {money(historical.totalCosts)}
                </p>
                <Table headers={["Bereich", "Gespeicherter Selbstkostensatz"]}>
                  {(historical.config.mode === "easy"
                    ? historical.config.easyRates.map((item) => ({
                        ...item,
                        fullRate: item.rate
                      }))
                    : historical.rates.filter((item) => item.kind !== "support")
                  ).map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>
                        {item.fullRate === null
                          ? "—"
                          : `${money(item.fullRate)} / h`}
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>
            )}
          </div>
        )}
      </Card>
    </>
  );
}
