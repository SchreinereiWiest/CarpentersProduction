import { downloadFile } from "../api/file-api.js";
import { getGlobalFile } from "../cache/global-cache.js";
import { normalizeEstimationSettings } from "@Engine/calculation/estimation.mjs";

export const CUSTOM_WORK_TYPE_ID = "__custom__";

export const DEFAULT_COMPANY_SETTINGS = {
    schemaVersion: 5,
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
    userInterface: {
        showTips: true,
        lineLockThresholdCm: 5
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

    const workTypes = Array.isArray(data?.workTypes) && data.workTypes.length > 0
        ? data.workTypes
        : DEFAULT_COMPANY_SETTINGS.workTypes;
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
        schemaVersion: 5,
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
        userInterface: {
            showTips: userInterface.showTips !== false,
            lineLockThresholdCm: normalizeLineLockThresholdCm(
                userInterface.lineLockThresholdCm
            )
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
