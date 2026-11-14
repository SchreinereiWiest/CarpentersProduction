import { describe, expect, it } from "vitest";
import {
  averageScheduledDayMinutes,
  companyFreeDaysCalendarPayload,
  companyFreeDaysForRange,
  DEFAULT_COMPANY_SETTINGS,
  normalizeCompanySettings,
  scheduledMinutesForDate
} from "../../src/shared/settings/company-settings.js";

describe("company settings", () => {
  it("adds defaults to legacy settings and normalizes search and AI values", () => {
    expect(normalizeCompanySettings({
      workingHours: { start: "08:00", end: "17:00" },
      estimation: {
        candidatePoolSize: 999,
        maximumMatches: 0,
        minimumSimilarity: 45,
        weights: { text: 40 },
        ollama: {
          enabled: true,
          baseUrl: " http://localhost:11434 ",
          embeddingModel: " custom-embed "
        }
      }
    })).toMatchObject({
      schemaVersion: 12,
      workWeek: expect.arrayContaining([
        expect.objectContaining({ weekday: 1, label: "Montag", enabled: true, start: "08:00", end: "17:00" })
      ]),
      management: {
        workflowStates: expect.arrayContaining([{ id: "inbox", label: "Eingang" }]),
        goalTypes: expect.arrayContaining([{ id: "revenue", label: "Umsatzentwicklung", unit: "€" }])
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
        candidatePoolSize: 500,
        maximumMatches: 1,
        minimumSimilarity: 45,
        weights: { text: 40, cabinetCount: 20, materials: 10 },
        ollama: {
          enabled: true,
          baseUrl: "http://localhost:11434",
          embeddingModel: "custom-embed"
        }
      },
      attachmentSearch: {
        enabled: false,
        openWebUiEndpoint: "http://host.docker.internal:3000",
        model: "carpenters-qwen3627b",
        manufacturerWebsites: [],
        allowOpenWebFallback: true
      }
    });
    expect(DEFAULT_COMPANY_SETTINGS.estimation.maximumMatches).toBe(5);
  });

  it("preserves a disabled tips setting", () => {
    expect(normalizeCompanySettings({
      userInterface: { showTips: false, lineLockThresholdCm: "7,5" }
    }).userInterface).toEqual({
      showTips: false,
      lineLockThresholdCm: 7.5,
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
      },
      home: {
        documentTags: ["Rechnung", "Auftragsbestätigung", "Angebot"]
      }
    });
  });

  it("prevents a negative line-lock threshold", () => {
    expect(normalizeCompanySettings({
      userInterface: { lineLockThresholdCm: -2 }
    }).userInterface.lineLockThresholdCm).toBe(0);
  });

  it("normalizes the Aufmaß label size and vertical offset", () => {
    const settings = normalizeCompanySettings({
      userInterface: {
        measurementLabelSizePercent: 240,
        measurementLabelOffsetY: "-42,5"
      }
    });

    expect(settings.userInterface.measurementLabelSizePercent).toBe(200);
    expect(settings.userInterface.measurementLabelOffsetY).toBe(-42.5);
  });

  it("normalizes the printable measurement field dimensions", () => {
    const settings = normalizeCompanySettings({
      userInterface: {
        measurementFormFieldWidthMm: 12,
        measurementFormFieldHeightMm: "14,5"
      }
    });

    expect(settings.userInterface.measurementFormFieldWidthMm).toBe(20);
    expect(settings.userInterface.measurementFormFieldHeightMm).toBe(14.5);
  });

  it("normalizes workspace layout and preserves configured keybindings", () => {
    const settings = normalizeCompanySettings({
      userInterface: {
        workspaceLayout: "grid",
        workspaceScalePercent: 65,
        keybindings: {
          sidebar: "Ctrl+B",
          projectBar: "Ctrl+P",
          apply: "Alt+Enter"
        }
      }
    });

    expect(settings.userInterface.workspaceLayout).toBe("grid");
    expect(settings.userInterface.workspaceScalePercent).toBe(65);
    expect(settings.userInterface.keybindings).toEqual({
      sidebar: "Ctrl+B",
      projectBar: "Ctrl+P",
      apply: "Alt+Enter"
    });
  });

  it("limits the workspace scale to the supported range", () => {
    expect(normalizeCompanySettings({
      userInterface: { workspaceScalePercent: 20 }
    }).userInterface.workspaceScalePercent).toBe(50);
    expect(normalizeCompanySettings({
      userInterface: { workspaceScalePercent: "140" }
    }).userInterface.workspaceScalePercent).toBe(125);
  });

  it("normalizes the document tags used by the admin dashboard", () => {
    expect(normalizeCompanySettings({
      userInterface: { home: { documentTags: [" Rechnung ", "Angebot", "Rechnung", ""] } }
    }).userInterface.home.documentTags).toEqual(["Rechnung", "Angebot"]);
    expect(normalizeCompanySettings({
      userInterface: { home: { documentTags: [] } }
    }).userInterface.home.documentTags).toEqual([]);
  });

  it("uses weekday-specific hours for short working days", () => {
    const settings = normalizeCompanySettings({
      workWeek: DEFAULT_COMPANY_SETTINGS.workWeek.map(day => day.weekday === 5
        ? { ...day, end: "12:00" }
        : day)
    });
    expect(scheduledMinutesForDate(settings, new Date(2026, 10, 13, 12))).toBe(285);
    expect(averageScheduledDayMinutes(settings)).toBe(477);
  });

  it("supports day-specific breaks and every-second-week day-off rules", () => {
    const settings = normalizeCompanySettings({
      workWeek: DEFAULT_COMPANY_SETTINGS.workWeek.map(day => day.weekday === 5
        ? { ...day, end: "13:00", breaks: [day.breaks[0]] }
        : day),
      specialWorkRules: [{
        id: "alternate-friday", label: "Jeder zweite Freitag frei", enabled: true,
        weekday: 5, intervalWeeks: 2, anchorDate: "2026-01-02"
      }]
    });
    expect(scheduledMinutesForDate(settings, new Date(2026, 0, 2, 12))).toBe(0);
    expect(scheduledMinutesForDate(settings, new Date(2026, 0, 9, 12))).toBe(345);
    expect(companyFreeDaysForRange(settings, "2026-01-01", "2026-02-01")).toHaveLength(3);
    const calendar = companyFreeDaysCalendarPayload(settings, 2026);
    expect(calendar).toMatchObject({ year: 2026, days: expect.arrayContaining([
      expect.objectContaining({
        ruleId: "alternate-friday",
        label: "Jeder zweite Freitag frei",
        date: "2026-01-02"
      })
    ]) });
    expect(new Date(calendar.days[0].endAt).getTime()).toBeGreaterThan(new Date(calendar.days[0].startAt).getTime());
  });
});
