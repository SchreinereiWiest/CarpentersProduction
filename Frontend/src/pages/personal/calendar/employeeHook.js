import { useState } from "react";
import axios from "axios";
import {toMinutes, addMinutesToTime, getBlockForEntry, createId, getCalendarWeek} from "./helper";
import {loadDayEntries, loadWeek} from "./loadCalendar";
import {createCalendarEntry, createWeek} from "./createCalendar";
import {findInsertSlot, insertSlot, mergeFreeSlots, insertIntoSlots, updateSlot} from "./SlotsCalendar";
import {saveEditedSlot, saveWeek} from "./saveCalendar";

export function useEmployeeCalendar() {

    const [user, setUser] = useState();
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

    function selectSlot(slot) {

        setSelectedSlot(slot);

    }

    function selectOpenEntry(entry) {

        setSelectedOpenEntry(entry);

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

    function onDropOpenEntry(position, openEntry, Cal) {

        insertSlot({

            ...openEntry,

            position,

            manual: false,

            offset: 0,

            Cal: Cal

        });

        setSelectedOpenEntry(null);
        setSelectedSlot(null);

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

        onDropOpenEntry,

        saveEditedSlot,

        deleteSlot,

        saveWeek,

        getCalendarWeek

    };

}