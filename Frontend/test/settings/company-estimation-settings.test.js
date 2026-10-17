import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPANY_SETTINGS,
  normalizeCompanySettings
} from "../../src/services/companySettings.js";

describe("company estimation settings", () => {
  it("adds defaults to legacy settings and normalizes search and Ollama values", () => {
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
      schemaVersion: 2,
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
      }
    });
    expect(DEFAULT_COMPANY_SETTINGS.estimation.maximumMatches).toBe(5);
  });
});
