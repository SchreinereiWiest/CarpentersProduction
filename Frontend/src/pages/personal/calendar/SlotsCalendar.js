import {toMinutes, addMinutesToTime, getBlockForEntry, createId} from "./helper";
import {loadDayEntries, loadWeek} from "./loadCalendar";
import {createCalendarEntry, createWeek} from "./createCalendar";
import {saveEditedSlot, saveWeek} from "./saveCalendar";
import axios from "axios";

export function findInsertSlot(weekData, day, blockId, offset) {
        function toMinutes(time) {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
    }

    const entryStart = toMinutes(blockId.start);

    const block = day.blocks.find(b => {
        const start = toMinutes(b.start);
        const end = toMinutes(b.end);

        return entryStart >= start && entryStart < end;
    });

        // console.log("findInsertSlot:", block);
        const slotIndex = block.slots.findIndex(slot => {

            if (!slot.free) return false;

            return (
                offset >= slot.start &&
                offset < slot.start + slot.duration
            );

        });

        if (slotIndex === -1) return null;

        return block.slots[slotIndex];

}

export function insertSlot(entry, Cal) {

    const update = Cal.weekData.map(day => {

        if (day.day !== entry.position.day)
            return day;

        return {
            ...day,

            blocks: day.blocks.map(block => {

                const [, blockId] = block.id
                    .split("-")
                    .map(Number);

                if (blockId !== entry.position.block)
                    return block;

                const slots = [];

                block.slots.forEach(slot => {

                    // Alle anderen Slots übernehmen
                    if (slot.id !== entry.id) {
                        slots.push(slot);
                        return;
                    }

                    // Nur in freie Slots darf eingefügt werden
                    if (!slot.free) {
                        slots.push(slot);
                        return;
                    }

                    // Offset relativ zum freien Slot
                    const before = Math.max(
                        0,
                        entry.offset - slot.start
                    );

                    // Prüfen ob genug Platz vorhanden
                    if (before + entry.duration > slot.duration) {
                        slots.push(slot);
                        return;
                    }

                    const after =
                        slot.duration -
                        before -
                        entry.duration;

                    // Freiraum davor
                    if (before > 0) {
                        slots.push({
                            id: createId(),

                            position: {
                                day: day.day,
                                block: blockId,
                            },

                            free: true,
                            start: slot.start,
                            duration: before,
                            date: slot.date
                        });
                    }

                    // Neuer Eintrag
                    slots.push({
                        id: createId(),

                        position: {
                            day: day.day,
                            block: blockId,
                        },

                        free: false,
                        manual: entry.manual ?? false,
                        projectId: entry.projectId,
                        workType: entry.workType,
                        color: entry.color,
                        duration: entry.duration,
                        start: slot.start + before,
                        date: slot.date
                    });

                    // Freiraum danach
                    if (after > 0) {
                        slots.push({
                            id: createId(),

                            position: {
                                day: day.day,
                                block: blockId,
                            },

                            free: true,

                            start:
                                slot.start +
                                before +
                                entry.duration,

                            duration: after,
                            date: slot.date
                        });
                    }

                });

                return {
                    ...block,
                    slots
                };

            })

        };

    });

    Cal.setWeekData(update);

    return update;
}

export function mergeFreeSlots(slots) {

    const merged = [];

    slots.forEach(slot => {

        const last =
            merged[merged.length - 1];

        if (
            last &&
            last.free &&
            slot.free
        ) {

            last.duration += slot.duration;

        } else {

            merged.push({
                ...slot
            });

        }

    });

    return merged;

}

export function insertIntoSlots(slots, entry, dayId, blockId) {

    const result = [];

    let inserted = false;

    slots.forEach(slot => {

        if (
            inserted ||
            !slot.free
        ) {

            result.push(slot);
            return;

        }

        const before =
            Math.max(
                0,
                entry.offset - slot.start
            );

        if (
            before + entry.duration >
            slot.duration
        ) {

            result.push(slot);
            return;

        }

        const after =
            slot.duration -
            before -
            entry.duration;

        if (before > 0) {

            result.push({

                id: createId(),
                position: {
                    day: dayId,
                    block: blockId,
                },
                free: true,

                start: slot.start,

                duration: before,

                date: entry.date

            });

        }

        result.push({

            id: createId(),
            position: {
                day: dayId,
                block: blockId,
            },

            free: false,

            manual: true,

            projectId: entry.projectId,

            workType: entry.workType,

            color: entry.color,

            duration: entry.duration,

            start:
                slot.start +
                before,

            date: entry.date

        });

        if (after > 0) {

            result.push({

                id: createId(),
                position: {
                    day: dayId,
                    block: blockId,
                },

                free: true,

                start:
                    slot.start +
                    before +
                    entry.duration,

                duration: after,

                date: entry.date

            });

        }

        inserted = true;

    });

    return result;

}

export function updateSlot(updatedEntry, Cal) {

    // console.log(updatedEntry);

    const update = Cal.weekData.map(day => {

        if (day.day !== updatedEntry.position.day)
            return day;

        return {
            ...day,

            blocks: day.blocks.map(block => {

                const [, blockId] = block.id
                    .split("-")
                    .map(Number);

                if (blockId !== updatedEntry.position.block)
                    return block;

                //
                // 1. Alten Slot entfernen
                //
                let slots = block.slots.map(slot => {

                    if (slot.id !== updatedEntry.id)
                        return slot;

                    return {
                        id: createId(),

                        position: {
                            day: day.day,
                            block: blockId,
                        },

                        free: true,
                        start: slot.start,
                        duration: slot.duration,
                        date: slot.date
                    };

                });

                //
                // 2. Freie Bereiche zusammenführen
                //
                slots = mergeFreeSlots(slots);

                //
                // 3. Neuen Eintrag einsetzen
                //
                slots = insertIntoSlots(
                    slots,
                    updatedEntry,
                    day.day,
                    blockId
                );

                return {
                    ...block,
                    slots
                };

            })

        };

    });

    Cal.setWeekData(update);

    return update;
}
