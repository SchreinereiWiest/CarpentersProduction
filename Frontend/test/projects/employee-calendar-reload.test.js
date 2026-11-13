import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheMocks = vi.hoisted(() => ({
    getGlobalFile: vi.fn()
}));

vi.mock("../../src/shared/cache/global-cache.js", () => ({
    getGlobalFile: cacheMocks.getGlobalFile
}));

vi.mock("../../src/shared/api/file-api.js", () => ({
    downloadFile: vi.fn()
}));

import { createWeek } from "../../src/features/employees/calendar/createCalendar.js";
import { loadWeek } from "../../src/features/employees/calendar/loadCalendar.js";

const calendar = () => ({
    weekOffset: 0,
    today: "2026-10-20",
    days: [
        { id: 0, label: "Montag" },
        { id: 1, label: "Dienstag" },
        { id: 2, label: "Mittwoch" },
        { id: 3, label: "Donnerstag" },
        { id: 4, label: "Freitag" }
    ],
    blocks: [{ id: 0, start: "07:00", end: "12:00", duration: 300 }]
});

describe("Mitarbeiterkalender beim Neuladen", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 9, 20, 12));
    });

    it("erzeugt lokale Wochentage ohne UTC-Verschiebung", () => {
        const week = createWeek(calendar(), 0);

        expect(week.map(day => day.date)).toEqual([
            "2026-10-19",
            "2026-10-20",
            "2026-10-21",
            "2026-10-22",
            "2026-10-23"
        ]);
    });

    it("lädt bisher unter Sonntag gespeicherte Wochen und korrigiert ihre Datumswerte", async () => {
        const storedWeek = createWeek(calendar(), 0).map((day, index) => ({
            ...day,
            date: `2026-10-${String(18 + index).padStart(2, "0")}`,
            blocks: day.blocks.map(block => ({
                ...block,
                slots: block.slots.map(slot => ({
                    ...slot,
                    date: `2026-10-${String(18 + index).padStart(2, "0")}`
                }))
            }))
        }));
        storedWeek[0].blocks[0].slots = [{
            id: "entry-1",
            free: false,
            date: "2026-10-18",
            duration: 60
        }];

        cacheMocks.getGlobalFile
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(storedWeek);

        const result = await loadWeek({ id: "user-1" }, calendar(), 0);

        expect(cacheMocks.getGlobalFile).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ file: "weekData:user-1:2026-10-19" })
        );
        expect(cacheMocks.getGlobalFile).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ file: "weekData:user-1:2026-10-18" })
        );
        expect(result.weekData[0].date).toBe("2026-10-19");
        expect(result.weekData[0].blocks[0].slots[0]).toEqual(
            expect.objectContaining({ id: "entry-1", date: "2026-10-19" })
        );
    });
});
