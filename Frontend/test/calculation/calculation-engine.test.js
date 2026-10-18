import { describe, expect, it } from "vitest";
import {
  aggregateTimeEntries,
  calculateCabinetHourEstimate,
  calculateFull,
  calculateQuick,
  purchasingMaterialCost,
  summarizeCabinets
} from "@Engine/calculation/calculation.mjs";
import { estimateProjectHours } from "@Engine/calculation/estimation.mjs";
import {
  buildCalculationSnapshot,
  summarizePartList
} from "@Engine/calculation/snapshots.mjs";
import { combineManagementHourlyRates } from "@Engine/calculation/managementRates.mjs";

describe("project calculation engine", () => {
  it("calculates discounts with the classical backwards calculation", () => {
    expect(calculateQuick({
      materialCost: 1000,
      materialSurchargePercent: 10,
      hours: 10,
      hourlyRate: 60,
      cashDiscountPercent: 2,
      customerDiscountPercent: 5,
      vatPercent: 19
    })).toMatchObject({
      materialCosts: 1100,
      laborCosts: 600,
      cashSellingPrice: 1700,
      cashDiscountAmount: 34.69,
      targetSellingPrice: 1734.69,
      customerDiscountAmount: 91.3,
      netSellingPrice: 1825.99,
      grossSellingPrice: 2172.93
    });
  });

  it("calculates full costs per cost center", () => {
    expect(calculateFull({
      materialCost: 800,
      materialDirectCosts: 200,
      costCenters: [
        { id: "workshop", name: "Werkstatt", hours: 5, hourlyRate: 80 },
        { id: "assembly", name: "Montage", hours: 2, hourlyRate: 70 }
      ],
      administrationOverheadPercent: 10
    })).toMatchObject({
      materialCosts: 1000,
      productionLaborCosts: 540,
      productionCosts: 1540,
      administrationOverheadAmount: 154,
      manufacturingCosts: 1694,
      grossSellingPrice: 2015.86
    });
  });

  it("reads purchasing totals and cabinet complexity", () => {
    expect(purchasingMaterialCost({ items: [
      { quantity: 2, netPrice: 12.5, released: false, purchased: false },
      { quantity: 3, netPrice: 10, released: true, purchased: false },
      { quantity: 1, netPrice: 5, released: true, purchased: true },
      { quantity: 3, netPrice: null, released: false, purchased: false }
    ] })).toBe(60);
    expect(summarizeCabinets([{
      id: "one", name: "Schrank", quantity: 2, width: 600, height: 800, depth: 500,
      sections: [{ children: [{ functionConfig: [{ type: "shelf" }] }] }],
      fronts: [{ id: "front" }]
    }])).toMatchObject({ cabinetTypes: 1, cabinetCount: 2, sections: 4, fronts: 2, functions: 2 });
  });

  it("totals cabinet estimates by quantity and cost center", () => {
    expect(calculateCabinetHourEstimate({
      rows: [
        { id: "cabinet-a", name: "Korpus A", quantity: 2 },
        { id: "cabinet-b", name: "Korpus B", quantity: 1 }
      ]
    }, {
      "cabinet-a": { shop: 1.5, assembly: 0.5 },
      "cabinet-b": { shop: 2, assembly: 3 }
    }, [
      { id: "shop", name: "Werkstatt" },
      { id: "assembly", name: "Montage" }
    ])).toMatchObject({
      rows: [
        { id: "cabinet-a", hours: 4 },
        { id: "cabinet-b", hours: 5 }
      ],
      totalsByCenter: [
        { id: "shop", name: "Werkstatt", hours: 5 },
        { id: "assembly", name: "Montage", hours: 4 }
      ],
      totalHours: 9
    });
  });

  it("combines full hourly rates using the mean employee allocations", () => {
    expect(combineManagementHourlyRates({
      costCenters: [
        { id: "shop", name: "Werkstatt", kind: "production", hourlyRate: 50, hours: 1000 },
        { id: "assembly", name: "Montage", kind: "production", hourlyRate: 100, hours: 200 },
        { id: "office", name: "Verwaltung", kind: "support", hourlyRate: 200, hours: 200 }
      ],
      staff: [
        { allocations: [{ centerId: "shop", percent: 60 }, { centerId: "assembly", percent: 40 }] },
        { allocations: [{ centerId: "shop", percent: 20 }, { centerId: "assembly", percent: 80 }] }
      ]
    })).toMatchObject({
      hourlyRate: 80,
      source: "staff-allocation",
      staffCount: 2,
      costCenters: [
        { id: "shop", averageAllocationPercent: 40, rateWeightPercent: 40 },
        { id: "assembly", averageAllocationPercent: 60, rateWeightPercent: 60 }
      ]
    });
  });

  it("maps recorded activities to management cost centers", () => {
    expect(aggregateTimeEntries([
      { workType: "cutting", duration: 90 },
      { workType: "unknown", duration: 30 }
    ], [{ id: "shop", name: "Werkstatt", activityIds: ["cutting"] }])).toEqual({
      rows: [{ id: "shop", name: "Werkstatt", minutes: 90, hours: 1.5 }],
      totalHours: 2,
      unmappedHours: 0.5
    });
  });

  it("estimates hours from similar historical projects", () => {
    const result = estimateProjectHours({
      project: { title: "Einbauschrank Flur", projectType: "cabinet" },
      cabinets: [{ name: "Korpus", quantity: 2, width: 600, height: 2000, depth: 550 }],
      costCenters: [{ id: "shop", name: "Werkstatt", activityIds: ["cutting"] }],
      candidates: [{
        id: "past",
        title: "Einbauschrank Flur alt",
        projectType: "cabinet",
        cabinets: [{ name: "Korpus", quantity: 2, width: 600, height: 2000, depth: 550 }],
        hoursByActivity: { cutting: 12 },
        totalHours: 12
      }]
    });
    expect(result.totalHours).toBe(12);
    expect(result.hoursByCenter[0].hours).toBe(12);
    expect(result.matches[0].score).toBeGreaterThan(80);
  });

  it("builds a compact approved calculation snapshot with object references", () => {
    const snapshot = buildCalculationSnapshot({
      project: { title: "Flurschrank", projectNumber: "P-12", projectType: "cabinet" },
      calculation: {
        preMode: "full",
        full: { costCenters: [{ id: "shop", name: "Werkstatt", hours: 8, hourlyRate: 60 }] },
        post: { costCenters: [{ id: "shop", name: "Werkstatt", hours: 10, hourlyRate: 62 }] },
        results: { post: { materialBase: 500 } }
      },
      cabinets: [{ id: "cab-1", name: "Schrank", quantity: 2, width: 600, height: 2000, depth: 500 }],
      partList: [{ Children: [{ MID: "oak", L: 1000, B: 500, Anzahl: 2 }] }],
      objectReferences: { cabinet: { objectKey: "tenant/project/2-cabinet.json" } }
    });

    expect(snapshot).toMatchObject({
      projectTitle: "Flurschrank",
      plannedHours: 8,
      actualHours: 10,
      varianceHours: 2,
      materialCost: 500,
      cabinetCount: 2,
      listSummary: { partCount: 2, materialCount: 1 },
      objectReferences: { cabinet: { objectKey: "tenant/project/2-cabinet.json" } }
    });
    expect(snapshot.cabinetSummary).not.toHaveProperty("rows");
    expect(summarizePartList([{ PID: "one", Anzahl: 3, MID: "board", L: 100, B: 200 }])).toMatchObject({ partCount: 3, materialIds: ["board"] });
  });
});
