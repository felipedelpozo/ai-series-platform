export const COPILOT_ERROR_CODES = [
  "unauthenticated",
  "forbidden",
  "not_found",
  "invalid_input",
  "validation_failed",
  "continuity_conflict",
  "stale_draft",
  "invalid_state",
  "approval_required",
  "cost_confirmation_required",
  "quote_expired",
  "rate_limited",
  "quota_exceeded",
  "provider_unavailable",
  "recoverable_error",
] as const;

export type CopilotErrorCode = (typeof COPILOT_ERROR_CODES)[number];

const STATUS_BY_CODE: Readonly<Record<CopilotErrorCode, number>> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  invalid_input: 400,
  validation_failed: 422,
  continuity_conflict: 422,
  stale_draft: 409,
  invalid_state: 409,
  approval_required: 409,
  cost_confirmation_required: 409,
  quote_expired: 409,
  rate_limited: 429,
  quota_exceeded: 429,
  provider_unavailable: 503,
  recoverable_error: 503,
};

const PUBLIC_MESSAGE_BY_CODE: Readonly<Record<CopilotErrorCode, string>> = {
  unauthenticated: "Authentication is required.",
  forbidden: "You do not have permission to perform this action.",
  not_found: "The requested resource was not found.",
  invalid_input: "The request is invalid.",
  validation_failed: "The proposal contains blocking validation findings.",
  continuity_conflict: "The proposal conflicts with canonical continuity.",
  stale_draft: "The canonical base changed. Recalculate the proposal before continuing.",
  invalid_state: "The operation is not available in the current state.",
  approval_required: "Explicit approval of the exact proposal revision is required.",
  cost_confirmation_required: "A separate valid cost confirmation is required.",
  quote_expired: "The cost estimate expired or no longer matches the requested scope.",
  rate_limited: "The request limit has been reached. Try again later.",
  quota_exceeded: "The workspace does not have enough available quota.",
  provider_unavailable: "The configured provider is unavailable.",
  recoverable_error: "The operation could not be confirmed. Reconcile its status before retrying.",
};

export class CopilotError extends Error {
  readonly code: CopilotErrorCode;
  readonly retryable: boolean;

  constructor(code: CopilotErrorCode, options?: { cause?: unknown; retryable?: boolean }) {
    super(PUBLIC_MESSAGE_BY_CODE[code], { cause: options?.cause });
    this.name = "CopilotError";
    this.code = code;
    this.retryable =
      options?.retryable ?? (code === "provider_unavailable" || code === "recoverable_error");
  }
}

export type SafeCopilotError = {
  error: { code: CopilotErrorCode; message: string; retryable: boolean };
  status: number;
  correlationId: string;
};

export function resourceNotFound(cause?: unknown): CopilotError {
  return new CopilotError("not_found", { cause });
}

export function toSafeCopilotError(error: unknown, correlationId: string): SafeCopilotError {
  const known =
    error instanceof CopilotError ? error : new CopilotError("recoverable_error", { cause: error });
  return {
    error: {
      code: known.code,
      message: PUBLIC_MESSAGE_BY_CODE[known.code],
      retryable: known.retryable,
    },
    status: STATUS_BY_CODE[known.code],
    correlationId,
  };
}
