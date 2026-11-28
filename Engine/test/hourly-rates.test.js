import assert from "node:assert/strict";
import test from "node:test";
import { calculateHourlyRates } from "../src/management/calculation/hourlyRates.mjs";

test("verteilt Gemeinkosten und berechnet Maschinen- sowie Verkaufssatz getrennt", () => {
  const result = calculateHourlyRates({
    profitPercent: 10,
    overheadCosts: [{ id: "overhead", label: "Gemeinkosten", amount: 30000 }],
    activities: [
      {
        id: "cnc", name: "CNC", productiveHours: 1000,
        personnelCosts: 50000, otherDirectCosts: 5000,
        machineCosts: 20000, machineHours: 1000, machineUsagePercent: 50
      },
      {
        id: "assembly", name: "Zusammenbau", productiveHours: 500,
        personnelCosts: 25000, otherDirectCosts: 0,
        machineCosts: 0, machineHours: 0, machineUsagePercent: 0
      }
    ]
  });

  assert.equal(result.totalOverheadCosts, 30000);
  assert.equal(result.rates[0].allocatedOverhead, 20000);
  assert.equal(result.rates[0].baseHourlyRate, 75);
  assert.equal(result.rates[0].machineHourlyRate, 20);
  assert.equal(result.rates[0].hourlyRate, 85);
  assert.equal(result.rates[0].sellingRate, 93.5);
  assert.equal(result.rates[1].allocatedOverhead, 10000);
});
