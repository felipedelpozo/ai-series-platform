import { describe, expect, it } from "bun:test";
import {
  calculateCopilotActualCost,
  COPILOT_AI_LIMITS,
  estimateCopilotMaximumCost,
  getCopilotInferenceMetadata,
  normalizeCopilotUsage,
} from "./copilot";

describe("copilot AI attribution", () => {
  it("normalizes current and legacy provider usage without a network call", () => {
    expect(normalizeCopilotUsage({ inputTokens: 12.8, outputTokens: 4, totalTokens: 16 })).toEqual({
      inputUnits: 12,
      outputUnits: 4,
      totalUnits: 16,
    });
    expect(normalizeCopilotUsage({ promptTokens: 3, completionTokens: 2 })).toEqual({
      inputUnits: 3,
      outputUnits: 2,
      totalUnits: 5,
    });
  });

  it("does not accept negative or non-finite usage", () => {
    expect(
      normalizeCopilotUsage({ inputTokens: -1, outputTokens: Number.POSITIVE_INFINITY }),
    ).toEqual({ inputUnits: 0, outputUnits: 0, totalUnits: 0 });
  });

  it("exposes the exact bounded inference envelope before a provider call", () => {
    const metadata = getCopilotInferenceMetadata({ prompt: "idea 🎬", model: "gpt-4o-mini" });
    expect(metadata).toEqual({
      provider: "openai",
      model: "gpt-4o-mini",
      promptCharacters: 7,
      promptUtf8Bytes: 9,
      maximumInputTokens: 9,
      maximumOutputTokens: COPILOT_AI_LIMITS.maxOutputTokens,
    });
    expect(() =>
      getCopilotInferenceMetadata({
        prompt: "x".repeat(COPILOT_AI_LIMITS.maxPromptCharacters + 1),
        model: "gpt-4o-mini",
      }),
    ).toThrow("outside the allowed size");
  });

  it("derives maximum and actual costs from server-supplied token pricing", () => {
    const metadata = getCopilotInferenceMetadata({ prompt: "abc", model: "gpt-4o-mini" });
    const pricing = {
      currency: "USD",
      inputPerMillionTokens: 0.15,
      outputPerMillionTokens: 0.6,
    };
    expect(estimateCopilotMaximumCost(metadata, pricing)).toEqual({
      currency: "USD",
      maximumAmount: "0.002459",
    });
    expect(
      calculateCopilotActualCost(
        { inputUnits: 1_000, outputUnits: 500, totalUnits: 1_500 },
        pricing,
      ),
    ).toEqual({ currency: "USD", actualAmount: "0.000450" });
  });
});
