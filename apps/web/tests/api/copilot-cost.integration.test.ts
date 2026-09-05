import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { schema } from "@ai-series/db";
import {
  confirmQuote,
  createProposalCostQuote,
  startPaidCost,
} from "../../app/api/copilot/_lib/store";
import {
  createRuntimeHarness,
  hasDatabase,
  type RuntimeHarness,
} from "./copilot-runtime-integration-helpers";

describe.skipIf(!hasDatabase)("copilot PostgreSQL paid-work gate", () => {
  let harness: RuntimeHarness;
  beforeAll(async () => {
    process.env.COPILOT_PAID_MODEL = "fixture-v1";
    process.env.COPILOT_PAID_PRICING_JSON = JSON.stringify({
      version: "integration-v1",
      entries: [
        {
          provider: "fal",
          model: "fixture-v1",
          jobType: "image.generate",
          baseUsd: 0.05,
          resolutionMultipliers: { portrait_4_3: 1 },
        },
      ],
    });
    harness = await createRuntimeHarness("ai_series_copilot_cost_test");
  });
  afterAll(async () => {
    await harness?.close();
  });

  async function approvedPaid(slug: string) {
    const { workspace, user } = await harness.actor(slug, "owner");
    const chain = await harness.proposal({
      workspaceId: workspace.id,
      actorUserId: user.id,
      payload: {
        schemaVersion: 1,
        operations: [
          {
            type: "series.create",
            clientRef: "series",
            name: "Paid target",
            slug: `${slug}-target`,
          },
          {
            type: "paid_job.request",
            clientRef: "render",
            jobType: "image.generate",
            targetRefs: ["series"],
            executionDependency: "independent",
            parameters: {
              versionId: "00000000-0000-4000-8000-000000000029",
              variables: { prompt: "Paid target" },
              params: { image_size: "portrait_4_3" },
            },
          },
        ],
      },
    });
    await harness.approve({
      workspaceId: workspace.id,
      actorUserId: user.id,
      proposalId: chain.proposal.id,
      revisionId: chain.revision.id,
      fingerprint: chain.revision.fingerprint,
    });
    return { workspace, user, chain };
  }

  it("derives scope server-side and rejects scope, actor, role and quota tampering", async () => {
    const item = await approvedPaid("cost-tamper");
    await expect(
      createProposalCostQuote(harness.db, {
        workspaceId: item.workspace.id,
        actorUserId: item.user.id,
        proposalId: item.chain.proposal.id,
        revisionId: item.chain.revision.id,
        fingerprint: item.chain.revision.fingerprint,
        scope: { provider: "attacker" },
      }),
    ).rejects.toMatchObject({ code: "invalid_scope" });
    const quote = await createProposalCostQuote(harness.db, {
      workspaceId: item.workspace.id,
      actorUserId: item.user.id,
      proposalId: item.chain.proposal.id,
      revisionId: item.chain.revision.id,
      fingerprint: item.chain.revision.fingerprint,
      scope: { clientRef: "render" },
    });
    await expect(
      confirmQuote(harness.db, {
        workspaceId: item.workspace.id,
        actorUserId: crypto.randomUUID(),
        quoteId: quote.id,
        quoteFingerprint: quote.quoteFingerprint,
        revisionId: item.chain.revision.id,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    await harness.membership(item.workspace.id, item.user.id, "viewer");
    await expect(
      confirmQuote(harness.db, {
        workspaceId: item.workspace.id,
        actorUserId: item.user.id,
        quoteId: quote.id,
        quoteFingerprint: quote.quoteFingerprint,
        revisionId: item.chain.revision.id,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });

    const quotaItem = await approvedPaid("cost-quota-change");
    const quotaQuote = await createProposalCostQuote(harness.db, {
      workspaceId: quotaItem.workspace.id,
      actorUserId: quotaItem.user.id,
      proposalId: quotaItem.chain.proposal.id,
      revisionId: quotaItem.chain.revision.id,
      fingerprint: quotaItem.chain.revision.fingerprint,
      scope: { clientRef: "render" },
    });
    await harness.db
      .update(schema.workspaceQuotas)
      .set({ creditsUsed: 1 })
      .where(eq(schema.workspaceQuotas.workspaceId, quotaItem.workspace.id));
    await expect(
      confirmQuote(harness.db, {
        workspaceId: quotaItem.workspace.id,
        actorUserId: quotaItem.user.id,
        quoteId: quotaQuote.id,
        quoteFingerprint: quotaQuote.quoteFingerprint,
        revisionId: quotaItem.chain.revision.id,
      }),
    ).rejects.toMatchObject({ code: "quota_changed" });
  });

  it("deduplicates concurrent starts and reserves quota exactly once", async () => {
    const item = await approvedPaid("cost-concurrent");
    const quote = await createProposalCostQuote(harness.db, {
      workspaceId: item.workspace.id,
      actorUserId: item.user.id,
      proposalId: item.chain.proposal.id,
      revisionId: item.chain.revision.id,
      fingerprint: item.chain.revision.fingerprint,
      scope: { clientRef: "render" },
    });
    const confirmation = await confirmQuote(harness.db, {
      workspaceId: item.workspace.id,
      actorUserId: item.user.id,
      quoteId: quote.id,
      quoteFingerprint: quote.quoteFingerprint,
      revisionId: item.chain.revision.id,
    });
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        startPaidCost(harness.db, {
          workspaceId: item.workspace.id,
          actorUserId: item.user.id,
          proposalId: item.chain.proposal.id,
          confirmationId: confirmation.id,
          idempotencyKey: `cost-${index}`,
        }),
      ),
    );
    expect(new Set(results.map(({ jobId }) => jobId)).size).toBe(1);
    expect(results.filter(({ created }) => created)).toHaveLength(1);
    const [quota] = await harness.db
      .select()
      .from(schema.workspaceQuotas)
      .where(eq(schema.workspaceQuotas.workspaceId, item.workspace.id));
    expect(quota?.creditsUsed).toBe(Number(quote.units));
    expect(
      await harness.db
        .select()
        .from(schema.copilotJobBindings)
        .where(eq(schema.copilotJobBindings.confirmationId, confirmation.id)),
    ).toHaveLength(1);
  });
});
