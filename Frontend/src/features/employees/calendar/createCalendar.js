import { createId, formatLocalDate, getCalendarWeek } from "./helper.js";
import { scheduledWorkBlocksForDate, specialWorkRuleForDate } from "../../../shared/settings/company-settings.js";

    export function createCalendarEntry(timeEntry, block, dayId, slotId) {

        const started = new Date(timeEntry.startedAt);

        const startMinutes =
            started.getHours() * 60 +
            started.getMinutes();

        const [blockHour, blockMinute] =
            block.start.split(":").map(Number);

        const blockMinutes =
            blockHour * 60 +
            blockMinute;

        return {

            position: {
                day: dayId,
                block: Number(String(block.id).split("-").at(-1)),
            },

            id: slotId,

            offset: startMinutes - blockMinutes,

            color: "#10B981",

            manual: false,

            ...timeEntry,

            timeEntryId: timeEntry.id

        };

    }

    export function createWeek(Cal, weekOffset) {
    if(weekOffset==null) {weekOffset=Cal.weekOffset;}
    const week = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Montag der aktuellen Woche bestimmen
    const weekStart = new Date(today);

    const day = weekStart.getDay(); // 0 = Sonntag, 1 = Montag ...

    const diff = day === 0 ? -6 : 1 - day;

    weekStart.setDate(weekStart.getDate() + diff);

    // Wochenwechsel berücksichtigen
    weekStart.setDate(weekStart.getDate() + weekOffset * 7);

    for (const day of Cal.days) {
        const date = new Date(weekStart);

        date.setDate(weekStart.getDate() + day.id);

        // Kalendertage sind lokale Arbeitstage. Eine UTC-Konvertierung würde
        // sie in positiven Zeitzonen auf den vorherigen Tag verschieben.
        const dateString = formatLocalDate(date);

        const scheduledBlocks = scheduledWorkBlocksForDate(Cal.companySettings, date);
        const specialRule = specialWorkRuleForDate(Cal.companySettings, date);
        week.push({
            day: day.id,
            kw: getCalendarWeek(weekOffset, Cal.today),
            date: dateString,
            dayOffReason: specialRule?.label || null,
            blocks: scheduledBlocks.map((block, blockIndex) => ({
                id: `${day.id}-${blockIndex}`,
                start: block.startTime,
                end: block.endTime,
                duration: block.duration,
                slots: [{
                    position: {
                        day: day.id,
                        block: blockIndex,
                    },
                    date: dateString,
                    id: createId(),
                    duration: block.duration,
                    free: true,
                    start: 0
                }]
            }))
        });
    }

    return week;
}
