import { downloadFile } from "./apiTemplates.js";
import { getGlobalFile } from "./globalMemoryCache.js";
import { normalizeEstimationSettings } from "@Engine/calculation/estimation.mjs";

export const CUSTOM_WORK_TYPE_ID = "__custom__";

export const DEFAULT_COMPANY_SETTINGS = {
    schemaVersion: 1,
    workingHours: {
        start: "07:00",
        end: "16:45"
    },
    breaks: [
        {
            id: "morning-break",
            label: "Frühstückspause",
            start: "09:00",
            end: "09:15"
        },
        {
            id: "lunch-break",
            label: "Mittagspause",
            start: "12:00",
            end: "12:45"
        }
    ],
    workTypes: [
        { id: "cutting", label: "Zuschnitt" },
        { id: "edging", label: "Bekantung" },
        { id: "cnc", label: "CNC" },
        { id: "assembly", label: "Zusammenbau" },
        { id: "finishing", label: "Finalisierung" },
        { id: "installation", label: "Montage" }
    ],
    estimation: {
        ...normalizeEstimationSettings(),
        ollama: {
            enabled: false,
            baseUrl: "http://ollama:11434",
            embeddingModel: "nomic-embed-text",
            explanationModel: ""
        }
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

    const workTypes = Array.isArray(data?.workTypes) && data.workTypes.length > 0
        ? data.workTypes
        : DEFAULT_COMPANY_SETTINGS.workTypes;
    const estimation = normalizeEstimationSettings(data?.estimation);
    const ollama = {
        ...DEFAULT_COMPANY_SETTINGS.estimation.ollama,
        ...(data?.estimation?.ollama ?? {})
    };

    return {
        schemaVersion: 2,
        workingHours,
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
        estimation: {
            ...estimation,
            ollama: {
                enabled: Boolean(ollama.enabled),
                baseUrl: String(ollama.baseUrl || "").trim(),
                embeddingModel: String(ollama.embeddingModel || "").trim(),
                explanationModel: String(ollama.explanationModel || "").trim()
            }
        }
    };
}

export function createWorkBlocks(settings) {
    const normalized = normalizeCompanySettings(settings);
    const dayStart = timeToMinutes(normalized.workingHours.start);
    const dayEnd = timeToMinutes(normalized.workingHours.end);
    const blocks = [];
    let cursor = dayStart;

    const sortedBreaks = [...normalized.breaks]
        .sort((left, right) => timeToMinutes(left.start) - timeToMinutes(right.start));

    sortedBreaks.forEach(breakEntry => {
        const breakStart = timeToMinutes(breakEntry.start);
        const breakEnd = timeToMinutes(breakEntry.end);

        if (breakStart > cursor) {
            blocks.push({
                id: blocks.length,
                start: minutesToTime(cursor),
                end: minutesToTime(breakStart),
                duration: breakStart - cursor
            });
        }

        cursor = Math.max(cursor, breakEnd);
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
