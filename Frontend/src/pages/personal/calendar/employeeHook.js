import { useMemo, useState } from "react";
import axios from "axios";
import { addMinutesToTime, getCalendarWeek } from "./helper";
import {loadDayEntries, loadWeek} from "./loadCalendar";
import { createWeek } from "./createCalendar";
import { insertSlot } from "./SlotsCalendar";
import {saveEditedSlot, saveWeek} from "./saveCalendar";
import { createWorkBlocks } from "../../../services/companySettings";

export function useEmployeeCalendar(companySettings) {

    const [user, setUser] = useState();
    // Kalenderdaten der aktuellen Woche
    const [weekData, setWeekData] = useState([]);

    // Aktuell ausgewählter Kalenderslot
    const [selectedSlot, setSelectedSlot] = useState(null);

    // Offener Zeiteintrag rechts
    const [selectedOpenEntry, setSelectedOpenEntry] = useState(null);

    const [assigningEntryId, setAssigningEntryId] = useState(null);

    const [assignmentMessage, setAssignmentMessage] = useState(null);

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

    const [today] = useState(new Date().toISOString().split("T")[0]);

    const [days, setDays] = useState([
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
    ]);

    const blocks = useMemo(
        () => createWorkBlocks(companySettings),
        [companySettings]
    );

    const workTypes = companySettings.workTypes;

    /*
    ---------------------------------
    Kalenderfunktionen
    ---------------------------------
    */

    function selectSlot(slot) {

        setSelectedSlot(slot);

    }

    function selectOpenEntry(entry) {

        setSelectedOpenEntry(previous => previous?.id === entry.id ? null : entry);

        setAssignmentMessage(null);

    }

    function openEditor(slot,  mode) {

        setEditingSlot(slot);

        setEditMode(mode);

        setEditModalOpen(true);

    }

    function closeEditor() {

        setEditingSlot(null);

        setEditModalOpen(false);

    }

    async function previousWeek() {

        // console.log("prevweek");

        const newWeekOffset = weekOffset - 1;

        const result = await loadWeek(
        user,
        {
            weekOffset,
            user,
            days,
            blocks
        },
        newWeekOffset
    );

    setWeekOffset(newWeekOffset);
    setWeekData(result.weekData);
    setDays(result.days);
    // console.log(weekData);
    }

    async function nextWeek() {

        // console.log("nextweek");

        const newWeekOffset = weekOffset + 1;

        const result = await loadWeek(
        user,
        {
            weekOffset,
            user,
            days,
            blocks
        },
        newWeekOffset
    );

    setWeekOffset(newWeekOffset);
    setWeekData(result.weekData);
    setDays(result.days);
    // console.log(weekData);
    }



    async function loadMissingEntries() {

        // API später

    }

    async function loadProjects() {

        // API später

    }

    function getOpenEntryAssignment(targetSlot, openEntry) {

        const duration = Number(openEntry?.duration);

        if (!targetSlot?.free || !Number.isInteger(duration) || duration <= 0) {
            return {
                valid: false,
                split: false,
                error: "Die offene Zeit besitzt keine gültige Dauer."
            };
        }

        const day = weekData.find(entry => entry.day === targetSlot.position.day);
        const blockIndex = day?.blocks.findIndex(entry => {
            const blockId = Number(String(entry.id).split("-").at(-1));
            return blockId === targetSlot.position.block;
        }) ?? -1;
        const currentBlock = day?.blocks[blockIndex];

        if (!currentBlock || !targetSlot.date) {
            return {
                valid: false,
                split: false,
                error: "Der gewählte Kalenderblock ist ungültig."
            };
        }

        const createSegment = (slot, block, segmentDuration) => {
            const start = addMinutesToTime(block.start, slot.start);
            const startedAt = new Date(`${slot.date}T${start}`);
            const endedAt = new Date(
                startedAt.getTime() + segmentDuration * 60 * 1000
            );

            return {
                slot,
                duration: segmentDuration,
                startTime: startedAt.toISOString(),
                endTime: endedAt.toISOString()
            };
        };

        const segments = [];
        let remainingDuration = duration;
        let currentBlockIndex = blockIndex;
        let currentSlot = targetSlot;

        while (remainingDuration > 0) {
            const block = day.blocks[currentBlockIndex];

            if (!block) {
                return {
                    valid: false,
                    split: segments.length > 0,
                    error: "Die offene Zeit überschreitet das Ende des Arbeitstages."
                };
            }

            if (currentBlockIndex !== blockIndex) {
                currentSlot = block.slots.find(slot => (
                    slot.free && slot.start === 0
                ));

                if (!currentSlot) {
                    return {
                        valid: false,
                        split: segments.length > 0,
                        error: "Die offene Zeit würde mit einem bereits platzierten Eintrag kollidieren."
                    };
                }
            }

            const availableDuration = Math.min(
                currentSlot.duration,
                block.duration - currentSlot.start
            );
            const segmentDuration = Math.min(
                remainingDuration,
                availableDuration
            );

            segments.push(createSegment(
                currentSlot,
                block,
                segmentDuration
            ));
            remainingDuration -= segmentDuration;

            if (remainingDuration === 0) break;

            const reachesBlockEnd = (
                currentSlot.start + availableDuration === block.duration
            );

            if (!reachesBlockEnd) {
                return {
                    valid: false,
                    split: true,
                    error: "Die offene Zeit würde mit einem bereits platzierten Eintrag kollidieren."
                };
            }

            currentBlockIndex += 1;
        }

        return {
            valid: true,
            split: segments.length > 1,
            segments
        };

    }

    async function assignOpenEntry(targetSlot, openEntry) {

        if (!targetSlot?.free || !openEntry || assigningEntryId) return;

        const assignment = getOpenEntryAssignment(targetSlot, openEntry);

        if (!assignment.valid) {
            setAssignmentMessage({
                type: "error",
                text: assignment.error
            });
            return;
        }

        setAssigningEntryId(openEntry.id);
        setAssignmentMessage(null);

        try {
            const { data } = await axios.patch(
                `/api/time/${openEntry.id}/assign`,
                {
                    segments: assignment.segments.map(segment => ({
                        startTime: segment.startTime,
                        endTime: segment.endTime,
                        duration: segment.duration
                    }))
                }
            );

            let updatedWeek = weekData;

            assignment.segments.forEach((segment, index) => {
                const assignedEntry = data.entries[index];

                updatedWeek = insertSlot({
                    ...openEntry,
                    ...assignedEntry,
                    id: segment.slot.id,
                    timeEntryId: assignedEntry.id,
                    position: segment.slot.position,
                    date: segment.slot.date,
                    offset: segment.slot.start,
                    duration: segment.duration,
                    color: "#10B981",
                    manual: true
                }, {
                    weekData: updatedWeek,
                    setWeekData: () => {}
                });
            });

            setWeekData(updatedWeek);

            setMissingEntries(previous => (
                previous.filter(entry => entry.id !== openEntry.id)
            ));
            setSelectedOpenEntry(null);
            setSelectedSlot(null);
            setAssignmentMessage({
                type: "success",
                text: assignment.split
                    ? `Die offene Zeit wurde auf ${assignment.segments.length} Arbeitsblöcke aufgeteilt.`
                    : "Die offene Zeit wurde dem Kalender zugeordnet."
            });

            try {
                await saveWeek(updatedWeek, {
                    user,
                    weekData: updatedWeek
                });
            } catch (saveError) {
                console.error("Kalenderwoche konnte nicht gespeichert werden:", saveError);
                setAssignmentMessage({
                    type: "error",
                    text: "Die Zeit wurde zugeordnet, aber die Kalenderwoche konnte nicht gespeichert werden."
                });
            }
        } catch (error) {
            console.error("Offene Zeit konnte nicht zugeordnet werden:", error);
            setAssignmentMessage({
                type: "error",
                text: "Die offene Zeit konnte nicht zugeordnet werden."
            });
        } finally {
            setAssigningEntryId(null);
        }

    }

    function deleteSlot() {

        // später DELETE

    }

    return {

        // Daten

        weekData,
        setWeekData,

        days,
        blocks,
        workTypes,

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

        assigningEntryId,
        assignmentMessage,

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
        user,
        setUser,

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

        getOpenEntryAssignment,

        assignOpenEntry,

        saveEditedSlot,

        deleteSlot,

        saveWeek,

        getCalendarWeek

    };

}
