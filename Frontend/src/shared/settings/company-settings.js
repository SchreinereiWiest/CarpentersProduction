import { downloadFile } from "../api/file-api.js";
import { getGlobalFile } from "../cache/global-cache.js";
import { normalizeEstimationSettings } from "@Engine/calculation/estimation.mjs";

export const CUSTOM_WORK_TYPE_ID = "__custom__";

const DEFAULT_BREAKS = [
    { id: "morning-break", label: "Frühstückspause", start: "09:00", end: "09:15" },
    { id: "lunch-break", label: "Mittagspause", start: "12:00", end: "12:45" }
];

const dayBreaks = () => DEFAULT_BREAKS.map(entry => ({ ...entry }));

export const DEFAULT_COMPANY_SETTINGS = {
    schemaVersion: 11,
    workingHours: {
        start: "07:00",
        end: "16:45"
    },
    workWeek: [
        { weekday: 1, label: "Montag", enabled: true, start: "07:00", end: "16:45", breaks: dayBreaks() },
        { weekday: 2, label: "Dienstag", enabled: true, start: "07:00", end: "16:45", breaks: dayBreaks() },
        { weekday: 3, label: "Mittwoch", enabled: true, start: "07:00", end: "16:45", breaks: dayBreaks() },
        { weekday: 4, label: "Donnerstag", enabled: true, start: "07:00", end: "16:45", breaks: dayBreaks() },
        { weekday: 5, label: "Freitag", enabled: true, start: "07:00", end: "16:45", breaks: dayBreaks() },
        { weekday: 6, label: "Samstag", enabled: false, start: "07:00", end: "16:45", breaks: [] },
        { weekday: 0, label: "Sonntag", enabled: false, start: "07:00", end: "16:45", breaks: [] }
    ],
    breaks: DEFAULT_BREAKS,
    specialWorkRules: [],
    workTypes: [
        { id: "cutting", label: "Zuschnitt" },
        { id: "edging", label: "Bekantung" },
        { id: "cnc", label: "CNC" },
        { id: "assembly", label: "Zusammenbau" },
        { id: "finishing", label: "Finalisierung" },
        { id: "installation", label: "Montage" }
    ],
    management: {
        workflowStates: [
            { id: "inbox", label: "Eingang" },
            { id: "planning", label: "Planung" },
            { id: "approval", label: "Freigabe" },
            { id: "production", label: "Fertigung" },
            { id: "installation", label: "Montage" },
            { id: "done", label: "Erledigt" }
        ],
        goalTypes: [
            { id: "employees", label: "Mitarbeiterentwicklung", unit: "Personen" },
            { id: "new-customers", label: "Neukunden", unit: "Kunden" },
            { id: "revenue", label: "Umsatzentwicklung", unit: "€" },
            { id: "improvements", label: "Verbesserungen und Wirkung", unit: "Punkte" },
            { id: "profit", label: "Gewinnentwicklung", unit: "€" }
        ]
    },
    userInterface: {
        showTips: true,
        lineLockThresholdCm: 5,
        measurementLabelSizePercent: 100,
        measurementLabelOffsetY: -30,
        measurementFormFieldWidthMm: 32,
        measurementFormFieldHeightMm: 10,
        workspaceLayout: "single",
        workspaceScalePercent: 100,
        keybindings: {
            sidebar: "Alt+1",
            projectBar: "Alt+2",
            apply: "Ctrl+Enter"
        }
    },
    estimation: {
        ...normalizeEstimationSettings(),
        ollama: {
            enabled: false,
            baseUrl: "http://ollama:11434",
            embeddingModel: "nomic-embed-text",
            explanationModel: ""
        }
    },
    attachmentSearch: {
        enabled: false,
        openWebUiEndpoint: "http://host.docker.internal:3000",
        model: "carpenters-qwen3627b",
        manufacturerWebsites: [],
        allowOpenWebFallback: true,
        searchPrompt: "Bewerte die gefundenen Herstellerunterlagen zur Artikelnummer. Behalte nur technisch und fertigungsrelevante Dokumente oder Bilder.",
        filterPrompt: "Extrahiere insbesondere Maße, Montagehinweise, Bohrbilder, Materialangaben, Belastbarkeit und Varianten. Erfinde keine Angaben."
    }
};

export function timeToMinutes(time) {
    const [hours, minutes] = String(time).split(":").map(Number);

    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
        return Number.NaN;
    }

    return hours * 60 + minutes;
}

export function normalizeCompanySettings(data) {
    const workingHours = {
        ...DEFAULT_COMPANY_SETTINGS.workingHours,
        ...(data?.workingHours ?? {})
    };

    const breaks = Array.isArray(data?.breaks)
        ? data.breaks
        : DEFAULT_COMPANY_SETTINGS.breaks;
    const suppliedWorkWeek = Array.isArray(data?.workWeek) ? data.workWeek : null;
    const normalizeBreaks = (items, prefix) => items.map((entry, index) => ({
        id: String(entry?.id || `${prefix}-break-${index + 1}`),
        label: String(entry?.label || `Pause ${index + 1}`),
        start: String(entry?.start || "09:00"),
        end: String(entry?.end || "09:15")
    }));
    const workWeek = DEFAULT_COMPANY_SETTINGS.workWeek.map(defaultDay => {
        const suppliedDay = suppliedWorkWeek?.find(entry => Number(entry?.weekday) === defaultDay.weekday);
        return suppliedDay
            ? {
                ...defaultDay,
                ...suppliedDay,
                weekday: defaultDay.weekday,
                label: defaultDay.label,
                enabled: suppliedDay.enabled === undefined ? defaultDay.enabled : suppliedDay.enabled !== false,
                breaks: normalizeBreaks(
                    Array.isArray(suppliedDay.breaks) ? suppliedDay.breaks : breaks,
                    `day-${defaultDay.weekday}`
                )
            }
            : {
                ...defaultDay,
                start: workingHours.start,
                end: workingHours.end,
                breaks: defaultDay.enabled ? normalizeBreaks(breaks, `day-${defaultDay.weekday}`) : []
            };
    });
    const specialWorkRules = Array.isArray(data?.specialWorkRules)
        ? data.specialWorkRules.map((entry, index) => ({
            id: String(entry?.id || `work-rule-${index + 1}`),
            label: String(entry?.label || `Sonderregel ${index + 1}`).trim(),
            kind: "recurring-day-off",
            enabled: entry?.enabled !== false,
            weekday: Math.min(6, Math.max(0, Number(entry?.weekday ?? 5))),
            intervalWeeks: Math.min(52, Math.max(1, Math.round(Number(entry?.intervalWeeks) || 2))),
            anchorDate: /^\d{4}-\d{2}-\d{2}$/.test(String(entry?.anchorDate || ""))
                ? String(entry.anchorDate)
                : "2026-01-02"
        }))
        : [];

    const workTypes = Array.isArray(data?.workTypes) && data.workTypes.length > 0
        ? data.workTypes
        : DEFAULT_COMPANY_SETTINGS.workTypes;
    const managementData = data?.management ?? {};
    const workflowStates = Array.isArray(managementData.workflowStates) && managementData.workflowStates.length > 0
        ? managementData.workflowStates
        : DEFAULT_COMPANY_SETTINGS.management.workflowStates;
    const goalTypes = Array.isArray(managementData.goalTypes) && managementData.goalTypes.length > 0
        ? managementData.goalTypes
        : DEFAULT_COMPANY_SETTINGS.management.goalTypes;
    const userInterface = {
        ...DEFAULT_COMPANY_SETTINGS.userInterface,
        ...(data?.userInterface ?? {})
    };
    const estimation = normalizeEstimationSettings(data?.estimation);
    const ollama = {
        ...DEFAULT_COMPANY_SETTINGS.estimation.ollama,
        ...(data?.estimation?.ollama ?? {})
    };
    const attachmentSearch = {
        ...DEFAULT_COMPANY_SETTINGS.attachmentSearch,
        ...(data?.attachmentSearch ?? {})
    };
    const manufacturerWebsites = Array.isArray(attachmentSearch.manufacturerWebsites)
        ? attachmentSearch.manufacturerWebsites
        : [];

    return {
        schemaVersion: 11,
        workingHours,
        workWeek,
        specialWorkRules,
        breaks: breaks.map((entry, index) => ({
            id: entry.id || `break-${index + 1}`,
            label: entry.label || `Pause ${index + 1}`,
            start: entry.start,
            end: entry.end
        })),
        workTypes: workTypes.map(entry => ({
            id: String(entry.id),
            label: String(entry.label)
        })),
        management: {
            workflowStates: workflowStates.map((entry, index) => ({
                id: String(entry?.id || `status-${index + 1}`),
                label: String(entry?.label || `Status ${index + 1}`).trim()
            })),
            goalTypes: goalTypes.map((entry, index) => ({
                id: String(entry?.id || `ziel-${index + 1}`),
                label: String(entry?.label || `Zieltyp ${index + 1}`).trim(),
                unit: String(entry?.unit || "Wert").trim()
            }))
        },
        userInterface: {
            showTips: userInterface.showTips !== false,
            lineLockThresholdCm: normalizeLineLockThresholdCm(
                userInterface.lineLockThresholdCm
            ),
            measurementLabelSizePercent: normalizeMeasurementLabelSizePercent(
                userInterface.measurementLabelSizePercent
            ),
            measurementLabelOffsetY: normalizeMeasurementLabelOffsetY(
                userInterface.measurementLabelOffsetY
            ),
            measurementFormFieldWidthMm: normalizeMeasurementFormFieldWidthMm(
                userInterface.measurementFormFieldWidthMm
            ),
            measurementFormFieldHeightMm: normalizeMeasurementFormFieldHeightMm(
                userInterface.measurementFormFieldHeightMm
            ),
            workspaceLayout: normalizeWorkspaceLayout(userInterface.workspaceLayout),
            workspaceScalePercent: normalizeWorkspaceScalePercent(
                userInterface.workspaceScalePercent
            ),
            keybindings: normalizeKeybindings(userInterface.keybindings)
        },
        estimation: {
            ...estimation,
            ollama: {
                enabled: Boolean(ollama.enabled),
                baseUrl: String(ollama.baseUrl || "").trim(),
                embeddingModel: String(ollama.embeddingModel || "").trim(),
                explanationModel: String(ollama.explanationModel || "").trim()
            }
        },
        attachmentSearch: {
            enabled: Boolean(attachmentSearch.enabled),
            openWebUiEndpoint: String(attachmentSearch.openWebUiEndpoint || "").trim().replace(/\/+$/, ""),
            model: String(attachmentSearch.model || "").trim(),
            manufacturerWebsites: manufacturerWebsites.map((website, index) => ({
                id: String(website?.id || `manufacturer-${index + 1}`),
                name: String(website?.name || "").trim(),
                baseUrl: String(website?.baseUrl || "").trim().replace(/\/+$/, ""),
                searchUrlTemplate: String(website?.searchUrlTemplate || "").trim(),
                downloadsApproved: Boolean(website?.downloadsApproved),
                licenseNote: String(website?.licenseNote || "").trim()
            })).filter(website => website.baseUrl),
            allowOpenWebFallback: attachmentSearch.allowOpenWebFallback !== false,
            searchPrompt: String(attachmentSearch.searchPrompt || DEFAULT_COMPANY_SETTINGS.attachmentSearch.searchPrompt).trim(),
            filterPrompt: String(attachmentSearch.filterPrompt || DEFAULT_COMPANY_SETTINGS.attachmentSearch.filterPrompt).trim()
        }
    };
}

export function normalizeLineLockThresholdCm(value) {
    const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
    if (!Number.isFinite(parsed)) {
        return DEFAULT_COMPANY_SETTINGS.userInterface.lineLockThresholdCm;
    }

    return Math.max(0, parsed);
}

export function normalizeMeasurementLabelSizePercent(value) {
    const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
    if (!Number.isFinite(parsed)) {
        return DEFAULT_COMPANY_SETTINGS.userInterface.measurementLabelSizePercent;
    }

    return Math.min(200, Math.max(50, parsed));
}

export function normalizeMeasurementLabelOffsetY(value) {
    const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
    if (!Number.isFinite(parsed)) {
        return DEFAULT_COMPANY_SETTINGS.userInterface.measurementLabelOffsetY;
    }

    return Math.min(200, Math.max(-200, parsed));
}

export function normalizeMeasurementFormFieldWidthMm(value) {
    const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
    if (!Number.isFinite(parsed)) {
        return DEFAULT_COMPANY_SETTINGS.userInterface.measurementFormFieldWidthMm;
    }

    return Math.min(80, Math.max(20, parsed));
}

export function normalizeMeasurementFormFieldHeightMm(value) {
    const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
    if (!Number.isFinite(parsed)) {
        return DEFAULT_COMPANY_SETTINGS.userInterface.measurementFormFieldHeightMm;
    }

    return Math.min(30, Math.max(8, parsed));
}

export const WORKSPACE_LAYOUTS = ["single", "split", "grid"];

export function normalizeWorkspaceLayout(value) {
    return WORKSPACE_LAYOUTS.includes(value) ? value : "single";
}

export function normalizeWorkspaceScalePercent(value) {
    const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
    if (!Number.isFinite(parsed)) {
        return DEFAULT_COMPANY_SETTINGS.userInterface.workspaceScalePercent;
    }

    return Math.min(125, Math.max(50, Math.round(parsed)));
}

export function normalizeKeybinding(value, fallback) {
    const normalized = String(value || "").trim();
    return normalized.length > 0 && normalized.length <= 40 ? normalized : fallback;
}

export function normalizeKeybindings(value) {
    const defaults = DEFAULT_COMPANY_SETTINGS.userInterface.keybindings;

    return {
        sidebar: normalizeKeybinding(value?.sidebar, defaults.sidebar),
        projectBar: normalizeKeybinding(value?.projectBar, defaults.projectBar),
        apply: normalizeKeybinding(value?.apply, defaults.apply)
    };
}

export function createWorkBlocks(settings) {
    const normalized = normalizeCompanySettings(settings);
    return createBlocks(normalized.workingHours.start, normalized.workingHours.end, normalized.breaks);
}

function createBlocks(start, end, breaks) {
    const dayStart = timeToMinutes(start);
    const dayEnd = timeToMinutes(end);
    const blocks = [];
    let cursor = dayStart;

    const sortedBreaks = [...breaks]
        .sort((left, right) => timeToMinutes(left.start) - timeToMinutes(right.start));

    sortedBreaks.forEach(breakEntry => {
        const breakStart = timeToMinutes(breakEntry.start);
        const breakEnd = timeToMinutes(breakEntry.end);

        if (breakEnd <= dayStart || breakStart >= dayEnd) return;
        const clippedStart = Math.max(dayStart, breakStart);
        const clippedEnd = Math.min(dayEnd, breakEnd);

        if (clippedStart > cursor) {
            blocks.push({
                id: blocks.length,
                start: minutesToTime(cursor),
                end: minutesToTime(clippedStart),
                duration: clippedStart - cursor
            });
        }

        cursor = Math.max(cursor, clippedEnd);
    });

    if (cursor < dayEnd) {
        blocks.push({
            id: blocks.length,
            start: minutesToTime(cursor),
            end: minutesToTime(dayEnd),
            duration: dayEnd - cursor
        });
    }

    return blocks;
}

export function scheduledWorkBlocksForDate(settings, date) {
    const normalized = settings?.schemaVersion === 11 ? settings : normalizeCompanySettings(settings);
    const value = date instanceof Date ? new Date(date) : new Date(`${date}T12:00:00`);
    const day = normalized.workWeek.find(entry => entry.weekday === value.getDay());
    if (!day?.enabled || specialWorkRuleForDate(normalized, value)) return [];
    return createBlocks(day.start, day.end, day.breaks).map(block => {
        const start = new Date(value);
        const end = new Date(value);
        const startMinutes = timeToMinutes(block.start);
        const endMinutes = timeToMinutes(block.end);
        start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
        end.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
        return { ...block, startTime: block.start, endTime: block.end, start, end };
    });
}

export function scheduledMinutesForDate(settings, date) {
    return scheduledWorkBlocksForDate(settings, date).reduce((sum, block) => sum + block.duration, 0);
}

export function annualScheduledMinutes(settings, year) {
    const cursor = new Date(Number(year), 0, 1, 12);
    const end = new Date(Number(year) + 1, 0, 1, 12);
    let minutes = 0;
    while (cursor < end) {
        minutes += scheduledMinutesForDate(settings, cursor);
        cursor.setDate(cursor.getDate() + 1);
    }
    return minutes;
}

export function averageScheduledDayMinutes(settings) {
    const normalized = normalizeCompanySettings(settings);
    const activeDays = normalized.workWeek.filter(day => day.enabled);
    if (!activeDays.length) return 0;
    const minutes = activeDays.reduce((sum, day) => (
        sum + createBlocks(day.start, day.end, day.breaks).reduce((daySum, block) => daySum + block.duration, 0)
    ), 0);
    return minutes / activeDays.length;
}

const calendarDayNumber = date => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
const weekStartNumber = date => calendarDayNumber(date) - (((date.getDay() || 7) - 1));

export function specialWorkRuleForDate(settings, date) {
    const normalized = settings?.schemaVersion === 11 ? settings : normalizeCompanySettings(settings);
    const value = date instanceof Date ? date : new Date(`${date}T12:00:00`);
    return normalized.specialWorkRules.find(rule => {
        if (!rule.enabled || rule.kind !== "recurring-day-off" || value.getDay() !== rule.weekday) return false;
        const anchor = new Date(`${rule.anchorDate}T12:00:00`);
        const weekDistance = Math.round((weekStartNumber(value) - weekStartNumber(anchor)) / 7);
        return ((weekDistance % rule.intervalWeeks) + rule.intervalWeeks) % rule.intervalWeeks === 0;
    }) || null;
}

export function companyFreeDaysForRange(settings, from, to) {
    const normalized = normalizeCompanySettings(settings);
    const cursor = from instanceof Date ? new Date(from) : new Date(`${from}T12:00:00`);
    const end = to instanceof Date ? new Date(to) : new Date(`${to}T12:00:00`);
    cursor.setHours(12, 0, 0, 0);
    end.setHours(12, 0, 0, 0);
    const days = [];
    while (cursor < end) {
        const rule = specialWorkRuleForDate(normalized, cursor);
        if (rule) {
            days.push({
                ruleId: rule.id,
                label: rule.label,
                date: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`
            });
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return days;
}

export function getWorkTypeLabel(workTypes, workType, customWorkType) {
    if (customWorkType) return customWorkType;

    return workTypes.find(type => type.id === workType)?.label ?? workType;
}

export async function loadCompanySettings() {
    const data = await getGlobalFile({
        file: "settings-company.json",
        loadFromServer: {
            download: downloadFile,
            path: "/api/settings/company"
        }
    });

    return normalizeCompanySettings(data);
}

function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
