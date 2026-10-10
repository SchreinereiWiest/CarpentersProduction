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

    async function assignOpenEntry(targetSlot, openEntry) {

        if (!targetSlot?.free || !openEntry || assigningEntryId) return;

        const duration = Number(openEntry.duration);

        if (!Number.isFinite(duration) || duration <= 0) {
            setAssignmentMessage({
                type: "error",
                text: "Die offene Zeit besitzt keine gültige Dauer."
            });
            return;
        }

        if (duration > targetSlot.duration) {
            setAssignmentMessage({
                type: "error",
                text: `Der gewählte freie Bereich ist zu kurz. Benötigt werden ${duration} Minuten.`
            });
            return;
        }

        const block = blocks.find(entry => entry.id === targetSlot.position.block);

        if (!block || !targetSlot.date) {
            setAssignmentMessage({
                type: "error",
                text: "Der gewählte Kalenderblock ist ungültig."
            });
            return;
        }

        const start = addMinutesToTime(block.start, targetSlot.start);
        const startedAt = new Date(`${targetSlot.date}T${start}`);
        const endedAt = new Date(startedAt.getTime() + duration * 60 * 1000);

        setAssigningEntryId(openEntry.id);
        setAssignmentMessage(null);

        try {
            const { data: assignedEntry } = await axios.patch(
                `/api/time/${openEntry.id}/assign`,
                {
                    startTime: startedAt.toISOString(),
                    endTime: endedAt.toISOString()
                }
            );

            const updatedWeek = insertSlot({
                ...openEntry,
                ...assignedEntry,
                id: targetSlot.id,
                timeEntryId: openEntry.id,
                position: targetSlot.position,
                date: targetSlot.date,
                offset: targetSlot.start,
                color: "#10B981",
                manual: true
            }, {
                weekData,
                setWeekData
            });

            setMissingEntries(previous => (
                previous.filter(entry => entry.id !== openEntry.id)
            ));
            setSelectedOpenEntry(null);
            setSelectedSlot(null);
            setAssignmentMessage({
                type: "success",
                text: "Die offene Zeit wurde dem Kalender zugeordnet."
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

        assignOpenEntry,

        saveEditedSlot,

        deleteSlot,

        saveWeek,

        getCalendarWeek

    };

}
