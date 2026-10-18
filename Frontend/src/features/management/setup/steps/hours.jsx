import { STAFF_CAPACITY_FIELDS } from '@Engine/management/defaults/catalog.defaults.mjs';
import { productiveHours } from '@Engine/management/calculation/hours.mjs';
import { newStaff } from '../../defaults/forms.defaults.js';
import { Button, Card, Empty, Input, Notice, Select, Table } from '../../components/ui.jsx';
import { decimal } from '../../utils/format.js';

/** Ordnet Tätigkeiten zu Kostenstellen und plant Personalstunden; vorhandene Kalenderberichte bleiben eine getrennte Ist-Basis. */
export function SetupHours({
  config,
  change,
  calculation,
  references,
  activities,
  companySettings,
  year
}) {
  /** Ändert ein gezielt benanntes Eingabefeld der aktuellen Position im Einrichtungsentwurf. */
  const update = (id, key, value) =>
    change((c) => {
      c.setup.staff.find((item) => item.id === id)[key] = value;
    });
  return (
    <>
      <Notice>
        Mehrere Tätigkeiten können eine Kostenstelle bilden, etwa Zuschnitt und
        Bekantung. Die manuellen Jahresstunden bilden Ihre Planbasis;
        abgeschlossene Zeitberichte aus „Meine Arbeitszeit“ werden zusätzlich
        als Ist-Stunden ausgewertet.
      </Notice>
      <Card
        title="Tätigkeiten zu Betriebsbereichen bündeln"
        description="Jede Tätigkeit genau einer Kostenstelle zuordnen. Diese Zuordnung gilt auch für zukünftige Kalenderberichte."
      >
        {config.costCenters.map((center) => (
          <div
            key={center.id}
            className="mb-4 rounded-lg border border-gray-700 p-4"
          >
            <h3 className="mb-3 font-medium">{center.name}</h3>
            <div className="flex flex-wrap gap-4">
              {activities.map((activity) => {
                const owner = config.costCenters.find(
                  (item) =>
                    item.id !== center.id &&
                    item.activityIds.includes(activity.id)
                );
                return (
                  <label
                    key={activity.id}
                    className={`flex items-center gap-2 text-sm ${owner ? "text-gray-500" : "text-gray-300"}`}
                    title={owner ? `Bereits ${owner.name} zugeordnet` : ""}
                  >
                    <input
                      type="checkbox"
                      checked={center.activityIds.includes(activity.id)}
                      disabled={Boolean(owner)}
                      onChange={(e) =>
                        change((c) => {
                          const item = c.costCenters.find(
                            (item) => item.id === center.id
                          );
                          item.activityIds = e.target.checked
                            ? [...item.activityIds, activity.id]
                            : item.activityIds.filter(
                                (id) => id !== activity.id
                              );
                        })
                      }
                    />
                    {activity.label}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        {!config.costCenters.length && (
          <Empty>In Schritt 01 zunächst Betriebsbereiche anlegen.</Empty>
        )}
      </Card>
      <Card
        title="Mitarbeiter und produktive Jahresstunden"
        actions={
          <div className="flex gap-2">
            <Button
              secondary
              onClick={() =>
                change((c) => {
                  for (const employee of references.employees || [])
                    if (
                      !c.setup.staff.some(
                        (staff) => staff.userId === employee.id
                      )
                    )
                      c.setup.staff.push(
                        newStaff(employee, c.costCenters, {
                          year,
                          startMonth: c.startMonth,
                          settings: companySettings
                        })
                      );
                })
              }
            >
              Vorhandenes Personal übernehmen
            </Button>
            <Button
              secondary
              onClick={() =>
                change((c) => {
                  c.setup.staff.push(
                    newStaff(null, c.costCenters, {
                      year,
                      startMonth: c.startMonth,
                      settings: companySettings
                    })
                  );
                })
              }
            >
              + Mitarbeiter manuell
            </Button>
          </div>
        }
      >
        <Select
          label="Stundenbasis für die Kalkulation"
          value={config.setup.hoursMode}
          onChange={(e) =>
            change((c) => {
              c.setup.hoursMode = e.target.value;
            })
          }
        >
          <option value="manual">Geplante produktive Jahresstunden</option>
          <option value="recorded">Vorhandene Zeitberichte verwenden</option>
        </Select>
        {config.setup.hoursMode === "recorded" && (
          <Notice warning>
            Erfasste Stunden werden ohne Hochrechnung übernommen. Solange keine
            Zeitberichte vorhanden sind, wird die manuelle Planbasis verwendet.
            Für einen vollständigen Jahresstundensatz muss der erfasste Zeitraum
            ein vollständiges Jahr abdecken.
          </Notice>
        )}
        {config.setup.staff.map((staff) => (
          <div
            key={staff.id}
            className="mt-4 space-y-4 rounded-xl border border-gray-700 p-4"
          >
            <div className="grid gap-3 md:grid-cols-4">
              <Input
                label="Mitarbeitername"
                value={staff.name}
                onChange={(e) => update(staff.id, "name", e.target.value)}
              />
              <Select
                label="Verknüpftes Personalkonto"
                value={staff.userId || ""}
                onChange={(e) =>
                  update(staff.id, "userId", e.target.value || null)
                }
              >
                <option value="">Manueller Mitarbeiter</option>
                {(references.employees || []).map((employee) => (
                  <option value={employee.id} key={employee.id}>
                    {[employee.firstName, employee.lastName]
                      .filter(Boolean)
                      .join(" ") || employee.login}
                  </option>
                ))}
              </Select>
              <Input
                label="Personalkosten inkl. Arbeitgeberanteile (€ / Jahr)"
                type="number"
                min="0"
                value={staff.annualCost}
                onChange={(e) =>
                  update(staff.id, "annualCost", Number(e.target.value))
                }
              />
              <Input
                label="Vollzeitäquivalent"
                type="number"
                min="0"
                step="0.1"
                value={staff.fte}
                onChange={(e) =>
                  update(staff.id, "fte", Number(e.target.value))
                }
              />
              <Input
                label="Produktive Jahresstunden manuell"
                type="number"
                min="0"
                hint="Leer: aus Arbeitstagen und Produktivität berechnen."
                value={staff.annualHours ?? ""}
                onChange={(e) =>
                  update(
                    staff.id,
                    "annualHours",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
              />
            </div>
            <details className="rounded-lg border border-gray-700 p-3">
              <summary className="cursor-pointer text-sm text-blue-300">
                Jahresstunden aus Arbeitszeit und Ausfällen ermitteln
              </summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {STAFF_CAPACITY_FIELDS.map(([key, label]) => (
                  <Input
                    label={label}
                    type="number"
                    min="0"
                    key={key}
                    value={staff[key]}
                    onChange={(e) =>
                      update(staff.id, key, Number(e.target.value))
                    }
                  />
                ))}
              </div>
            </details>
            <p className="text-sm text-blue-200">
              {decimal(productiveHours(staff))} produktive Stunden / Jahr · auf
              Tätigkeitsbereiche verteilen:
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {config.costCenters.map((center) => (
                <Input
                  key={center.id}
                  label={`${staff.name} · ${center.name} (%)`}
                  hint={`${center.activityIds.map((id) => activities.find((item) => item.id === id)?.label || id).join(", ")} · ${decimal((productiveHours(staff) * (staff.allocations.find((item) => item.centerId === center.id)?.percent || 0)) / 100)} h`}
                  type="number"
                  min="0"
                  max="100"
                  value={
                    staff.allocations.find(
                      (item) => item.centerId === center.id
                    )?.percent || 0
                  }
                  onChange={(e) =>
                    change((c) => {
                      const allocations = c.setup.staff.find(
                        (item) => item.id === staff.id
                      ).allocations;
                      const existing = allocations.find(
                        (item) => item.centerId === center.id
                      );
                      if (existing) existing.percent = Number(e.target.value);
                      else
                        allocations.push({
                          centerId: center.id,
                          percent: Number(e.target.value)
                        });
                    })
                  }
                />
              ))}
            </div>
            <div className="flex justify-between gap-3">
              <p
                className={`text-sm ${Math.abs(staff.allocations.reduce((sum, item) => sum + Number(item.percent), 0) - 100) < 0.01 ? "text-emerald-300" : "text-amber-300"}`}
              >
                Verteilt:{" "}
                {decimal(
                  staff.allocations.reduce(
                    (sum, item) => sum + Number(item.percent),
                    0
                  )
                )}{" "}
                % von 100 %
              </p>
              <Button
                danger
                onClick={() =>
                  change((c) => {
                    c.setup.staff = c.setup.staff.filter(
                      (item) => item.id !== staff.id
                    );
                  })
                }
              >
                Mitarbeiter entfernen
              </Button>
            </div>
          </div>
        ))}
        {!config.setup.staff.length && (
          <Empty>
            Personal übernehmen oder manuell produktive Stunden erfassen.
          </Empty>
        )}
      </Card>
      <Card
        title="Stunden je Kostenstelle"
        description="Plan und Ist werden getrennt dargestellt; eine leere Ist-Spalte benötigt keine erfundenen Zeitberichte."
      >
        <Table
          headers={[
            "Kostenstelle",
            "Planstunden / Jahr",
            "Erfasste Ist-Stunden",
            "Aktuelle Kalkulationsbasis"
          ]}
        >
          {calculation.rates
            .filter((center) => center.kind !== "support")
            .map((center) => (
              <tr key={center.id}>
                <td>{center.name}</td>
                <td>{decimal(calculation.manualHours[center.id])} h</td>
                <td>{decimal(calculation.actualHours.values[center.id])} h</td>
                <td>{decimal(center.hours)} h</td>
              </tr>
            ))}
        </Table>
        {calculation.actualHours.unmapped > 0 && (
          <Notice warning>
            {decimal(calculation.actualHours.unmapped)} erfasste Stunden sind
            noch keinem Tätigkeitsbereich zugeordnet.
          </Notice>
        )}
      </Card>
    </>
  );
}
