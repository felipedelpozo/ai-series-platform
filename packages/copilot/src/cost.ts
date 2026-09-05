import type { CostConfirmation, CostQuote, CostScope } from "./contracts";
import { CostConfirmationSchema, CostQuoteSchema, CostScopeSchema } from "./contracts";
import { createScopeFingerprint, createWorkspaceIntentKey, sha256Fingerprint } from "./fingerprint";

export type CostRole = "viewer" | "editor" | "owner";

export type CostAuthority = Readonly<{
  workspaceId: string;
  actorUserId: string;
  role: CostRole;
  canSpend: boolean;
}>;

export type QuotaEvidence = Readonly<{
  availableCredits: number;
  fingerprint: string;
}>;

export type CostTargetEvidence = Readonly<{
  targetFingerprint: string;
  estimateFingerprint: string;
}>;

export type EditorialApprovalEvidence = Readonly<{
  id: string;
  workspaceId: string;
  revisionId: string;
  revisionFingerprint: string;
  diffFingerprint: string;
  baseFingerprint: string;
  usable: boolean;
}>;

export type CostStartResult = Readonly<{
  jobId: string;
  created: boolean;
  status: "reserved" | "queued" | "running" | "succeeded";
}>;

export interface CostTransaction {
  getAuthority(input: { workspaceId: string; actorUserId: string }): Promise<CostAuthority | null>;
  getQuota(input: { workspaceId: string; actorUserId: string }): Promise<QuotaEvidence>;
  getTargetEvidence(input: {
    workspaceId: string;
    revisionId: string | null;
    messageId: string | null;
    scope: CostScope;
  }): Promise<CostTargetEvidence | null>;
  getApproval(input: {
    workspaceId: string;
    approvalId: string;
  }): Promise<EditorialApprovalEvidence | null>;
  hasApplicationReceipt(input: {
    workspaceId: string;
    approvalId: string;
    revisionId: string;
  }): Promise<boolean>;
  getQuoteForUpdate(input: { workspaceId: string; quoteId: string }): Promise<CostQuote | null>;
  getConfirmationForQuote(input: {
    workspaceId: string;
    quoteId: string;
  }): Promise<CostConfirmation | null>;
  getConfirmationForUpdate(input: {
    workspaceId: string;
    confirmationId: string;
  }): Promise<CostConfirmation | null>;
  insertQuote(quote: CostQuote): Promise<CostQuote>;
  insertConfirmation(confirmation: CostConfirmation): Promise<CostConfirmation>;
  reserveInference(input: {
    confirmation: CostConfirmation;
    quote: CostQuote;
    intentKey: string;
    credits: number;
  }): Promise<CostStartResult>;
  startOrReuseJob(input: {
    confirmation: CostConfirmation;
    quote: CostQuote;
    intentKey: string;
    credits: number;
  }): Promise<CostStartResult>;
}

export interface CostRepository {
  transaction<T>(work: (tx: CostTransaction) => Promise<T>): Promise<T>;
}

export class CostGateError extends Error {
  constructor(
    readonly code:
      | "not_found"
      | "forbidden"
      | "invalid_request"
      | "expired"
      | "invalidated"
      | "quota_changed"
      | "quota_exceeded"
      | "missing_receipt",
  ) {
    super(
      code === "forbidden"
        ? "This action is not allowed"
        : code === "quota_exceeded"
          ? "The available quota is insufficient"
          : code === "missing_receipt"
            ? "The approved canonical change must be applied first"
            : code === "expired"
              ? "The cost quote has expired"
              : code === "not_found"
                ? "Cost evidence not found"
                : "The cost evidence changed and must be confirmed again",
    );
    this.name = "CostGateError";
  }
}

type ExactEvidence = Readonly<{
  target: CostTargetEvidence;
  approval: EditorialApprovalEvidence | null;
}>;

function exactScopeFingerprint(scope: CostScope, evidence: ExactEvidence): string {
  return createScopeFingerprint({
    scope,
    targetFingerprint: evidence.target.targetFingerprint,
    estimateFingerprint: evidence.target.estimateFingerprint,
    approval: evidence.approval
      ? {
          id: evidence.approval.id,
          revisionFingerprint: evidence.approval.revisionFingerprint,
          diffFingerprint: evidence.approval.diffFingerprint,
          baseFingerprint: evidence.approval.baseFingerprint,
        }
      : null,
  });
}

type UnsignedCostQuote = Omit<CostQuote, "quoteFingerprint">;

function exactQuoteFingerprint(quote: UnsignedCostQuote | CostQuote): string {
  return sha256Fingerprint({
    kind: "copilot-cost-quote",
    quote: {
      id: quote.id,
      workspaceId: quote.workspaceId,
      actorUserId: quote.actorUserId,
      revisionId: quote.revisionId,
      messageId: quote.messageId,
      approvalId: quote.approvalId,
      scope: quote.scope,
      scopeFingerprint: quote.scopeFingerprint,
      currency: quote.currency,
      maximumAmount: quote.maximumAmount,
      credits: quote.credits,
      quotaFingerprint: quote.quotaFingerprint,
      status: quote.status,
      expiresAt: quote.expiresAt.toISOString(),
      createdAt: quote.createdAt.toISOString(),
    },
  });
}

function hasEditorRole(authority: CostAuthority): boolean {
  return authority.role === "editor" || authority.role === "owner";
}

async function loadExactEvidence(
  tx: CostTransaction,
  quote: Pick<CostQuote, "workspaceId" | "revisionId" | "messageId" | "approvalId" | "scope">,
): Promise<ExactEvidence> {
  const target = await tx.getTargetEvidence(quote);
  if (!target) throw new CostGateError("not_found");

  if (quote.scope.kind === "inference") {
    if (quote.revisionId !== null || quote.messageId === null || quote.approvalId !== null) {
      throw new CostGateError("invalid_request");
    }
    return { target, approval: null };
  }

  if (quote.revisionId === null || quote.messageId !== null || quote.approvalId === null) {
    throw new CostGateError("invalid_request");
  }
  const approval = await tx.getApproval({
    workspaceId: quote.workspaceId,
    approvalId: quote.approvalId,
  });
  if (
    !approval ||
    !approval.usable ||
    approval.workspaceId !== quote.workspaceId ||
    approval.revisionId !== quote.revisionId
  ) {
    throw new CostGateError("invalidated");
  }
  return { target, approval };
}

function assertExactQuote(
  quote: CostQuote,
  evidence: ExactEvidence,
  quota: QuotaEvidence,
  now: Date,
) {
  if (quote.status !== "estimated") throw new CostGateError("invalidated");
  if (quote.expiresAt.getTime() <= now.getTime()) throw new CostGateError("expired");
  if (quote.scopeFingerprint !== exactScopeFingerprint(quote.scope, evidence)) {
    throw new CostGateError("invalidated");
  }
  if (quote.quotaFingerprint !== quota.fingerprint) throw new CostGateError("quota_changed");
  if (quota.availableCredits < quote.credits) throw new CostGateError("quota_exceeded");
  if (quote.quoteFingerprint !== exactQuoteFingerprint(quote)) {
    throw new CostGateError("invalidated");
  }
}

export async function createCostQuote(
  repository: CostRepository,
  input: {
    id: string;
    workspaceId: string;
    actorUserId: string;
    revisionId: string | null;
    messageId: string | null;
    approvalId: string | null;
    scope: CostScope;
    currency: string;
    maximumAmount: string;
    credits: number;
    expiresAt: Date;
    now?: Date;
  },
): Promise<CostQuote> {
  return repository.transaction(async (tx) => {
    const now = input.now ?? new Date();
    const authority = await tx.getAuthority(input);
    if (
      !authority ||
      authority.workspaceId !== input.workspaceId ||
      authority.actorUserId !== input.actorUserId
    ) {
      throw new CostGateError("not_found");
    }
    if (!hasEditorRole(authority)) throw new CostGateError("forbidden");
    if (input.expiresAt.getTime() <= now.getTime()) throw new CostGateError("invalid_request");

    const scope = CostScopeSchema.parse(input.scope);
    const evidence = await loadExactEvidence(tx, { ...input, scope });
    const quota = await tx.getQuota(input);
    if (quota.availableCredits < input.credits) throw new CostGateError("quota_exceeded");
    const scopeFingerprint = exactScopeFingerprint(scope, evidence);
    const unsigned = {
      id: input.id,
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      revisionId: input.revisionId,
      messageId: input.messageId,
      approvalId: input.approvalId,
      scope,
      scopeFingerprint,
      currency: input.currency,
      maximumAmount: input.maximumAmount,
      credits: input.credits,
      quotaFingerprint: quota.fingerprint,
      status: "estimated" as const,
      expiresAt: input.expiresAt,
      createdAt: now,
    };
    const quote = CostQuoteSchema.parse({
      ...unsigned,
      quoteFingerprint: exactQuoteFingerprint(unsigned),
    });
    return tx.insertQuote(quote);
  });
}

export async function confirmCostQuote(
  repository: CostRepository,
  input: {
    id: string;
    workspaceId: string;
    actorUserId: string;
    quoteId: string;
    quoteFingerprint: string;
    now?: Date;
  },
): Promise<CostConfirmation> {
  return repository.transaction(async (tx) => {
    const authority = await tx.getAuthority(input);
    if (
      !authority ||
      authority.workspaceId !== input.workspaceId ||
      authority.actorUserId !== input.actorUserId
    ) {
      throw new CostGateError("not_found");
    }
    if (!hasEditorRole(authority) || !authority.canSpend) throw new CostGateError("forbidden");

    const quote = await tx.getQuoteForUpdate(input);
    if (
      !quote ||
      quote.workspaceId !== input.workspaceId ||
      quote.actorUserId !== input.actorUserId
    ) {
      throw new CostGateError("not_found");
    }
    if (quote.quoteFingerprint !== input.quoteFingerprint) throw new CostGateError("invalidated");
    const existing = await tx.getConfirmationForQuote(input);
    if (existing) {
      if (
        existing.workspaceId !== input.workspaceId ||
        existing.actorUserId !== input.actorUserId ||
        existing.quoteFingerprint !== quote.quoteFingerprint
      ) {
        throw new CostGateError("not_found");
      }
      return existing;
    }

    const evidence = await loadExactEvidence(tx, quote);
    const quota = await tx.getQuota(input);
    assertExactQuote(quote, evidence, quota, input.now ?? new Date());
    const confirmation = CostConfirmationSchema.parse({
      id: input.id,
      quoteId: quote.id,
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      quoteFingerprint: quote.quoteFingerprint,
      scopeFingerprint: quote.scopeFingerprint,
      quotaFingerprint: quote.quotaFingerprint,
      createdAt: input.now ?? new Date(),
    });
    return tx.insertConfirmation(confirmation);
  });
}

export async function startConfirmedCost(
  repository: CostRepository,
  input: {
    workspaceId: string;
    actorUserId: string;
    confirmationId: string;
    now?: Date;
  },
): Promise<CostStartResult> {
  return repository.transaction(async (tx) => {
    const authority = await tx.getAuthority(input);
    if (
      !authority ||
      authority.workspaceId !== input.workspaceId ||
      authority.actorUserId !== input.actorUserId
    ) {
      throw new CostGateError("not_found");
    }
    if (!hasEditorRole(authority) || !authority.canSpend) throw new CostGateError("forbidden");

    const confirmation = await tx.getConfirmationForUpdate(input);
    if (
      !confirmation ||
      confirmation.workspaceId !== input.workspaceId ||
      confirmation.actorUserId !== input.actorUserId
    ) {
      throw new CostGateError("not_found");
    }
    const quote = await tx.getQuoteForUpdate({
      workspaceId: input.workspaceId,
      quoteId: confirmation.quoteId,
    });
    if (
      !quote ||
      quote.workspaceId !== input.workspaceId ||
      quote.actorUserId !== input.actorUserId
    ) {
      throw new CostGateError("not_found");
    }
    if (
      confirmation.quoteFingerprint !== quote.quoteFingerprint ||
      confirmation.scopeFingerprint !== quote.scopeFingerprint ||
      confirmation.quotaFingerprint !== quote.quotaFingerprint
    ) {
      throw new CostGateError("invalidated");
    }

    const evidence = await loadExactEvidence(tx, quote);
    const quota = await tx.getQuota(input);
    assertExactQuote(quote, evidence, quota, input.now ?? new Date());
    if (
      quote.scope.kind === "proposal_job" &&
      quote.scope.executionDependency === "requires_application_receipt" &&
      !(await tx.hasApplicationReceipt({
        workspaceId: quote.workspaceId,
        approvalId: quote.approvalId!,
        revisionId: quote.revisionId!,
      }))
    ) {
      throw new CostGateError("missing_receipt");
    }

    const intentKey = createWorkspaceIntentKey({
      workspaceId: quote.workspaceId,
      actorUserId: quote.actorUserId,
      operation: quote.scope.kind,
      intent: {
        confirmationId: confirmation.id,
        quoteFingerprint: quote.quoteFingerprint,
        scopeFingerprint: quote.scopeFingerprint,
      },
    });
    const start = quote.scope.kind === "inference" ? tx.reserveInference : tx.startOrReuseJob;
    return start.call(tx, { confirmation, quote, intentKey, credits: quote.credits });
  });
}
