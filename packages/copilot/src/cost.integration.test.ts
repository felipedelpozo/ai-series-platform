import { describe, expect, it } from "bun:test";
import type { CostConfirmation, CostQuote, CostScope } from "./contracts";
import {
  confirmCostQuote,
  CostGateError,
  createCostQuote,
  startConfirmedCost,
  type CostRepository,
  type CostStartResult,
  type CostTransaction,
} from "./cost";
import { sha256Fingerprint } from "./fingerprint";

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, "0")}`;
const fp = (value: string) => sha256Fingerprint(value);

class AtomicMemoryCostStore implements CostRepository, CostTransaction {
  private tail: Promise<void> = Promise.resolve();
  readonly workspaceId = id("1");
  readonly actorUserId = id("2");
  readonly revisionId = id("3");
  readonly approvalId = id("4");
  authority = {
    workspaceId: this.workspaceId,
    actorUserId: this.actorUserId,
    role: "owner" as const,
    canSpend: true,
  };
  quota = { availableCredits: 20, fingerprint: fp("quota-20") };
  target = { targetFingerprint: fp("target"), estimateFingerprint: fp("estimate") };
  approval = {
    id: this.approvalId,
    workspaceId: this.workspaceId,
    revisionId: this.revisionId,
    revisionFingerprint: fp("revision"),
    diffFingerprint: fp("diff"),
    baseFingerprint: fp("base"),
    usable: true,
  };
  receipt = false;
  quote: CostQuote | null = null;
  confirmation: CostConfirmation | null = null;
  readonly jobs = new Map<string, CostStartResult>();
  reservations = 0;

  async transaction<T>(work: (tx: CostTransaction) => Promise<T>): Promise<T> {
    let release!: () => void;
    const turn = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.tail;
    this.tail = turn;
    await previous;
    try {
      return await work(this);
    } finally {
      release();
    }
  }
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
    return this.receipt;
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
  async reserveInference(input: { intentKey: string; credits: number }): Promise<CostStartResult> {
    return this.reserve(input, "reserved");
  }
  async startOrReuseJob(input: { intentKey: string; credits: number }): Promise<CostStartResult> {
    return this.reserve(input, "queued");
  }
  private reserve(
    input: { intentKey: string; credits: number },
    status: "reserved" | "queued",
  ): CostStartResult {
    const existing = this.jobs.get(input.intentKey);
    if (existing) return { ...existing, created: false };
    if (this.quota.availableCredits < input.credits) throw new CostGateError("quota_exceeded");
    this.quota.availableCredits -= input.credits;
    this.reservations += 1;
    const result = { jobId: id(String(100 + this.jobs.size)), created: true, status } as const;
    this.jobs.set(input.intentKey, result);
    return result;
  }
}

function proposalScope(dependency: CostScope["executionDependency"]): CostScope {
  return {
    kind: "proposal_job",
    provider: "deterministic-test",
    model: "fixture-v1",
    purpose: "image.generate",
    units: 3,
    targetRefs: ["cover-art"],
    executionDependency: dependency,
  };
}

async function prepare(store: AtomicMemoryCostStore, dependency: CostScope["executionDependency"]) {
  const quote = await createCostQuote(store, {
    id: id("5"),
    workspaceId: store.workspaceId,
    actorUserId: store.actorUserId,
    revisionId: store.revisionId,
    messageId: null,
    approvalId: store.approvalId,
    scope: proposalScope(dependency),
    currency: "USD",
    maximumAmount: "0.25",
    credits: 3,
    expiresAt: new Date("2030-01-01T00:10:00.000Z"),
    now: new Date("2030-01-01T00:00:00.000Z"),
  });
  const confirmation = await confirmCostQuote(store, {
    id: id("6"),
    workspaceId: store.workspaceId,
    actorUserId: store.actorUserId,
    quoteId: quote.id,
    quoteFingerprint: quote.quoteFingerprint,
    now: new Date("2030-01-01T00:01:00.000Z"),
  });
  return { quote, confirmation };
}

describe("atomic cost start", () => {
  it("deduplicates ten concurrent starts and reserves quota once", async () => {
    const store = new AtomicMemoryCostStore();
    const { confirmation } = await prepare(store, "independent");
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        startConfirmedCost(store, {
          workspaceId: store.workspaceId,
          actorUserId: store.actorUserId,
          confirmationId: confirmation.id,
          now: new Date("2030-01-01T00:02:00.000Z"),
        }),
      ),
    );
    expect(new Set(results.map((result) => result.jobId)).size).toBe(1);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(store.reservations).toBe(1);
    expect(store.quota.availableCredits).toBe(17);
  });

  it("allows independent paid work before canonical application", async () => {
    const store = new AtomicMemoryCostStore();
    const { confirmation } = await prepare(store, "independent");
    const result = await startConfirmedCost(store, {
      workspaceId: store.workspaceId,
      actorUserId: store.actorUserId,
      confirmationId: confirmation.id,
      now: new Date("2030-01-01T00:02:00.000Z"),
    });
    expect(result.status).toBe("queued");
  });

  it("requires the exact application receipt for dependent paid work", async () => {
    const store = new AtomicMemoryCostStore();
    const { confirmation } = await prepare(store, "requires_application_receipt");
    const command = {
      workspaceId: store.workspaceId,
      actorUserId: store.actorUserId,
      confirmationId: confirmation.id,
      now: new Date("2030-01-01T00:02:00.000Z"),
    };
    await expect(startConfirmedCost(store, command)).rejects.toEqual(
      new CostGateError("missing_receipt"),
    );
    expect(store.reservations).toBe(0);
    store.receipt = true;
    expect((await startConfirmedCost(store, command)).created).toBe(true);
  });

  it("does not start after approval or quota evidence changes", async () => {
    for (const mutate of [
      (store: AtomicMemoryCostStore) => {
        store.approval.usable = false;
      },
      (store: AtomicMemoryCostStore) => {
        store.target.targetFingerprint = fp("new-target");
      },
      (store: AtomicMemoryCostStore) => {
        store.quota.fingerprint = fp("new-quota");
      },
    ]) {
      const store = new AtomicMemoryCostStore();
      const { confirmation } = await prepare(store, "independent");
      mutate(store);
      await expect(
        startConfirmedCost(store, {
          workspaceId: store.workspaceId,
          actorUserId: store.actorUserId,
          confirmationId: confirmation.id,
          now: new Date("2030-01-01T00:02:00.000Z"),
        }),
      ).rejects.toBeInstanceOf(CostGateError);
      expect(store.reservations).toBe(0);
    }
  });
});
