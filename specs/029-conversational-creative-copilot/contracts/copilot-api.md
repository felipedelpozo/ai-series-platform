# Copilot API Contract

## Shared Rules

- Authentication: Secure-in-production HttpOnly SameSite=Lax session cookie or existing Bearer token.
- CSRF: every state-changing cookie-authenticated request requires an exact allowed `Origin` matching the
  server `Host`; missing or cross-site origins are rejected. Bearer requests do not rely on ambient
  browser credentials.
- Authority: actor and workspace are derived server-side; body fields cannot override them.
- Content type: JSON. All request and response bodies are schema-validated and size-bounded.
- Errors: `401` unauthenticated, `403` known authorized context lacks role, `404` missing/foreign/archived
  identifier where enumeration must be prevented, `409` stale/conflict/replay state, `422` blocking
  validation, `429` quota/rate limit, `503` configured provider unavailable.
- Every success and safe error includes `correlationId`. Commands accept a client idempotency identifier
  where specified; server derives the authority-bound key.
- Rate limits are reserved atomically by workspace, actor and operation class. Retry/reconciliation reads
  remain available, while new expensive work returns `429`; forwarded IP headers are never authority.
- Response resources never include another workspace's identifiers or raw secrets/prompts.

## Context Types

```text
CopilotContext = {
  workspaceId,
  seriesId?,
  episodePlanId?,
  episodeNumber?,
  resource?: { type, id },
  fingerprint
}
```

The server returns this type but recomputes it for every command. A client cannot retarget an existing
proposal by submitting another context.

## `GET /api/copilot/conversations`

Returns authorized conversations ordered by update time with current status/context summary. Viewer is
allowed. Pagination is bounded.

## `POST /api/copilot/conversations`

Request: `{ title?, mode: "query" | "actionable", context: { seriesId?, episodePlanId?, resource? } }`.

`mode` is required. `actionable` requires editor; viewer may create only `query`. Returns conversation
and fixed initial context snapshot.

## `GET /api/copilot/conversations/:conversationId`

Returns ordered messages, proposal summaries, current revision/validation/diff, decisions, cost state and
receipt links for the same workspace. Out-of-order messages remain ordered by server sequence.

## `POST /api/copilot/conversations/:conversationId/messages`

Request: `{ clientMessageId, content, visibleContextFingerprint }`.

The server classifies each part as `query`, `proposal`, `canonical_mutation`, or `paid_job`.

- Query: returns an assistant answer and no proposal.
- Mutation intent: returns an immutable proposal revision and diff; never applies.
- Missing information: returns `needs_information` with bounded questions.
- Provider unavailable: preserves the user message and returns `recoverable_error`.
- Provider-needed: persists the classified message and returns `awaiting_cost_confirmation` with a
  maximum quote; it does not call the provider.
- A late response is attached to its causation message/revision and cannot replace a newer current
  revision.

Sending “adelante” or equivalent is only another message and never an approval command.

A viewer receives only deterministic answers assembled from allowlisted canonical fields. If a query
needs real inference, the response explains that editor/spend authorization is required; it never offers
the viewer a cost confirmation or invokes the provider.

## `POST /api/copilot/conversations/:conversationId/messages/:messageId/cost/confirm`

Request: `{ quoteId, quoteFingerprint }`. Requires editor plus the workspace spend role and the exact
unconsumed quote for the message/prompt purpose. Creates or returns the one immutable economic
confirmation; no inference runs.

## `POST /api/copilot/conversations/:conversationId/messages/:messageId/generate`

Request: `{ confirmationId, idempotencyKey }`. Requires editor plus the workspace spend role and
revalidates origin/auth/rate/quota/message/quote and confirmation, reserves quota once, invokes the typed
AI port, stores usage/cost and the ordered assistant response or proposal revision, and returns the same
outcome on replay.

## `POST /api/copilot/proposals/:proposalId/revisions`

Request: `{ clientRevisionId, basedOnRevisionId, payload }`.

Requires editor. Creates a new immutable revision, captures current authorized bases, recomputes diff and
fingerprint, and invalidates the applicability of prior approvals. Empty diff returns a non-approvable
revision.

## `POST /api/copilot/proposals/:proposalId/validate`

Request: `{ revisionId, fingerprint }`.

Requires editor. Recomputes structure, ownership, bases, relationships and continuity. Returns a validation
run and findings. Blocking validation is `422`; stale is `409`; `valid_with_warnings` is `200` with
visible findings and may be approved. None writes canon.

## `POST /api/copilot/proposals/:proposalId/decision`

Request: `{ revisionId, fingerprint, validationRunId, decision: "approve" | "reject" | "discard" }`.

Requires editor. Approval also requires non-empty visible diff and an exact valid latest run. The decision
is immutable, bound to actor/workspace/revision/fingerprints, and cannot be inferred from chat text.

## `POST /api/copilot/proposals/:proposalId/apply`

Request: `{ approvalId, idempotencyKey }`.

Requires editor and the same actor/workspace as approval. The service revalidates all bases and permissions
inside the application transaction. Returns:

- `200 { status: "applied", receipt, links }` for new or reconciled success;
- `409 { status: "stale_draft", reason }` for changed base/role/target/fingerprint;
- `422 { status: "continuity_conflict" | "needs_information", findings }` for blocking validation;
- `503 { status: "recoverable_error", retryable: true }` only when no canonical commit is confirmed.

## `POST /api/copilot/proposals/:proposalId/cost/quote`

Request: `{ revisionId, fingerprint, scope }`.

Requires editor and the exact usable editorial approval for a paid or mixed revision. Returns
provider/modality, currency, amount, units, available quota, execution dependency, approval fingerprint,
scope fingerprint and expiry. It does not confirm or launch work.

## `POST /api/copilot/proposals/:proposalId/cost/confirm`

Request: `{ quoteId, quoteFingerprint }`.

Requires the workspace role authorized for spend. Creates one immutable confirmation only if quote,
revision, exact editorial approval, scope, role and quota snapshot remain valid. Editorial approval and
economic confirmation are independent decisions; neither implies the other.

## `POST /api/copilot/proposals/:proposalId/cost/start`

Request: `{ confirmationId, idempotencyKey }`.

Revalidates confirmation, quote, exact approval, scope dependency, actor, role and quota. A
`requires_application_receipt` target also requires the receipt for that approval; an `independent`
target may start after both approvals without waiting for canonical application. The service atomically
reserves quota and creates or reuses the existing workspace-bound queued/running/reusable-succeeded job.
Returns `{ jobId, created, status }`. It never performs media-provider generation synchronously.

## Copilot inference accounting

Every real answer/draft call first returns a visible maximum quote for that exact message/draft and waits
for an explicit economic confirmation. It then reserves workspace/user allowance and records provider,
model, prompt purpose/version/snapshot, input/output usage, duration, status and estimated/actual cost.
Deterministic no-provider responses do not consume a confirmation.

## Links

Receipts expose only canonical deep links:

- Series/Bible/Entity: `/series?seriesId=:seriesId`
- EpisodePlan/Scene/Shot: `/studio/:planId`
- Job/cost: `/ops?jobId=:jobId`
