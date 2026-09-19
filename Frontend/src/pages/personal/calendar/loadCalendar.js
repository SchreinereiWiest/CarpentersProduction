import {toMinutes, addMinutesToTime, getBlockForEntry, createId} from "./helper";
import {createCalendarEntry, createWeek} from "./createCalendar";
import {findInsertSlot, insertSlot, mergeFreeSlots, insertIntoSlots, updateSlot} from "./SlotsCalendar";
import {saveEditedSlot, saveWeek} from "./saveCalendar";
import axios from "axios";

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

    const dateString = [
    weekStart.getFullYear(),
    String(weekStart.getMonth() + 1).padStart(2, "0"),
    String(weekStart.getDate()).padStart(2, "0")
].join("-");

        // console.log(userId, dateString);

        try {

                const response = await axios.get(

                    `/api/time/downloadWeek/${userId.id}/${dateString}`,

                    {
                        withCredentials: true
                    }

                );

                const {

                    exists,

                    downloadUrl,

                } = response.data;

                // console.log(response.data);

                if (exists) {

                    try {
                        const fileResponse = await fetch(
                            downloadUrl
                        );

                        const data = await fileResponse.json();


                        // Cal.setWeekData(data);
                        return {weekData: data, days: Cal.days};

                        // console.log(data);
                    } catch (error) {
                        console.warn("cant fetch data, try new upload", error);
                        return;
                    }

                } else {
                    // Cal.setWeekData(createWeek(Cal));
                    return {weekData: createWeek(Cal, weekOffset), days: Cal.days};
                }

    } catch(error) {
        console.log(error);
    }
    
}


export async function loadDayEntries(weekData, user, Cal) {

    

    for (const [index, day] of weekData.entries()) {
        // console.log(day);
        try {
            const dayentry = await axios.get(`/api/time/day/${day.date}`);

            for (const entry of dayentry.data) {

                // console.log(entry);

                if(entry.userId !== user.id) continue;
                const block = getBlockForEntry(entry, blocks);

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