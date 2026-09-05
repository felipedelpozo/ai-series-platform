import { describe, expect, it } from "bun:test";
import {
  createPaidGenerationJob,
  InvalidGenerationJobInputError,
  parseGenerationJobInput,
} from "@ai-series/generation";
import { shouldRetryWorkerError, verifiedProviderActualCost } from "./worker";

const TEMPLATE_ID = "11111111-1111-4111-8111-111111111111";
const ASSET_ID = "22222222-2222-4222-8222-222222222222";

describe("generation job input", () => {
  it("uses the claimed job workspace as the only tenant authority", () => {
    expect(
      parseGenerationJobInput(
        "image",
        {
          templateId: TEMPLATE_ID,
          variables: { subject: "hero" },
          params: { seed: 42 },
        },
        { workspaceId: "workspace-a" },
      ),
    ).toEqual({
      kind: "image",
      input: {
        workspaceId: "workspace-a",
        templateId: TEMPLATE_ID,
        versionId: undefined,
        variables: { subject: "hero" },
        params: { image_size: undefined, seed: 42 },
        model: undefined,
      },
    });
  });

  it("accepts a redundant matching workspace and rejects a mismatch", () => {
    expect(
      parseGenerationJobInput(
        "video",
        {
          workspaceId: "workspace-a",
          templateId: TEMPLATE_ID,
          variables: {},
          sourceAssetId: ASSET_ID,
        },
        { workspaceId: "workspace-a" },
      ).input.workspaceId,
    ).toBe("workspace-a");

    expect(() =>
      parseGenerationJobInput(
        "image",
        { workspaceId: "workspace-b", templateId: TEMPLATE_ID, variables: {} },
        { workspaceId: "workspace-a" },
      ),
    ).toThrow("Generation job workspace mismatch");
  });

  it("rejects malformed input instead of coercing it", () => {
    expect(() => parseGenerationJobInput("image", null, { workspaceId: "workspace-a" })).toThrow(
      "Invalid generation job input",
    );
    expect(() =>
      parseGenerationJobInput(
        "image",
        { templateId: TEMPLATE_ID, variables: { seed: 42 } },
        { workspaceId: "workspace-a" },
      ),
    ).toThrow("Invalid generation variables");
    expect(() =>
      parseGenerationJobInput(
        "video",
        { templateId: TEMPLATE_ID, variables: {}, params: [] },
        { workspaceId: "workspace-a" },
      ),
    ).toThrow("Invalid generation params");
    expect(() =>
      parseGenerationJobInput(
        "video",
        { templateId: TEMPLATE_ID, variables: {}, sourceAssetId: 42 },
        { workspaceId: "workspace-a" },
      ),
    ).toThrow("Invalid sourceAssetId");
  });

  it("maps valid image and video paid operations to exact worker jobs", () => {
    expect(
      createPaidGenerationJob({
        workspaceId: "workspace-a",
        model: "approved-image-model",
        units: 2,
        operation: {
          jobType: "image.generate",
          parameters: {
            templateId: TEMPLATE_ID,
            variables: { subject: "hero" },
            params: { image_size: "portrait_4_3", seed: 7 },
          },
        },
      }),
    ).toEqual({
      kind: "image",
      input: {
        workspaceId: "workspace-a",
        templateId: TEMPLATE_ID,
        versionId: undefined,
        variables: { subject: "hero" },
        params: { image_size: "portrait_4_3", seed: 7 },
        model: "approved-image-model",
      },
      billing: {
        units: 2,
        durationSeconds: null,
        resolution: "portrait_4_3",
        aspectRatio: null,
      },
    });

    expect(
      createPaidGenerationJob({
        workspaceId: "workspace-a",
        model: "approved-video-model",
        units: 3,
        operation: {
          jobType: "video.generate",
          parameters: {
            templateId: TEMPLATE_ID,
            variables: { subject: "hero" },
            sourceAssetId: ASSET_ID,
            params: { aspect_ratio: "9:16", duration: "5" },
          },
        },
      }),
    ).toEqual({
      kind: "video",
      input: {
        workspaceId: "workspace-a",
        templateId: TEMPLATE_ID,
        versionId: undefined,
        variables: { subject: "hero" },
        sourceAssetId: ASSET_ID,
        params: { aspect_ratio: "9:16", duration: "5" },
        model: "approved-video-model",
      },
      billing: {
        units: 3,
        durationSeconds: 5,
        resolution: "provider_default",
        aspectRatio: "9:16",
      },
    });
  });

  it("rejects unsupported paid operations and authority overrides", () => {
    expect(() =>
      createPaidGenerationJob({
        workspaceId: "workspace-a",
        model: "approved-model",
        units: 1,
        operation: { jobType: "audio.generate", parameters: {} },
      }),
    ).toThrow("Unsupported paid generation operation");

    for (const parameters of [
      { workspaceId: "workspace-b", templateId: TEMPLATE_ID, variables: {} },
      { model: "attacker-model", templateId: TEMPLATE_ID, variables: {} },
    ]) {
      expect(() =>
        createPaidGenerationJob({
          workspaceId: "workspace-a",
          model: "approved-model",
          units: 1,
          operation: { jobType: "image.generate", parameters },
        }),
      ).toThrow(InvalidGenerationJobInputError);
    }
  });

  it("classifies incompatible operation payloads as non-recoverable", () => {
    expect(shouldRetryWorkerError(new InvalidGenerationJobInputError("invalid payload"))).toBe(
      false,
    );
    expect(shouldRetryWorkerError(new Error("provider temporarily unavailable"))).toBe(true);
  });

  it("bounds billable catalog values and units", () => {
    const base = {
      workspaceId: "workspace-a",
      model: "approved-model",
      operation: {
        jobType: "video.generate",
        parameters: { templateId: TEMPLATE_ID, variables: {} },
      },
    };
    expect(() => createPaidGenerationJob({ ...base, units: 0 })).toThrow(
      "Invalid paid generation units",
    );
    expect(() => createPaidGenerationJob({ ...base, units: 101 })).toThrow(
      "Invalid paid generation units",
    );
    expect(() =>
      createPaidGenerationJob({
        ...base,
        units: 1,
        operation: {
          ...base.operation,
          parameters: {
            templateId: TEMPLATE_ID,
            variables: {},
            params: { duration: "60", aspect_ratio: "21:9" },
          },
        },
      }),
    ).toThrow(InvalidGenerationJobInputError);
  });

  it("never substitutes an estimate for unverified actual provider cost", () => {
    expect(verifiedProviderActualCost(undefined)).toBeUndefined();
    expect(verifiedProviderActualCost({ amount: 0.25 })).toBeUndefined();
    expect(
      verifiedProviderActualCost({ source: "provider_response", verified: true, amount: 0.25 }),
    ).toBe(0.25);
    expect(
      verifiedProviderActualCost({ source: "provider_response", verified: true, amount: -1 }),
    ).toBeUndefined();
  });
});
