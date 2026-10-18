import { newDistributionKey } from '../../defaults/forms.defaults.js';

import { Button, Card, Input, Notice, Select, Table } from '../../components/ui.jsx';
import { decimal } from '../../utils/format.js';

/** Erfasst direkte Zuordnungen, Verteilungsgrößen und eigene Schlüssel und steuert, welche Kostenarten in den Stundensatz eingehen. */
export function SetupDistribution({ config, change, calculation }) {
  return (
    <>
      <Notice>
        Direkte Kosten werden einer Kostenstelle zugeordnet. Die übrigen Kosten
        verteilt der BAB nach produktiven Stunden, Fläche, Verbrauch, Nutzung
        oder eigenen Gewichten. Maschinenkosten werden über die zugehörige
        Anlage übernommen.
      </Notice>
      <Card title="Kostenpositionen zuordnen">
        <Table
          headers={[
            "Kostenposition",
            "Direkte Zuordnung",
            "Schlüssel bei Umlage"
          ]}
        >
          {config.setup.annualCosts.map((cost) => (
            <tr key={cost.id}>
              <td>{cost.name}</td>
              <td>
                <Select
                  label={`${cost.name} · direkte Kostenstelle`}
                  value={cost.centerId || ""}
                  onChange={(e) =>
                    change((c) => {
                      c.setup.annualCosts.find(
                        (item) => item.id === cost.id
                      ).centerId = e.target.value || null;
                    })
                  }
                >
                  <option value="">
                    {cost.source === "staff"
                      ? "Plan aus Mitarbeiterverteilung"
                      : "Verteilungsschlüssel nutzen"}
                  </option>
                  {config.costCenters.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </Select>
              </td>
              <td>
                <Select
                  label={`${cost.name} · Verteilungsschlüssel`}
                  value={cost.keyId || ""}
                  disabled={Boolean(cost.centerId) || cost.source === "staff"}
                  onChange={(e) =>
                    change((c) => {
                      c.setup.annualCosts.find(
                        (item) => item.id === cost.id
                      ).keyId = e.target.value || null;
                    })
                  }
                >
                  <option value="">Kein Schlüssel</option>
                  {config.distributionKeys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.name}
                    </option>
                  ))}
                </Select>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card
        title="Bezugsgrößen je Kostenstelle"
        description="Stunden werden aus Schritt 04 übernommen. Messwerte und Nutzungsanteile können absolute Werte oder vergleichbare Gewichte sein."
      >
        <Table
          headers={[
            "Kostenstelle",
            "Produktive Stunden",
            "Fläche m²",
            "Energieverbrauch / Gewicht",
            "Fahrzeugnutzung / Gewicht",
            "Umlage bei Hilfskostenstelle"
          ]}
        >
          {calculation.rates.map((center) => (
            <tr key={center.id}>
              <td>{center.name}</td>
              <td>{decimal(center.hours)} h</td>
              {[
                ["area", "Fläche"],
                ["consumption", "Energieverbrauch"],
                ["usage", "Fahrzeugnutzung"]
              ].map(([key, label]) => (
                <td key={key}>
                  <Input
                    label={`${center.name} · ${label}`}
                    type="number"
                    min="0"
                    value={
                      config.costCenters.find((item) => item.id === center.id)[
                        key
                      ]
                    }
                    onChange={(e) =>
                      change((c) => {
                        c.costCenters.find((item) => item.id === center.id)[
                          key
                        ] = Number(e.target.value);
                      })
                    }
                  />
                </td>
              ))}
              <td>
                {center.kind === "support" && (
                  <Select
                    label={`${center.name} · Umlage`}
                    value={center.redistributionKey || ""}
                    onChange={(e) =>
                      change((c) => {
                        c.costCenters.find(
                          (item) => item.id === center.id
                        ).redistributionKey = e.target.value || null;
                      })
                    }
                  >
                    <option value="">Kein Schlüssel</option>
                    {config.distributionKeys.map((key) => (
                      <option key={key.id} value={key.id}>
                        {key.name}
                      </option>
                    ))}
                  </Select>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card
        title="Eigene Verteilungsschlüssel"
        actions={
          <Button
            secondary
            onClick={() =>
              change((c) => {
                c.distributionKeys.push(newDistributionKey());
              })
            }
          >
            + Verteilungsschlüssel
          </Button>
        }
      >
        {config.distributionKeys
          .filter(
            (key) =>
              key.metric === "custom" &&
              !["consumption", "usage"].includes(key.id)
          )
          .map((key) => (
            <div
              className="mb-4 rounded-lg border border-gray-700 p-4"
              key={key.id}
            >
              <Input
                label="Name des Verteilungsschlüssels"
                value={key.name}
                onChange={(e) =>
                  change((c) => {
                    c.distributionKeys.find((item) => item.id === key.id).name =
                      e.target.value;
                  })
                }
              />
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {config.costCenters.map((center) => (
                  <Input
                    label={`${key.name} · ${center.name}`}
                    type="number"
                    min="0"
                    value={key.weights[center.id] || 0}
                    key={center.id}
                    onChange={(e) =>
                      change((c) => {
                        c.distributionKeys.find(
                          (item) => item.id === key.id
                        ).weights[center.id] = Number(e.target.value);
                      })
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        <p className="text-sm text-gray-400">
          Gemeinkosten gehören entweder direkt zur Kostenstelle oder in eine
          Umlage. Positive Gewichte sind notwendig, damit Kosten vollständig
          verteilt werden können.
        </p>
      </Card>
      <Card
        title="Kostenarten im Verrechnungssatz"
        description="Gemeinkosten fließen gewöhnlich in den Stundensatz ein. Materialeinzelkosten werden zusätzlich zum Stundensatz kalkuliert."
      >
        <Table
          headers={["Kostenart", "Behandlung", "Im Stundensatz enthalten"]}
        >
          {config.costTypes.map((type) => (
            <tr key={type.id}>
              <td>{type.name}</td>
              <td>
                <Select
                  label={`${type.name} · Behandlung`}
                  value={type.treatment}
                  onChange={(e) =>
                    change((c) => {
                      c.costTypes.find(
                        (item) => item.id === type.id
                      ).treatment = e.target.value;
                    })
                  }
                >
                  <option value="overhead">Gemeinkosten</option>
                  <option value="direct">Einzelkosten</option>
                </Select>
              </td>
              <td>
                <input
                  aria-label={`${type.name} im Stundensatz`}
                  type="checkbox"
                  checked={type.hourly}
                  onChange={(e) =>
                    change((c) => {
                      c.costTypes.find((item) => item.id === type.id).hourly =
                        e.target.checked;
                    })
                  }
                />
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
