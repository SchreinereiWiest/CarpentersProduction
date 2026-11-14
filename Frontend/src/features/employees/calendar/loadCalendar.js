import { formatLocalDate, getBlockForEntry, shiftLocalDate } from "./helper.js";
import { createCalendarEntry, createWeek } from "./createCalendar.js";
import { findInsertSlot, insertSlot } from "./SlotsCalendar.js";
import axios from "axios";
import { downloadFile } from "../../../shared/api/file-api.js";
import { getGlobalFile } from "../../../shared/cache/global-cache.js";

export async function loadWeek(userId, Cal, weekOffset) {
    if(Cal.user==null && userId==null) return;
    if(weekOffset==null) {weekOffset=Cal.weekOffset;}
    // if(userId==null) { userId=Cal.user.id;}

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Montag der aktuellen Woche bestimmen
    const weekStart = new Date(today);

    const day = weekStart.getDay(); // 0 = Sonntag, 1 = Montag ...

    const diff = day === 0 ? -6 : 1 - day;

    weekStart.setDate(weekStart.getDate() + diff);

    // Wochenwechsel berücksichtigen
    weekStart.setDate(weekStart.getDate() + weekOffset * 7);

    const dateString = formatLocalDate(weekStart);

        // console.log(userId, dateString);

    const loadStoredWeek = async (weekDate) => {
        try {
            return await getGlobalFile({
                file: `weekData:${userId.id}:${weekDate}`,
                loadFromServer: {
                    download: downloadFile,
                    path: `/api/time/downloadWeek/${userId.id}/${weekDate}`
                }
            });
        } catch (error) {
            console.warn(`Wochendaten für ${weekDate} konnten nicht geladen werden`, error);
            return null;
        }
    };

    let emptyWeek = createWeek(Cal, weekOffset);
    try {
        const rangeEnd = new Date(weekStart);
        rangeEnd.setDate(rangeEnd.getDate() + 7);
        const { data: calendarData } = await axios.get("/api/calendar/events", {
            params: { from: weekStart.toISOString(), to: rangeEnd.toISOString() }
        });
        const companyDays = (calendarData.events || []).filter(event => event.type === "company-closed");
        emptyWeek = emptyWeek.map(day => {
            const start = new Date(`${day.date}T00:00:00`);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            const closure = companyDays.find(event => new Date(event.startAt) < end && new Date(event.endAt) > start);
            return closure ? { ...day, blocks: [], dayOffReason: closure.title || "Betriebsfrei" } : day;
        });
    } catch (error) {
        console.warn("Betriebsfreie Kalendertage konnten nicht geladen werden", error);
    }
    let data = await loadStoredWeek(dateString);

    if (!Array.isArray(data) || data.length === 0) {
        // Ältere Clients haben den lokalen Montag per toISOString als Sonntag
        // gespeichert. Dieser Fallback macht diese Wochen wieder sichtbar.
        data = await loadStoredWeek(shiftLocalDate(dateString, -1));
    }

    return {
        weekData: normalizeWeekDates(data, emptyWeek),
        days: Cal.days
    };
}

export function normalizeWeekDates(storedWeek, emptyWeek) {
    if (!Array.isArray(storedWeek) || storedWeek.length === 0) return emptyWeek;

    return emptyWeek.map((templateDay, index) => {
        const storedDay = storedWeek.find(day => day.day === templateDay.day)
            ?? storedWeek[index];

        if (!storedDay) return templateDay;

        return {
            ...storedDay,
            day: templateDay.day,
            date: templateDay.date,
            dayOffReason: templateDay.dayOffReason,
            blocks: templateDay.blocks.map(templateBlock => {
                const storedBlock = storedDay.blocks?.find(block => block.start === templateBlock.start && block.end === templateBlock.end);
                return {
                ...templateBlock,
                slots: (storedBlock?.slots ?? templateBlock.slots).map(slot => ({
                    ...slot,
                    position: { ...slot.position, day: templateDay.day, block: Number(String(templateBlock.id).split("-").at(-1)) },
                    date: templateDay.date
                }))
            };})
        };
    });
}


export async function loadDayEntries(weekData, user, Cal) {

    

    for (const day of weekData) {
        // console.log(day);
        try {
            const dayentry = await axios.get(`/api/time/day/${day.date}`);

            for (const entry of dayentry.data) {

                // console.log(entry);

                if(entry.userId !== user.id) continue;
                const block = getBlockForEntry(entry, day.blocks);

                // console.log(block);

                if (block) {
                    let calendarEntry =
                    createCalendarEntry(
                        entry,
                        block,
                        day.day,
                        null
                    );

                    const NewinsertSlot = findInsertSlot(
                        weekData,
                        day,
                        block,
                        calendarEntry.offset
                    );

                    // console.log("insertSlot:", NewinsertSlot);

                    // if (!NewinsertSlot) return;

                    calendarEntry.id = NewinsertSlot?.id;

                    
                // console.log("calendarEntry:", calendarEntry);
                    insertSlot(calendarEntry, Cal);
                }

            }


    } catch (error) {
            console.error("Error fetching day entries:", error);
        }
    }
}
