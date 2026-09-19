import {toMinutes, addMinutesToTime, getBlockForEntry, createId} from "./helper";
import {loadDayEntries, loadWeek} from "./loadCalendar";
import {findInsertSlot, insertSlot, mergeFreeSlots, insertIntoSlots, updateSlot} from "./SlotsCalendar";
import {saveEditedSlot, saveWeek} from "./saveCalendar";
import axios from "axios";
import {getCalendarWeek} from "./helper";

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
                block: block.id,
            },

            id: slotId,

            offset: startMinutes - blockMinutes,

            color: "#10B981",

            manual: false,

            ...timeEntry

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

    for (const [index, day] of Cal.days.entries()) {
        const date = new Date(weekStart);

        date.setDate(weekStart.getDate() + index + 1);

        const dateString = date.toISOString().split("T")[0];

        week.push({
            day: day.id,
            kw: getCalendarWeek(weekOffset, Cal.today),
            date: dateString,
            blocks: Cal.blocks.map(block => ({
                ...block,
                id: `${day.id}-${block.id}`,
                slots: [{
                    position: {
                        day: day.id,
                        block: block.id,
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