import { audit, type CopilotAuditSink } from "./observability";
import type { CanonicalChange } from "./contracts";
import {
  isUsableApproval,
  type ExactProposalRevision,
  type ExactValidationRun,
  type ProposalDecision,
} from "./proposals";
import type { ValidationFinding } from "./validation";

export type CanonicalResultLink = Readonly<{
  resourceType: string;
  resourceId: string;
  version?: number;
  href: string;
}>;

export type ApplicationReceipt = Readonly<{
  id: string;
  applicationId: string;
  approvalId: string;
  revisionId: string;
  workspaceId: string;
  actorUserId: string;
  revisionFingerprint: string;
  correlationId: string;
  results: readonly CanonicalResultLink[];
  committedAt: string;
}>;

export type ApplicationEvidence = Readonly<{
  proposalId: string;
  revision: ExactProposalRevision;
  validation: ExactValidationRun;
  approval: ProposalDecision;
  operations: readonly CanonicalChange[];
}>;

export type SceneSetApplicationTarget = Readonly<{
  planId: string;
  mode: "attach_to_proposed_plan" | "replace_with_plan_revision";
}>;

export function resolveSceneSetApplicationTarget(
  operation: Extract<CanonicalChange, { type: "scene_set.replace_with_revision" }>,
  localReferences: ReadonlyMap<string, CanonicalResultLink>,
): SceneSetApplicationTarget | null {
  if (operation.planId) {
    return { planId: operation.planId, mode: "replace_with_plan_revision" };
  }
  if (!operation.planRef) return null;
  const proposedPlan = localReferences.get(operation.planRef);
  if (!proposedPlan || proposedPlan.resourceType !== "episode_plan") return null;
  return { planId: proposedPlan.resourceId, mode: "attach_to_proposed_plan" };
}

export interface CanonicalApplicationTransaction {
  findReceipt(input: {
    workspaceId: string;
    idempotencyKey: string;
    approvalId?: string;
  }): Promise<ApplicationReceipt | null>;
  lockApproval(input: {
    workspaceId: string;
    approvalId: string;
  }): Promise<ApplicationEvidence | null>;
  getMembership(input: {
    workspaceId: string;
    actorUserId: string;
  }): Promise<{ role: "viewer" | "editor" | "owner" } | null>;
  lockTargets(input: {
    workspaceId: string;
    operations: readonly CanonicalChange[];
  }): Promise<void>;
  recomputeEvidence(input: ApplicationEvidence): Promise<{
    revisionFingerprint: string;
    diffFingerprint: string;
    baseFingerprint: string;
    findings: readonly ValidationFinding[];
  }>;
  applyOperation(input: {
    workspaceId: string;
    actorUserId: string;
    operation: CanonicalChange;
    localReferences: ReadonlyMap<string, CanonicalResultLink>;
  }): Promise<CanonicalResultLink | null>;
  insertApplication(input: {
    workspaceId: string;
    approvalId: string;
    revisionId: string;
    actorUserId: string;
    idempotencyKey: string;
    correlationId: string;
  }): Promise<{ id: string }>;
  insertReceipt(input: Omit<ApplicationReceipt, "id" | "committedAt">): Promise<ApplicationReceipt>;
  markApplied(input: {
    workspaceId: string;
    proposalId: string;
    applicationId: string;
  }): Promise<void>;
}

export interface CanonicalApplicationRepository {
  transaction<T>(callback: (tx: CanonicalApplicationTransaction) => Promise<T>): Promise<T>;
  findReceipt(input: {
    workspaceId: string;
    idempotencyKey: string;
    approvalId?: string;
  }): Promise<ApplicationReceipt | null>;
}

export type ApplyProposalResult =
  | { status: "applied"; receipt: ApplicationReceipt; replayed: boolean }
  | { status: "not_found"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "stale_draft"; message: string }
  | { status: "continuity_conflict" | "needs_information"; findings: readonly ValidationFinding[] }
  | { status: "recoverable_error"; retryable: true; correlationId: string };

class ExpectedApplicationFailure {
  constructor(readonly result: ApplyProposalResult) {}
}

function assertExactEvidence(
  evidence: ApplicationEvidence,
  recomputed: Awaited<ReturnType<CanonicalApplicationTransaction["recomputeEvidence"]>>,
): void {
  if (
    !isUsableApproval(evidence.approval, evidence.revision, evidence.validation) ||
    evidence.revision.fingerprint !== recomputed.revisionFingerprint ||
    evidence.revision.diffFingerprint !== recomputed.diffFingerprint ||
    evidence.revision.baseFingerprint !== recomputed.baseFingerprint
  ) {
    throw new ExpectedApplicationFailure({
      status: "stale_draft",
      message: "Proposal evidence no longer matches canonical state",
    });
  }
  const blocking = recomputed.findings.filter((finding) => finding.severity === "blocking");
  if (blocking.length > 0) {
    throw new ExpectedApplicationFailure({
      status: blocking.some((finding) => finding.code.includes("continuity"))
        ? "continuity_conflict"
        : "needs_information",
      findings: blocking,
    });
  }
}

export async function applyApprovedProposal(
  repository: CanonicalApplicationRepository,
  input: {
    workspaceId: string;
    actorUserId: string;
    approvalId: string;
    idempotencyKey: string;
    correlationId: string;
    auditSink?: CopilotAuditSink;
  },
): Promise<ApplyProposalResult> {
  try {
    const result: ApplyProposalResult = await repository.transaction(async (tx) => {
      const replay = await tx.findReceipt({ ...input, approvalId: input.approvalId });
      if (replay) return { status: "applied", receipt: replay, replayed: true };

      const evidence = await tx.lockApproval(input);
      if (!evidence)
        throw new ExpectedApplicationFailure({
          status: "not_found",
          message: "Proposal not found",
        });
      if (
        evidence.approval.actorUserId !== input.actorUserId ||
        evidence.approval.workspaceId !== input.workspaceId
      ) {
        throw new ExpectedApplicationFailure({
          status: "not_found",
          message: "Proposal not found",
        });
      }
      const membership = await tx.getMembership(input);
      if (!membership || membership.role === "viewer") {
        throw new ExpectedApplicationFailure({
          status: "forbidden",
          message: "Editor role required",
        });
      }

      const operationKey = (operation: CanonicalChange): string => {
        const canonicalId = "targetId" in operation ? operation.targetId : undefined;
        const clientRef = "clientRef" in operation ? operation.clientRef : undefined;
        return `${operation.type}:${canonicalId ?? clientRef ?? ""}`;
      };
      const ordered = [...evidence.operations].sort((left, right) =>
        operationKey(left).localeCompare(operationKey(right)),
      );
      await tx.lockTargets({ workspaceId: input.workspaceId, operations: ordered });
      assertExactEvidence(evidence, await tx.recomputeEvidence(evidence));

      const application = await tx.insertApplication({
        workspaceId: input.workspaceId,
        approvalId: evidence.approval.id,
        revisionId: evidence.revision.id,
        actorUserId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
      });
      const references = new Map<string, CanonicalResultLink>();
      const results: CanonicalResultLink[] = [];
      for (const operation of evidence.operations) {
        const result = await tx.applyOperation({
          workspaceId: input.workspaceId,
          actorUserId: input.actorUserId,
          operation,
          localReferences: references,
        });
        if (result) {
          if (!isCanonicalResultHref(result.href)) {
            throw new Error("Canonical application returned an invalid result link");
          }
          results.push(result);
          if ("clientRef" in operation) references.set(operation.clientRef, result);
        }
      }
      const receipt = await tx.insertReceipt({
        applicationId: application.id,
        approvalId: evidence.approval.id,
        revisionId: evidence.revision.id,
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        revisionFingerprint: evidence.revision.fingerprint,
        correlationId: input.correlationId,
        results,
      });
      await tx.markApplied({
        workspaceId: input.workspaceId,
        proposalId: evidence.proposalId,
        applicationId: application.id,
      });
      return { status: "applied", receipt, replayed: false };
    });
    if (result.status === "applied" && !result.replayed) {
      await audit(input.auditSink, {
        name: "copilot.proposal.applied",
        level: "info",
        correlationId: input.correlationId,
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        revisionId: result.receipt.revisionId,
        applicationId: result.receipt.applicationId,
        outcome: "applied",
        attributes: {
          resultCount: result.receipt.results.length,
          revisionFingerprint: result.receipt.revisionFingerprint,
        },
      });
    }
    return result;
  } catch (error) {
    if (error instanceof ExpectedApplicationFailure) return error.result;
    const reconciled = await repository.findReceipt({ ...input, approvalId: input.approvalId });
    if (reconciled) return { status: "applied", receipt: reconciled, replayed: true };
    await audit(input.auditSink, {
      name: "copilot.proposal.apply_failed",
      level: "error",
      correlationId: input.correlationId,
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      outcome: "recoverable_error",
      attributes: { errorName: error instanceof Error ? error.name : "UnknownError" },
    });
    return { status: "recoverable_error", retryable: true, correlationId: input.correlationId };
  }
}

export function isCanonicalResultHref(href: string): boolean {
  return (
    /^\/series\?seriesId=[^&/]+$/.test(href) ||
    /^\/studio\/[^/?#]+$/.test(href) ||
    /^\/ops\?jobId=[^&/]+$/.test(href)
  );
}
