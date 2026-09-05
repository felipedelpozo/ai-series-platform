import { describe, expect, it } from "bun:test";
import type { CostConfirmation, CostQuote, CostScope } from "./contracts";
import {
  confirmCostQuote,
  CostGateError,
  createCostQuote,
  type CostRepository,
  type CostStartResult,
  type CostTransaction,
} from "./cost";
import { sha256Fingerprint } from "./fingerprint";

const ids = {
  workspace: "00000000-0000-4000-8000-000000000001",
  actor: "00000000-0000-4000-8000-000000000002",
  revision: "00000000-0000-4000-8000-000000000003",
  message: "00000000-0000-4000-8000-000000000004",
  approval: "00000000-0000-4000-8000-000000000005",
  quote: "00000000-0000-4000-8000-000000000006",
  confirmation: "00000000-0000-4000-8000-000000000007",
};

function fp(value: string): string {
  return sha256Fingerprint(value);
}

function scope(kind: "inference" | "proposal_job" = "proposal_job"): CostScope {
  return {
    kind,
    provider: "openai",
    model: "gpt-4o-mini",
    purpose: kind === "inference" ? "copilot.proposal" : "image.generate",
    units: 1,
    targetRefs: ["target-1"],
    executionDependency: "independent",
  };
}

class MemoryTransaction implements CostTransaction {
  authority = {
    workspaceId: ids.workspace,
    actorUserId: ids.actor,
    role: "owner" as const,
    canSpend: true,
  };
  quota = { availableCredits: 10, fingerprint: fp("quota-10") };
  target = { targetFingerprint: fp("target"), estimateFingerprint: fp("estimate") };
  approval = {
    id: ids.approval,
    workspaceId: ids.workspace,
    revisionId: ids.revision,
    revisionFingerprint: fp("revision"),
    diffFingerprint: fp("diff"),
    baseFingerprint: fp("base"),
    usable: true,
  };
  quote: CostQuote | null = null;
  confirmation: CostConfirmation | null = null;

  async getAuthority() {
    return this.authority;
  }
  async getQuota() {
    return this.quota;
  }
  async getTargetEvidence() {
    return this.target;
  }
  async getApproval() {
    return this.approval;
  }
  async hasApplicationReceipt() {
    return false;
  }
  async getQuoteForUpdate() {
    return this.quote;
  }
  async getConfirmationForQuote() {
    return this.confirmation;
  }
  async getConfirmationForUpdate() {
    return this.confirmation;
  }
  async insertQuote(quote: CostQuote) {
    this.quote = quote;
    return quote;
  }
  async insertConfirmation(confirmation: CostConfirmation) {
    this.confirmation ??= confirmation;
    return this.confirmation;
  }
  async reserveInference(): Promise<CostStartResult> {
    return { jobId: "inference", created: true, status: "reserved" };
  }
  async startOrReuseJob(): Promise<CostStartResult> {
    return { jobId: "job", created: true, status: "queued" };
  }
}

function repository(tx: MemoryTransaction): CostRepository {
  return {
    async transaction(work) {
      return work(tx);
    },
  };
}

async function makeQuote(
  tx: MemoryTransaction,
  kind: "inference" | "proposal_job" = "proposal_job",
) {
  return createCostQuote(repository(tx), {
    id: ids.quote,
    workspaceId: ids.workspace,
    actorUserId: ids.actor,
    revisionId: kind === "proposal_job" ? ids.revision : null,
    messageId: kind === "inference" ? ids.message : null,
    approvalId: kind === "proposal_job" ? ids.approval : null,
    scope: scope(kind),
    currency: "USD",
    maximumAmount: "0.020000",
    credits: 2,
    expiresAt: new Date("2030-01-01T00:05:00.000Z"),
    now: new Date("2030-01-01T00:00:00.000Z"),
  });
}

describe("cost quote and confirmation", () => {
  it("binds a paid quote to exact editorial, scope, estimate and quota evidence", async () => {
    const tx = new MemoryTransaction();
    const quote = await makeQuote(tx);
    expect(quote.approvalId).toBe(ids.approval);
    expect(quote.scopeFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(quote.quoteFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(quote.quotaFingerprint).toBe(tx.quota.fingerprint);

    const confirmation = await confirmCostQuote(repository(tx), {
      id: ids.confirmation,
      workspaceId: ids.workspace,
      actorUserId: ids.actor,
      quoteId: ids.quote,
      quoteFingerprint: quote.quoteFingerprint,
      now: new Date("2030-01-01T00:01:00.000Z"),
    });
    expect(confirmation).toMatchObject({
      quoteId: quote.id,
      actorUserId: ids.actor,
      scopeFingerprint: quote.scopeFingerprint,
      quotaFingerprint: quote.quotaFingerprint,
    });
  });

  it("supports a message-bound inference quote without editorial approval", async () => {
    const tx = new MemoryTransaction();
    tx.approval.usable = false;
    const quote = await makeQuote(tx, "inference");
    expect(quote.messageId).toBe(ids.message);
    expect(quote.revisionId).toBeNull();
    expect(quote.approvalId).toBeNull();
  });

  it("expires an exact quote without creating confirmation", async () => {
    const tx = new MemoryTransaction();
    const quote = await makeQuote(tx);
    await expect(
      confirmCostQuote(repository(tx), {
        id: ids.confirmation,
        workspaceId: ids.workspace,
        actorUserId: ids.actor,
        quoteId: ids.quote,
        quoteFingerprint: quote.quoteFingerprint,
        now: new Date("2030-01-01T00:06:00.000Z"),
      }),
    ).rejects.toEqual(new CostGateError("expired"));
    expect(tx.confirmation).toBeNull();
  });

  it("invalidates confirmation when target, estimate, approval or quota changes", async () => {
    const mutators: Array<(tx: MemoryTransaction) => void> = [
      (tx) => {
        tx.target.targetFingerprint = fp("changed-target");
      },
      (tx) => {
        tx.target.estimateFingerprint = fp("changed-estimate");
      },
      (tx) => {
        tx.approval.revisionFingerprint = fp("changed-revision");
      },
      (tx) => {
        tx.quota.fingerprint = fp("changed-quota");
      },
    ];
    for (const mutate of mutators) {
      const tx = new MemoryTransaction();
      const quote = await makeQuote(tx);
      mutate(tx);
      await expect(
        confirmCostQuote(repository(tx), {
          id: ids.confirmation,
          workspaceId: ids.workspace,
          actorUserId: ids.actor,
          quoteId: ids.quote,
          quoteFingerprint: quote.quoteFingerprint,
          now: new Date("2030-01-01T00:01:00.000Z"),
        }),
      ).rejects.toBeInstanceOf(CostGateError);
      expect(tx.confirmation).toBeNull();
    }
  });

  it("denies viewers and actors without spend authority", async () => {
    for (const authority of [
      { role: "viewer" as const, canSpend: true },
      { role: "editor" as const, canSpend: false },
    ]) {
      const tx = new MemoryTransaction();
      Object.assign(tx.authority, authority);
      if (authority.role === "viewer") {
        await expect(makeQuote(tx)).rejects.toEqual(new CostGateError("forbidden"));
      } else {
        const quote = await makeQuote(tx);
        await expect(
          confirmCostQuote(repository(tx), {
            id: ids.confirmation,
            workspaceId: ids.workspace,
            actorUserId: ids.actor,
            quoteId: ids.quote,
            quoteFingerprint: quote.quoteFingerprint,
          }),
        ).rejects.toEqual(new CostGateError("forbidden"));
      }
    }
  });
});
