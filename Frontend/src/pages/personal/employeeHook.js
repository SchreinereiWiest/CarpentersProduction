import { useState } from "react";
import axios from "axios";

export function useEmployeeCalendar() {

    // Kalenderdaten der aktuellen Woche
    const [weekData, setWeekData] = useState([]);

    // Aktuell ausgewählter Kalenderslot
    const [selectedSlot, setSelectedSlot] = useState(null);

    // Offener Zeiteintrag rechts
    const [selectedOpenEntry, setSelectedOpenEntry] = useState(null);

    // Bearbeitungsdialog
    const [editingSlot, setEditingSlot] = useState(null);

    const [editModalOpen, setEditModalOpen] = useState(false);

    const [editMode, setEditMode] = useState("new");

    // Aktuelle Woche
    const [weekOffset, setWeekOffset] = useState(0);

    // Offene Projektzeiten
    const [missingEntries, setMissingEntries] = useState([]);

    const [dayEntries, setDayEntries] = useState([]);

    // Projekte für Dropdown im Modal
    const [projects, setProjects] = useState([]);

    // Loading
    const [loading, setLoading] = useState(false);

    // Fehler
    const [error, setError] = useState(null);

    const [today, setToday] = useState(new Date().toISOString().split("T")[0]);

    const days = [
        {
            id: 0,
            label: "Montag"
        },
        {
            id: 1,
            label: "Dienstag"
        },
        {
            id: 2,
            label: "Mittwoch"
        },
        {
            id: 3,
            label: "Donnerstag"
        },
        {
            id: 4,
            label: "Freitag"
        }
    ];

    const blocks = [
        {
            id: 0,
            start: "07:00",
            end: "09:00",
            duration: 120
        },
        {
            id: 1,
            start: "09:15",
            end: "12:00",
            duration: 165
        },
        {
            id: 2,
            start: "12:30",
            end: "16:00",
            duration: 210
        }
    ];

    /*
    ---------------------------------
    Kalenderfunktionen
    ---------------------------------
    */

    function toMinutes(time) {
        
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;

    }

    function getBlockForEntry(entry, blocks) {

    const date = new Date(entry.startedAt);

    const entryMinutes =
        date.getHours() * 60 +
        date.getMinutes();

    return blocks.find(block => {

        const start = toMinutes(block.start);
        const end = toMinutes(block.end);

        return entryMinutes >= start && entryMinutes < end;

    });

}

function createCalendarEntry(timeEntry, block, dayId, slotId) {

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

        duration: Math.round(timeEntry.duration / 60),

        start: `${String(started.getHours()).padStart(2,"0")}:${String(started.getMinutes()).padStart(2,"0")}`,

        projectId: timeEntry.projectId,

        workType: timeEntry.workType,

        color: "#10B981",

        manual: false

    };

}

function findInsertSlot(weekData, day, blockId, offset) {

    const block = day.blocks.find(b => {

        const [, id] = b.id.split("-").map(Number);
        return id;

    });
    // console.log("findInsertSlot:", block);
    const slotIndex = block.slots.findIndex(slot => {

        if (!slot.free) return false;

        console.log("slot:", slot, offset);

        return (
            offset >= slot.start &&
            offset < slot.start + slot.duration
        );

    });

    if (slotIndex === -1) return null;

    return block.slots[slotIndex];

}

    function selectSlot(slot) {

        setSelectedSlot(slot);

    }

    function selectOpenEntry(entry) {

        setSelectedOpenEntry(entry);

    }

    function openEditor(slot, mode) {

        setEditingSlot(slot);

        setEditMode(mode);

        setEditModalOpen(true);

    }

    function closeEditor() {

        setEditingSlot(null);

        setEditModalOpen(false);

    }

    function previousWeek() {

        setWeekOffset(prev => prev - 1);

    }

    function nextWeek() {

        setWeekOffset(prev => prev + 1);

    }

    function createWeek() {
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

        for (const [index, day] of days.entries()) {
            const date = new Date(weekStart);

            date.setDate(weekStart.getDate() + index + 3);

            const dateString = date.toISOString().split("T")[0];

            week.push({
                day: day.id,
                kw: 31,
                date: dateString,
                blocks: blocks.map(block => ({
                    ...block,
                    id: `${day.id}-${block.id}`,
                    slots: [{
                        position: {
                            day: day.id,
                            block: block.id,
                        },
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

    async function loadWeek() {

        // API später

    }

    async function loadMissingEntries() {

        // API später

    }

    async function loadProjects() {

        // API später

    }

    async function loadDayEntries(weekData, user) {

        for (const [index, day] of weekData.entries()) {
            console.log(day);
            try {
                const dayentry = await axios.get(`/api/time/day/${day.date}`);

                for (const entry of dayentry.data) {

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

                        calendarEntry.id = NewinsertSlot.id;

                        
                    console.log("calendarEntry:", calendarEntry);
                        insertSlot(calendarEntry);
                    }

                }


        } catch (error) {
                console.error("Error fetching day entries:", error);
            }
        }
    }

    function createId() {
        return Date.now() + Math.random();
    }

    function insertSlot(entry) {

    setWeekData(prev =>

        prev.map(day => {

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

                    block.slots.forEach((slot, index) => {

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
                        const before =
                            Math.max(
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

                                duration: before

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

                            start: slot.start + before

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

                                duration: after

                            });

                        }

                    });

                    return {

                        ...block,

                        slots

                    };

                })

            };

        })

    );

    }

    function mergeFreeSlots(slots) {

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

    function insertIntoSlots(slots, entry, dayId, blockId) {

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

                    duration: before

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
                    before

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

                    duration: after

                });

            }

            inserted = true;

        });

        return result;

    }

    function updateSlot(updatedEntry) {

    setWeekData(prev =>

        prev.map(day => {

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
                    let slots = block.slots.map((slot, index) => {

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

                            duration: slot.duration

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
                        updatedEntry, day.day, blockId
                    );

                    return {

                        ...block,

                        slots

                    };

                })

            };

        })

    );

}

    function onDropOpenEntry(position, openEntry) {

        insertSlot({

            ...openEntry,

            position,

            manual: false,

            offset: 0

        });

        setSelectedOpenEntry(null);
        setSelectedSlot(null);

    }

    function saveEditedSlot(entry, mode) {

        // console.log("saveEditedSlot", entry);
        if(mode == "new") {
    insertSlot({

        ...entry,

        manual: true

    }); } else if(mode == "edit") {
    updateSlot({

        ...entry,

        manual: true

    }); }

    setEditModalOpen(false);
    setEditingSlot(null);

}

    function deleteSlot(slot) {

        // später DELETE

    }

    return {

        // Daten

        weekData,
        setWeekData,

        days,
        blocks,

        missingEntries,
        setMissingEntries,

        dayEntries,
        setDayEntries,

        projects,
        setProjects,

        // Auswahl

        selectedSlot,
        setSelectedSlot,

        selectedOpenEntry,
        setSelectedOpenEntry,

        editingSlot,
        setEditingSlot,

        editModalOpen,
        setEditModalOpen,

        editMode,

        // Woche

        weekOffset,
        setWeekOffset,

        // Status

        loading,
        setLoading,

        error,
        setError,

        today,

        // Funktionen

        loadDayEntries,

        selectSlot,

        selectOpenEntry,

        openEditor,

        closeEditor,

        previousWeek,

        nextWeek,

        loadWeek,

        createWeek,

        loadMissingEntries,

        loadProjects,

        onDropOpenEntry,

        saveEditedSlot,

        deleteSlot

    };

}