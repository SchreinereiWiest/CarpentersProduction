import { insertSlot, updateSlot } from "./SlotsCalendar.js";
import axios from "axios";
import { uploadJSONFile } from "../../../shared/api/file-api.js";
import { uploadGlobalFile } from "../../../shared/cache/global-cache.js";

export async function saveEditedSlot(entry, mode, Cal) {

    const startDate = new Date(`${entry.date}T${entry.start}`);
    const endDate = new Date(
        startDate.getTime() + entry.duration * 60 * 1000
    );

    const payload = {
        projectId: entry.projectId,
        workType: entry.workType,
        customWorkType: entry.customWorkType,
        duration: entry.duration,
        userId: Cal.user.id,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString()
    };

    let timeEntryId = entry.timeEntryId;

    if (timeEntryId) {
        await axios.patch(`/api/time/${timeEntryId}`, payload);
    } else {
        const { data: createdEntry } = await axios.post(
            `/api/time/new/${entry.projectId}`,
            payload
        );
        timeEntryId = createdEntry.id;
    }

    const persistedEntry = {
        ...entry,
        timeEntryId,
        manual: true
    };

    let update;

    if (mode === "edit") {
        update = updateSlot(persistedEntry, Cal);
    } else {
        update = insertSlot(persistedEntry, Cal);
    }

    Cal.setEditModalOpen(false);
    Cal.setEditingSlot(null);

    await Cal.saveWeek(update, Cal);
}

export async function saveWeek(data, Cal) {
    const weekStart = data?.[0]?.date ?? Cal.weekData?.[0]?.date;

    if (!weekStart) return;

    await uploadGlobalFile({
        file: `weekData:${Cal.user.id}:${weekStart}`,
        data,
        uploadFunction: {
            upload: uploadJSONFile,
            path: `/api/time/uploadWeek/${Cal.user.id}/${weekStart}`,
            sourcePath: `/api/time/downloadWeek/${Cal.user.id}/${weekStart}`
        }
    });
}
