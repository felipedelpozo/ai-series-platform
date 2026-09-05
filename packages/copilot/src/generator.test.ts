import { describe, expect, it } from "bun:test";
import { z } from "zod";
import {
  CopilotGenerationError,
  generateConfirmedCopilotObject,
  type ConfirmedInference,
  type InferenceAccountingPort,
} from "./generator";

const confirmation: ConfirmedInference = {
  workspaceId: "00000000-0000-4000-8000-000000000001",
  actorUserId: "00000000-0000-4000-8000-000000000002",
  conversationId: "00000000-0000-4000-8000-000000000003",
  messageId: "00000000-0000-4000-8000-000000000004",
  confirmationId: "00000000-0000-4000-8000-000000000005",
  quoteId: "00000000-0000-4000-8000-000000000006",
  quoteFingerprint: "a".repeat(64),
  scopeFingerprint: "b".repeat(64),
  quotaFingerprint: "c".repeat(64),
  promptSnapshotId: "00000000-0000-4000-8000-000000000007",
  promptSnapshotFingerprint: "d".repeat(64),
  promptPurpose: "copilot.proposal",
  promptVersionId: "00000000-0000-4000-8000-000000000008",
  promptVersion: 3,
};

function accounting(overrides: Partial<InferenceAccountingPort> = {}) {
  const finished: Parameters<InferenceAccountingPort["finish"]>[0][] = [];
  const port: InferenceAccountingPort = {
    async reserveExact(input) {
      return {
        ...input,
        reservationId: "00000000-0000-4000-8000-000000000009",
        provider: "openai",
        model: "gpt-4o-mini",
        renderedPrompt: "trusted snapshot",
        maximumCost: 0.02,
        currency: "USD",
      };
    },
    async finish(input) {
      finished.push(input);
    },
    ...overrides,
  };
  return { port, finished };
}

describe("confirmed copilot generation", () => {
  it("reserves before inference and records exact attribution", async () => {
    const events: string[] = [];
    const { port, finished } = accounting({
      async reserveExact(input) {
        events.push("reserve");
        return {
          ...input,
          reservationId: "00000000-0000-4000-8000-000000000009",
          provider: "openai",
          model: "gpt-4o-mini",
          renderedPrompt: "trusted snapshot",
          maximumCost: 0.02,
          currency: "USD",
        };
      },
    });
    const result = await generateConfirmedCopilotObject({
      confirmation,
      schema: z.object({ title: z.string() }),
      accounting: port,
      modelPort: {
        async generate(input) {
          events.push("generate");
          expect(input.renderedPrompt).toBe("trusted snapshot");
          return {
            object: { title: "Series" },
            provider: input.provider,
            model: input.model,
            resolvedModel: "gpt-4o-mini-2026-08-01",
            usage: { inputUnits: 101, outputUnits: 29, totalUnits: 130 },
            durationMs: 45,
            actualCost: 0.0042,
            providerRequestId: "provider-request",
          };
        },
      },
      generatedRevisionId: "00000000-0000-4000-8000-000000000010",
    });

    expect(result).toEqual({ title: "Series" });
    expect(events).toEqual(["reserve", "generate"]);
    expect(finished).toHaveLength(1);
    expect(finished[0]).toMatchObject({
      status: "succeeded",
      inputUnits: 101,
      outputUnits: 29,
      durationMs: 45,
      actualCost: 0.0042,
      providerRequestId: "provider-request",
      resolvedModel: "gpt-4o-mini-2026-08-01",
      generatedRevisionId: "00000000-0000-4000-8000-000000000010",
    });
    expect(finished[0]!.reservation.promptPurpose).toBe("copilot.proposal");
    expect(finished[0]!.reservation.promptVersion).toBe(3);
  });

  it("never invokes a provider when exact reservation fails", async () => {
    let invoked = false;
    const { port } = accounting({
      async reserveExact() {
        throw new Error("confirmation changed");
      },
    });
    await expect(
      generateConfirmedCopilotObject({
        confirmation,
        schema: z.object({ title: z.string() }),
        accounting: port,
        modelPort: {
          async generate() {
            invoked = true;
            throw new Error("must not run");
          },
        },
      }),
    ).rejects.toThrow("confirmation changed");
    expect(invoked).toBe(false);
  });

  it("rejects a reservation that does not repeat the exact confirmation", async () => {
    let invoked = false;
    const { port } = accounting({
      async reserveExact(input) {
        return {
          ...input,
          quoteFingerprint: "f".repeat(64),
          reservationId: "00000000-0000-4000-8000-000000000009",
          provider: "openai",
          model: "gpt-4o-mini",
          renderedPrompt: "trusted snapshot",
          maximumCost: 0.02,
          currency: "USD",
        };
      },
    });
    await expect(
      generateConfirmedCopilotObject({
        confirmation,
        schema: z.object({ title: z.string() }),
        accounting: port,
        modelPort: {
          async generate() {
            invoked = true;
            throw new Error("must not run");
          },
        },
      }),
    ).rejects.toEqual(new CopilotGenerationError("accounting_failed"));
    expect(invoked).toBe(false);
  });

  it("records invalid provider output without exposing it", async () => {
    const { port, finished } = accounting();
    await expect(
      generateConfirmedCopilotObject({
        confirmation,
        schema: z.object({ title: z.string().min(1) }),
        accounting: port,
        modelPort: {
          async generate(input) {
            return {
              object: { title: "" },
              provider: input.provider,
              model: input.model,
              usage: { inputUnits: 5, outputUnits: 2, totalUnits: 7 },
              durationMs: 10,
            };
          },
        },
      }),
    ).rejects.toEqual(new CopilotGenerationError("invalid_output"));
    expect(finished[0]).toMatchObject({
      status: "failed",
      failureCode: "invalid_output",
      inputUnits: 5,
      outputUnits: 2,
    });
  });

  it("records provider failure with a stable safe error", async () => {
    const { port, finished } = accounting();
    await expect(
      generateConfirmedCopilotObject({
        confirmation,
        schema: z.object({ title: z.string() }),
        accounting: port,
        modelPort: {
          async generate() {
            throw new Error("secret upstream response");
          },
        },
      }),
    ).rejects.toEqual(new CopilotGenerationError("provider_failed"));
    expect(finished[0]).toMatchObject({ status: "failed", failureCode: "provider_failed" });
  });
});
