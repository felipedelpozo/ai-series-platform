export type ValidationStatus = "pending" | "valid" | "valid_with_warnings" | "invalid" | "stale";
export type DecisionKind = "approved" | "rejected" | "discarded";

export type ExactProposalRevision = Readonly<{
  id: string;
  proposalId: string;
  workspaceId: string;
  fingerprint: string;
  diffFingerprint: string;
  baseFingerprint: string;
  diffCount: number;
}>;

export type ExactValidationRun = Readonly<{
  id: string;
  revisionId: string;
  revisionFingerprint: string;
  baseFingerprint: string;
  status: ValidationStatus;
}>;

export type ProposalDecision = Readonly<{
  id: string;
  revisionId: string;
  validationRunId: string;
  workspaceId: string;
  actorUserId: string;
  fingerprint: string;
  diffFingerprint: string;
  baseFingerprint: string;
  kind: DecisionKind;
  createdAt: string;
}>;

export interface ProposalDecisionRepository {
  transaction<T>(callback: (tx: ProposalDecisionTransaction) => Promise<T>): Promise<T>;
}

export interface ProposalDecisionTransaction {
  lockProposal(input: { workspaceId: string; proposalId: string }): Promise<{
    currentRevisionId: string;
    status: string;
  } | null>;
  getRevision(input: {
    workspaceId: string;
    proposalId: string;
    revisionId: string;
  }): Promise<ExactProposalRevision | null>;
  getLatestValidation(input: {
    workspaceId: string;
    revisionId: string;
  }): Promise<ExactValidationRun | null>;
  getDecision(input: { workspaceId: string; revisionId: string }): Promise<ProposalDecision | null>;
  insertDecision(input: Omit<ProposalDecision, "id" | "createdAt">): Promise<ProposalDecision>;
  setProposalStatus(input: {
    workspaceId: string;
    proposalId: string;
    status: "awaiting_approval" | "rejected" | "discarded";
  }): Promise<void>;
}

export type DecideProposalResult =
  | { ok: true; decision: ProposalDecision; replayed: boolean }
  | {
      ok: false;
      code: "not_found" | "conflict" | "stale" | "not_approvable";
      message: string;
    };

export async function decideProposalRevision(
  repository: ProposalDecisionRepository,
  input: {
    workspaceId: string;
    actorUserId: string;
    proposalId: string;
    revisionId: string;
    validationRunId: string;
    fingerprint: string;
    kind: DecisionKind;
  },
): Promise<DecideProposalResult> {
  return repository.transaction(async (tx) => {
    const proposal = await tx.lockProposal(input);
    if (!proposal) return { ok: false, code: "not_found", message: "Proposal not found" };
    const revision = await tx.getRevision(input);
    if (!revision) return { ok: false, code: "not_found", message: "Proposal not found" };

    const existing = await tx.getDecision(input);
    if (existing) {
      const exactReplay =
        existing.actorUserId === input.actorUserId &&
        existing.validationRunId === input.validationRunId &&
        existing.fingerprint === input.fingerprint &&
        existing.kind === input.kind;
      return exactReplay
        ? { ok: true, decision: existing, replayed: true }
        : { ok: false, code: "conflict", message: "This revision already has a decision" };
    }
    if (proposal.currentRevisionId !== revision.id) {
      return { ok: false, code: "stale", message: "A newer proposal revision exists" };
    }
    if (revision.fingerprint !== input.fingerprint) {
      return { ok: false, code: "stale", message: "Proposal evidence changed" };
    }

    const validation = await tx.getLatestValidation(input);
    if (!validation || validation.id !== input.validationRunId) {
      return { ok: false, code: "stale", message: "Validation evidence is no longer current" };
    }
    if (
      validation.revisionFingerprint !== revision.fingerprint ||
      validation.baseFingerprint !== revision.baseFingerprint
    ) {
      return { ok: false, code: "stale", message: "Canonical bases changed" };
    }
    if (
      input.kind === "approved" &&
      (revision.diffCount === 0 ||
        (validation.status !== "valid" && validation.status !== "valid_with_warnings"))
    ) {
      return { ok: false, code: "not_approvable", message: "Revision is not approvable" };
    }

    const decision = await tx.insertDecision({
      revisionId: revision.id,
      validationRunId: validation.id,
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      fingerprint: revision.fingerprint,
      diffFingerprint: revision.diffFingerprint,
      baseFingerprint: revision.baseFingerprint,
      kind: input.kind,
    });
    await tx.setProposalStatus({
      workspaceId: input.workspaceId,
      proposalId: input.proposalId,
      status: input.kind === "approved" ? "awaiting_approval" : input.kind,
    });
    return { ok: true, decision, replayed: false };
  });
}

export function isUsableApproval(
  decision: ProposalDecision,
  revision: ExactProposalRevision,
  validation: ExactValidationRun,
): boolean {
  return (
    decision.kind === "approved" &&
    decision.workspaceId === revision.workspaceId &&
    decision.revisionId === revision.id &&
    decision.validationRunId === validation.id &&
    decision.fingerprint === revision.fingerprint &&
    decision.diffFingerprint === revision.diffFingerprint &&
    decision.baseFingerprint === revision.baseFingerprint &&
    validation.status !== "invalid" &&
    validation.status !== "stale" &&
    validation.status !== "pending"
  );
}
