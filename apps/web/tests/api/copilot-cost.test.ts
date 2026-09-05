import { describe, expect, it } from "bun:test";
import { CostScopeSchema, ProposalPayloadSchema } from "@ai-series/copilot";
import {
  PROPOSAL_OUTPUT_CONTRACT_INSTRUCTION,
  derivePaidJobScope,
} from "../../app/api/copilot/_lib/store";
import { POST as confirmInference } from "../../app/api/copilot/conversations/[conversationId]/messages/[messageId]/cost/confirm/route";
import { POST as generate } from "../../app/api/copilot/conversations/[conversationId]/messages/[messageId]/generate/route";
import { POST as quote } from "../../app/api/copilot/proposals/[proposalId]/cost/quote/route";
import { POST as confirm } from "../../app/api/copilot/proposals/[proposalId]/cost/confirm/route";
import { POST as start } from "../../app/api/copilot/proposals/[proposalId]/cost/start/route";

describe("Feature 029 cost API contract", () => {
  it("keeps quote, economic confirmation and effect start as separate commands", () => {
    for (const handler of [confirmInference, generate, quote, confirm, start]) {
      expect(typeof handler).toBe("function");
    }
    expect(new Set([confirmInference, generate, quote, confirm, start]).size).toBe(5);
  });

  it("requires explicit execution dependency in an exact cost scope", () => {
    const base = {
      kind: "proposal_job",
      provider: "fixture",
      model: "fixture-v1",
      purpose: "video.generate",
      units: 1,
      targetRefs: ["shot-1"],
    };
    expect(CostScopeSchema.safeParse(base).success).toBe(false);
    expect(
      CostScopeSchema.safeParse({ ...base, executionDependency: "requires_application_receipt" })
        .success,
    ).toBe(true);
  });

  it("derives paid scope from the approved operation and rejects client economic fields", () => {
    process.env.COPILOT_PAID_MODEL = "fixture-v1";
    process.env.COPILOT_PAID_PRICING_JSON = JSON.stringify({
      version: "test-v1",
      entries: [
        {
          provider: "fal",
          model: "fixture-v1",
          jobType: "video.generate",
          baseUsd: 0.1,
          perSecondUsd: 0.02,
        },
      ],
    });
    const payload = ProposalPayloadSchema.parse({
      schemaVersion: 1,
      operations: [
        { type: "series.create", clientRef: "series:new", name: "Aurora" },
        {
          type: "paid_job.request",
          clientRef: "job:trailer",
          jobType: "video.generate",
          targetRefs: ["series:new"],
          executionDependency: "requires_application_receipt",
          parameters: {
            versionId: "00000000-0000-4000-8000-000000000029",
            variables: { prompt: "Aurora trailer" },
            params: { duration: "8" },
          },
        },
      ],
    });
    expect(derivePaidJobScope(payload, { clientRef: "job:trailer" }).scope).toMatchObject({
      purpose: "video.generate",
      units: 1,
      targetRefs: ["series:new"],
      executionDependency: "requires_application_receipt",
      pricingVersion: "test-v1",
    });
    expect(() =>
      derivePaidJobScope(payload, { clientRef: "job:trailer", units: 999, provider: "attacker" }),
    ).toThrow("server-derived");
    const configuredPricing = process.env.COPILOT_PAID_PRICING_JSON;
    delete process.env.COPILOT_PAID_PRICING_JSON;
    expect(() => derivePaidJobScope(payload, { clientRef: "job:trailer" })).toThrow(
      "pricing is unavailable",
    );
    process.env.COPILOT_PAID_PRICING_JSON = configuredPricing;
  });

  it("requests the same direct typed object that the provider validates", () => {
    expect(PROPOSAL_OUTPUT_CONTRACT_INSTRUCTION).toContain("ProposalPayloadSchema@1");
    expect(PROPOSAL_OUTPUT_CONTRACT_INSTRUCTION).toContain("Do not wrap");
    expect(
      ProposalPayloadSchema.safeParse({
        schemaVersion: 1,
        operations: [{ type: "series.create", clientRef: "series:new", name: "Aurora" }],
      }).success,
    ).toBe(true);
  });
});
