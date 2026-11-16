import { beforeEach, describe, expect, it, vi } from "vitest";

const { autoTableMock } = vi.hoisted(() => ({ autoTableMock: vi.fn() }));

vi.mock("jspdf-autotable", () => ({ default: autoTableMock }));

import { appendPartsListPDF } from "../../src/features/projects/part-list/createPDF.js";

describe("Teilelisten-PDF-Layout", () => {
  beforeEach(() => autoTableMock.mockClear());

  it("hält auf Folgeseiten einen größeren oberen Tabellenrand ein", () => {
    const doc = {
      setFontSize: vi.fn(),
      setFont: vi.fn(),
      setTextColor: vi.fn(),
      text: vi.fn()
    };

    appendPartsListPDF(doc, []);

    expect(autoTableMock).toHaveBeenCalledTimes(1);
    expect(autoTableMock.mock.calls[0][1]).toMatchObject({
      startY: 27,
      margin: { top: 20, left: 12, right: 12, bottom: 14 }
    });
  });
});
