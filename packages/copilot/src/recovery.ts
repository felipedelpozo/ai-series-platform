import type { ApplicationReceipt } from "./apply";
import type { ConversationPage } from "./repository";

export type RecoveryState = Readonly<{
  status: string;
  cause: string;
  nextAction: "review" | "approve" | "apply" | "retry" | "open_result" | "none";
  retryable: boolean;
}>;

export interface EffectReconciler {
  findApplicationReceipt(input: {
    workspaceId: string;
    applicationId?: string;
    idempotencyKey?: string;
  }): Promise<ApplicationReceipt | null>;
  findPaidJob(input: {
    workspaceId: string;
    confirmationId?: string;
    idempotencyKey?: string;
  }): Promise<{ id: string; status: string; href: string } | null>;
}

export function deriveRecoveryState(input: {
  proposalStatus?: string;
  validationStatus?: string;
  hasApproval?: boolean;
  hasReceipt?: boolean;
  failure?: Readonly<{ code: string; retryable: boolean }>;
}): RecoveryState {
  if (input.hasReceipt)
    return {
      status: "applied",
      cause: "Canonical commit confirmed",
      nextAction: "open_result",
      retryable: false,
    };
  if (input.failure) {
    return {
      status: input.failure.retryable ? "recoverable_error" : "blocked",
      cause: input.failure.code,
      nextAction: input.failure.retryable ? "retry" : "none",
      retryable: input.failure.retryable,
    };
  }
  if (input.validationStatus === "stale")
    return {
      status: "stale_draft",
      cause: "Canonical base changed",
      nextAction: "review",
      retryable: false,
    };
  if (input.validationStatus === "invalid")
    return {
      status: "continuity_conflict",
      cause: "Blocking validation findings",
      nextAction: "review",
      retryable: false,
    };
  if (input.hasApproval)
    return {
      status: "awaiting_application",
      cause: "Exact revision approved",
      nextAction: "apply",
      retryable: false,
    };
  if (input.validationStatus === "valid" || input.validationStatus === "valid_with_warnings") {
    return {
      status: "awaiting_approval",
      cause: "Validation completed",
      nextAction: "approve",
      retryable: false,
    };
  }
  if (input.proposalStatus)
    return {
      status: input.proposalStatus,
      cause: "Proposal restored",
      nextAction: "review",
      retryable: false,
    };
  return {
    status: "collecting_context",
    cause: "Conversation restored",
    nextAction: "none",
    retryable: false,
  };
}

export async function reconcileConversationEffects(
  reconciler: EffectReconciler,
  input: {
    workspaceId: string;
    applicationId?: string;
    applicationIdempotencyKey?: string;
    confirmationId?: string;
    jobIdempotencyKey?: string;
  },
): Promise<
  Readonly<{
    receipt: ApplicationReceipt | null;
    job: { id: string; status: string; href: string } | null;
  }>
> {
  const [receipt, job] = await Promise.all([
    input.applicationId || input.applicationIdempotencyKey
      ? reconciler.findApplicationReceipt({
          workspaceId: input.workspaceId,
          applicationId: input.applicationId,
          idempotencyKey: input.applicationIdempotencyKey,
        })
      : null,
    input.confirmationId || input.jobIdempotencyKey
      ? reconciler.findPaidJob({
          workspaceId: input.workspaceId,
          confirmationId: input.confirmationId,
          idempotencyKey: input.jobIdempotencyKey,
        })
      : null,
  ]);
  return { receipt, job };
}

export function projectConversationForRecovery(
  page: ConversationPage,
  limit = 100,
): ConversationPage {
  const bounded = Math.max(1, Math.min(100, limit));
  const messages = [...page.messages]
    .sort(
      (left, right) =>
        left.sequence - right.sequence || left.createdAt.localeCompare(right.createdAt),
    )
    .slice(-bounded);
  return { ...page, messages };
}
