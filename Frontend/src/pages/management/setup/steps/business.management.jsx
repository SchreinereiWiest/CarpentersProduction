import { ACTUAL_ASSET_FIELDS } from '../../../../../../shared/management/defaults/validation.defaults.mjs';
import { newCenter } from '../../defaults/forms.defaults.js';
import { fiscalRange } from '../../../../../../shared/management/utils/dates.mjs';

import { suggestedCenters } from '../../defaults/forms.defaults.js';
import { Button, Card, Empty, Input, Notice, Select } from '../../components/ui.jsx';

/** Erfasst Zeitraum und Betriebsstruktur; Vorschläge und Vorjahresübernahme verändern ausschließlich den Einrichtungsentwurf. */
export function SetupBusiness({ config, change, activities, year, previous }) {
  const range = fiscalRange(year, config.startMonth);
  return (
    <>
      <Card
        title="Betrieb und Zeitraum"
        description="Eine gemeinsame Jahresbasis für alle Kosten, Stunden und Kalkulationssätze."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Betriebsname"
            value={config.setup.companyName}
            onChange={(e) =>
              change((c) => {
                c.setup.companyName = e.target.value;
              })
            }
          />
          <Select
            label="Beginn des Geschäftsjahrs"
            value={config.startMonth}
            onChange={(e) =>
              change((c) => {
                c.startMonth = Number(e.target.value);
              })
            }
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option value={i + 1} key={i}>
                {new Intl.DateTimeFormat("de-DE", { month: "long" }).format(
                  new Date(2026, i, 1)
                )}
              </option>
            ))}
          </Select>
          <Select
            label="Umfang der Einrichtung"
            value={config.mode}
            onChange={(e) =>
              change((c) => {
                c.mode = e.target.value;
              })
            }
          >
            <option value="full">Vollkosten automatisch ermitteln</option>
            <option value="easy">Easy: Stundensätze direkt eingeben</option>
          </Select>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          Abrechnungszeitraum: {range.start} bis {range.end}
        </p>
        {previous && (
          <Button
            secondary
            className="mt-4"
            onClick={() =>
              change((c) => {
                const name = c.setup.companyName;
                const approvals = c.setup.approvals;
                const inherited = structuredClone(previous.config);
                inherited.setup.approvals = approvals;
                inherited.setup.companyName =
                  name || inherited.setup.companyName;
                inherited.setup.annualCosts.forEach((cost) => {
                  cost.actualAmount = null;
                });
                inherited.setup.assets.forEach((asset) => {
                  for (const field of ACTUAL_ASSET_FIELDS)
                    asset[field] = null;
                  if (asset.usedYears !== null && asset.usedYears !== undefined)
                    asset.usedYears = Number(asset.usedYears) + 1;
                });
                inherited.openingCash = 0;
                inherited.openingOtherAssets = 0;
                inherited.openingOtherLiabilities = 0;
                Object.assign(c, inherited);
              })
            }
          >
            Vorjahresstruktur übernehmen
          </Button>
        )}
      </Card>
      {config.mode === "easy" ? (
        <Notice>
          Im Easy-Modus genügt ein Stundensatz in Schritt 07. Die weiteren
          Eingaben sind optional; anschließend in Schritt 08 freigeben.
        </Notice>
      ) : (
        <Notice>
          Die vorgeschlagenen Bereiche fassen Zuschnitt und Bekantung zusammen.
          Eigene Tätigkeiten lassen sich in Schritt 04 gemeinsam einem Bereich
          zuordnen.
        </Notice>
      )}
      <Card
        title="Betriebsbereiche und Kostenstellen"
        actions={
          <div className="flex gap-2">
            <Button
              secondary
              onClick={() =>
                change((c) => {
                  for (const center of suggestedCenters(activities))
                    if (!c.costCenters.some((item) => item.id === center.id))
                      c.costCenters.push(center);
                })
              }
            >
              Betriebsbereiche vorschlagen
            </Button>
            <Button
              secondary
              onClick={() =>
                change((c) => {
                  c.costCenters.push(newCenter());
                })
              }
            >
              + Kostenstelle
            </Button>
          </div>
        }
      >
        {!config.costCenters.length && (
          <Empty>
            Kostenstellen vorschlagen lassen oder einen eigenen Bereich anlegen.
          </Empty>
        )}
        {config.costCenters.map((center) => (
          <div
            className="mb-3 grid gap-3 rounded-lg border border-gray-700 p-3 md:grid-cols-[2fr_1fr_1fr_auto]"
            key={center.id}
          >
            <Input
              label="Kostenstelle"
              aria-label={`Kostenstelle ${center.name}`}
              value={center.name}
              onChange={(e) =>
                change((c) => {
                  c.costCenters.find((item) => item.id === center.id).name =
                    e.target.value;
                })
              }
            />
            <Select
              label="Bereichstyp"
              value={center.kind}
              onChange={(e) =>
                change((c) => {
                  c.costCenters.find((item) => item.id === center.id).kind =
                    e.target.value;
                })
              }
            >
              <option value="production">Fertigung / Leistung</option>
              <option value="machine">Maschinenbereich</option>
              <option value="support">Hilfskostenstelle / Verwaltung</option>
            </Select>
            <Input
              label="Genutzte Fläche (m²)"
              type="number"
              min="0"
              value={center.area}
              onChange={(e) =>
                change((c) => {
                  c.costCenters.find((item) => item.id === center.id).area =
                    Number(e.target.value);
                })
              }
            />
            <Button
              danger
              className="self-end"
              onClick={() =>
                change((c) => {
                  c.costCenters = c.costCenters.filter(
                    (item) => item.id !== center.id
                  );
                  c.setup.staff.forEach((staff) => {
                    staff.allocations = staff.allocations.filter(
                      (item) => item.centerId !== center.id
                    );
                  });
                  [
                    ...c.setup.assets,
                    ...c.setup.loans,
                    ...c.setup.annualCosts
                  ].forEach((item) => {
                    if (item.centerId === center.id) item.centerId = null;
                  });
                  c.distributionKeys.forEach((key) => {
                    delete key.weights[center.id];
                  });

                })
              }
            >
              Entfernen
            </Button>
          </div>
        ))}
      </Card>
    </>
  );
}
