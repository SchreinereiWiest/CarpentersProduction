import { newEasyRate } from '../../defaults/forms.defaults.js';

import { exportBab } from '../../utils/csvExport.js';
import { Button, Card, Input, Notice, Table } from '../../components/ui.jsx';
import { money } from '../../utils/format.js';
import { BabTable } from '../../components/babTable.jsx';

/** Zeigt den automatisch verteilten BAB oder direkte Easy-Sätze und ermöglicht den Export der Planrechnung. */
export function SetupBab({ config, change, calculation, year, dirty }) {
  return (
    <>
      {config.mode === "easy" ? (
        <Card
          title="Easy-Stundensätze"
          description="Direkt vorgegebene Selbstkosten je Stunde; ein BAB ist im Easy-Modus optional."
          actions={
            <Button
              secondary
              onClick={() =>
                change((c) => {
                  c.easyRates.push(newEasyRate());
                })
              }
            >
              + Stundensatz
            </Button>
          }
        >
          {config.easyRates.map((rate) => (
            <div
              key={rate.id}
              className="mb-4 grid gap-3 md:grid-cols-[2fr_1fr_auto]"
            >
              <Input
                label="Leistungsbereich"
                value={rate.name}
                onChange={(e) =>
                  change((c) => {
                    c.easyRates.find((item) => item.id === rate.id).name =
                      e.target.value;
                  })
                }
              />
              <Input
                label="Selbstkosten (€ / h)"
                type="number"
                min="0"
                value={rate.rate}
                onChange={(e) =>
                  change((c) => {
                    c.easyRates.find((item) => item.id === rate.id).rate =
                      Number(e.target.value);
                  })
                }
              />
              <Button
                danger
                className="self-end"
                onClick={() =>
                  change((c) => {
                    c.easyRates = c.easyRates.filter(
                      (item) => item.id !== rate.id
                    );
                  })
                }
              >
                Entfernen
              </Button>
            </div>
          ))}
        </Card>
      ) : (
        <>
          <Card
            title="Automatisch erzeugter Betriebsabrechnungsbogen"
            description="Alle Jahreskosten werden mit den erfassten Zuordnungen verteilt. Hilfskostenstellen werden anschließend auf die Hauptkostenstellen umgelegt."
            actions={
              <Button
                secondary
                onClick={() =>
                  exportBab(calculation, config, year, dirty)
                }
              >
                BAB als CSV exportieren
              </Button>
            }
          >
            <BabTable calculation={calculation} config={config} />
          </Card>
          <Card title="Umlagen nachvollziehen">
            <Table
              headers={["Kostenstelle", "Vor Umlage", "Umlage", "Nach Umlage"]}
            >
              {calculation.rates.map((center) => (
                <tr key={center.id}>
                  <td>{center.name}</td>
                  <td>{money(calculation.beforeTransfers[center.id])}</td>
                  <td>{money(calculation.transfers[center.id])}</td>
                  <td>{money(center.total)}</td>
                </tr>
              ))}
            </Table>
          </Card>
          {calculation.warnings.length > 0 && (
            <Notice warning>
              <ul className="list-inside list-disc">
                {calculation.warnings.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Notice>
          )}
        </>
      )}
      <Card title="Preisgrundlage">
        <Input
          label="Gewinnaufschlag auf Selbstkosten (%)"
          type="number"
          min="0"
          value={config.profitPercent}
          onChange={(e) =>
            change((c) => {
              c.profitPercent = Number(e.target.value);
            })
          }
        />
        <p className="mt-3 text-sm text-gray-400">
          Materialeinzelkosten werden zusätzlich zum Stundensatz kalkuliert,
          sofern die Kostenart nicht in den Stundensatz einbezogen wird.
        </p>
      </Card>
    </>
  );
}
