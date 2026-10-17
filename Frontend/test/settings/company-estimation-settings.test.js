import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPANY_SETTINGS,
  normalizeCompanySettings
} from "../../src/services/companySettings.js";

describe("company AI and estimation settings", () => {
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
      schemaVersion: 4,
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
});
