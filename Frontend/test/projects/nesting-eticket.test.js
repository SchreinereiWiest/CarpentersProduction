import { describe, expect, it } from "vitest";

import { createNestingEticketData } from "../../src/features/projects/nesting/eticketData.js";

describe("Nesting-Eticket", () => {
  it("führt die PID vom Partlist-Bauteil bis zum physischen Nesting-Teil fort", () => {
    const ticket = createNestingEticketData({
      projectId: "project-1",
      project: { title: "Empfang" },
      customer: { companyName: "Muster GmbH" },
      productionPath: "1d",
      plate: {
        id: 17,
        originalWidth: 560,
        originalHeight: 720,
        thickness: 19,
        material: "W980",
        original: {
          PID: "000042",
          Objektname: "Seite links",
          L: 720,
          B: 560,
          T: 19,
          MID: "W980",
          EBID: "ABS-2",
          CNC: { operations: [{ type: "BO", x: 32, y: 37 }] }
        }
      }
    });

    expect(ticket.pid).toBe("000042");
    expect(ticket.instanceId).toBe("17");
    expect(ticket.cncProgram).toBe("000042");
    expect(ticket.productionPath).toBe("1d");
    expect(ticket.code).toContain("pid=000042");
    expect(ticket.edges).toBe("U: ABS-2");
  });
});
