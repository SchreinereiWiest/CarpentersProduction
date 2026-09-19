import {toMinutes, addMinutesToTime, getBlockForEntry, createId} from "./helper";
import {loadDayEntries, loadWeek} from "./loadCalendar";
import {createCalendarEntry, createWeek} from "./createCalendar";
import {findInsertSlot, insertSlot, mergeFreeSlots, insertIntoSlots, updateSlot} from "./SlotsCalendar";
import axios from "axios";

export async function saveEditedSlot(entry, mode, Cal) {

        // console.log("saveEditedSlot", entry);
        let update = {};
        if(mode == "new") {
            update = insertSlot({

        ...entry,

        manual: true,

    }, Cal); } else if(mode == "edit") {
        update = updateSlot({

        ...entry,

        manual: true,

    }, Cal); }

    Cal.setEditModalOpen(false);
    Cal.setEditingSlot(null);

    // console.log(entry);

    const startDate = new Date(`${entry.date}T${entry.start}`);
    const endDate = new Date(
        startDate.getTime() + entry.duration * 60 * 1000
    );

    await axios.post(
        `/api/time/new/${entry.projectId}`,
        {
            workType: entry.workType,
            duration: entry.duration,
            userId: Cal.user.id,
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString()
        }
    );

    Cal.saveWeek(update, Cal);
}

export async function saveWeek(data, Cal) {
    // console.log(Cal.weekData);
    await axios.post(
    `/api/time/uploadWeek/${Cal.user.id}/${Cal.weekData[0].date}`,
    data,
    {
                    withCredentials: true,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
);
}