# Data Model: Conversational Creative Copilot

## Invariants

- Every copilot row belongs to exactly one workspace, and every child workspace matches its parent
  through composite database foreign keys, not only repository checks.
- Messages, snapshots, revisions, validation evidence, decisions, confirmations and receipts are
  append-only.
- A proposal revision fixes context and canonical bases; it is never retargeted.
- A content fingerprint and an exact revision fingerprint are server-generated, 64 lowercase
  hexadecimal SHA-256 characters. Content fingerprints may repeat; exact revision fingerprints include
  immutable revision identity and are unique per proposal.
- A valid application has one exact approval and at most one receipt.
- Canonical writes and the receipt commit together.
- Viewer may read authorized history but cannot create actionable revisions, decide, apply or spend.
- Scene fields are the structured screenplay; there is no screenplay entity.

## Entity Relationships

```text
Workspace 1 ── * Conversation 1 ── * Message
                         │
                         ├── * ContextSnapshot
                         └── * Proposal 1 ── * ProposalRevision
                                              ├── * RevisionTarget
                                              ├── * ValidationRun 1 ── * ValidationFinding
                                              ├── 0..1 Decision
                                              ├── * CostQuote ── 0..1 CostConfirmation ── 0..1 Job
                                              └── 0..1 Application ── 0..1 ApplicationReceipt
```

## Tables

### `copilot_conversations`

| Field                   | Rules                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| id                      | UUID primary key                                                 |
| workspace_id            | Required FK to workspace; indexed with updated_at                |
| created_by_user_id      | Required FK to user                                              |
| title                   | Required, trimmed, 1–160 characters                              |
| status                  | `active` or `archived`                                           |
| next_sequence           | Positive integer used under row lock for ordered events/messages |
| created_at / updated_at | Timezone-aware timestamps                                        |

### `copilot_messages`

| Field                          | Rules                                                                     |
| ------------------------------ | ------------------------------------------------------------------------- |
| id                             | UUID primary key                                                          |
| conversation_id / workspace_id | Required; composite parent ownership enforced by FK and repository        |
| sequence                       | Monotonic within conversation; unique `(conversation_id, sequence)`       |
| client_message_id              | Required for user messages; unique `(conversation_id, client_message_id)` |
| role                           | `user`, `assistant`, or `system`                                          |
| classification                 | `query`, `proposal`, `canonical_mutation`, `paid_job`, or `mixed`         |
| content                        | Required, bounded text                                                    |
| context_snapshot_id            | Optional FK to the exact context used                                     |
| structured_refs                | Bounded JSON references, never an authority source                        |
| created_at                     | Immutable timestamp                                                       |

### `copilot_context_snapshots`

| Field                           | Rules                                   |
| ------------------------------- | --------------------------------------- |
| id                              | UUID primary key                        |
| conversation_id / workspace_id  | Required                                |
| series_id                       | Optional FK; must belong to workspace   |
| episode_plan_id                 | Optional FK; must belong through series |
| resource_type / resource_id     | Optional selected canonical resource    |
| canonical_bases                 | Ordered normalized base vector          |
| fingerprint                     | Required SHA-256                        |
| created_by_user_id / created_at | Required provenance                     |

### `copilot_proposals`

| Field                                                | Rules                                                                             |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| id                                                   | UUID primary key                                                                  |
| conversation_id / workspace_id / context_snapshot_id | Required and same workspace                                                       |
| created_by_user_id                                   | Required                                                                          |
| intent                                               | `canonical_mutation`, `paid_job`, or `mixed`                                      |
| status                                               | Collecting/drafting/review/approval/apply states plus exceptional/terminal states |
| current_revision_id                                  | Optional convenience pointer, must belong to proposal                             |
| created_at / updated_at                              | Timestamps                                                                        |

### `copilot_proposal_revisions`

| Field                           | Rules                                                            |
| ------------------------------- | ---------------------------------------------------------------- |
| id                              | UUID primary key                                                 |
| proposal_id / workspace_id      | Required                                                         |
| revision_number                 | Starts at 1; unique per proposal                                 |
| schema_version                  | Required positive integer                                        |
| payload                         | Validated discriminated change set                               |
| canonical_bases                 | Snapshot used for validation/diff                                |
| diff                            | Non-empty list for an approvable revision                        |
| client_revision_id              | Required idempotency token; unique per proposal                  |
| content_fingerprint             | Required; may repeat when content is restored                    |
| fingerprint                     | Exact revision fingerprint; unique per proposal                  |
| validation_status               | `pending`, `valid`, `valid_with_warnings`, `invalid`, or `stale` |
| prompt_snapshot_id              | Required for AI revisions; nullable only for manual revisions    |
| created_by_user_id / created_at | Immutable provenance                                             |

### `copilot_revision_targets`

| Field                                              | Rules                                                           |
| -------------------------------------------------- | --------------------------------------------------------------- |
| revision_id / ordinal                              | Composite unique ordering                                       |
| resource_type                                      | Allowlisted canonical kind                                      |
| operation                                          | `create`, `update`, or `archive`                                |
| dependencies                                       | Ordered target/client refs required by this operation           |
| execution_dependency                               | Paid targets: `independent` or `requires_application_receipt`   |
| canonical_id                                       | Required for update/archive; absent for create                  |
| client_ref                                         | Required for cross-references among creates; unique in revision |
| base_revision_id / base_version / base_fingerprint | Exact optimistic base where applicable                          |

### `copilot_validation_runs` and `copilot_validation_findings`

A run binds revision fingerprint plus recomputed base fingerprint and has status `valid`,
`valid_with_warnings`, `invalid`, or `stale`. Findings are immutable, ordered, and contain severity
(`warning`/`blocking`), stable code, target, field path, safe message and optional remediation. A revision
is approvable only with the latest valid/valid-with-warnings run and at least one diff item.

### `copilot_decisions`

| Field                                             | Rules                                  |
| ------------------------------------------------- | -------------------------------------- |
| id                                                | UUID primary key                       |
| revision_id / validation_run_id                   | Required exact evidence                |
| workspace_id / actor_user_id                      | Required and revalidated               |
| fingerprint / diff_fingerprint / base_fingerprint | Exact server values                    |
| kind                                              | `approved`, `rejected`, or `discarded` |
| created_at                                        | Immutable                              |

Only one terminal decision is accepted per revision. Editing creates another revision rather than
changing the decision.

### `copilot_applications` and `copilot_application_receipts`

Application is the operational coordinator (`applying`, `applied`, `failed_before_commit`) with unique
approval and unique `(workspace_id, idempotency_key)`. Receipt is immutable and unique by application,
approval and revision. It records exact fingerprint, actor, canonical result IDs/versions, correlation ID
and commit time. The receipt is inserted in the same transaction as canonical writes.

### `copilot_cost_quotes` and `copilot_cost_confirmations`

Quote targets either one pending inference message/draft or one paid proposal operation. Proposal-job
quotes bind revision, exact editorial approval, scope fingerprint and execution dependency; inference
quotes bind the exact client message and prompt purpose. Both record provider/model/kind, currency,
decimal maximum estimate, credits, quota snapshot and expiry. Confirmation is immutable and unique for a
quote and repeats all authority/scope/quota fingerprints plus actor/workspace. Proposal-job launch
requires an unexpired exact match, the exact usable approval and editor-or-owner authorization; a
`requires_application_receipt` scope also requires the matching receipt. Inference launch requires its
exact message quote/confirmation and consumes it once. Quota policy may require owner according to
existing account settings.

### `copilot_inference_usage`

Append-only usage attribution for every real copilot call: workspace, user, conversation/message,
provider, model, prompt snapshot/purpose/version, input/output units, duration, estimated cost, actual
cost when known, status and correlation ID. It links the generated revision when applicable. Quota state
remains in existing account primitives; this table is evidence, not a second quota source.

### `copilot_rate_limit_buckets`

Durable fixed-window buckets keyed by `(workspace_id, actor_user_id, operation, window_started_at)` with
`count`, `limit`, `expires_at` and `updated_at`. A unique key plus atomic conditional increment enforces
the bound across processes. Idempotent replay/reconciliation of an already-known client key does not
consume another slot; only new expensive work does. Expired buckets are deletable operational state and
never audit authority.

### Tenant constraints

Every parent table exposes a unique `(id, workspace_id)` key. Each child uses a composite foreign key to
that pair, including messages, snapshots, proposals, revisions, targets, validation runs/findings,
decisions, applications/receipts, quotes/confirmations and inference usage. Direct SQL that attempts to
join a child to a foreign-workspace parent must fail.

### Existing `jobs` and `cost_records`

Add optional confirmation/intent provenance. Server-generated idempotency includes workspace and intent
fingerprint. Equivalent queued/running jobs and reusable succeeded jobs are returned rather than
duplicated. Quota is incremented atomically in the same transaction that binds confirmation to a job.

## Canonical Change Contract

The proposal payload contains ordered operations with local references for new objects:

- `series.create | series.rename | series.archive`
- `bible.append`
- `entity.create | entity.revise | entity.archive`
- `episode_plan.append`
- `scene_set.replace_with_revision` containing ordered `SceneSchema` and optional `ShotSchema` children
- `paid_job.request` with ordered dependencies and an explicit `independent` or
  `requires_application_receipt` execution rule

All payloads reuse the owning domain schema. Existing IDs are candidates until workspace ownership and
base are loaded server-side. Local references are resolved only inside the application transaction.

## State Transitions

```text
collecting_context -> preparing_draft -> ready_for_review -> awaiting_approval -> applying -> applied
collecting_context | preparing_draft -> needs_information
ready_for_review | awaiting_approval -> continuity_conflict | stale_draft
safe nonterminal state -> recoverable_error -> previous safe state
ready_for_review | awaiting_approval -> rejected | discarded
```

`rejected`, `discarded`, and `applied` are terminal. Editing always creates a new revision and returns
the proposal projection to preparing/review. `applying` blocks edits and duplicate commands.

Cost transitions are independent:

```text
estimated -> confirmed -> started
estimated | confirmed -> expired | invalidated
```

## Canonical Ownership and Versioning

- Series ownership derives from `series.workspace_id`.
- Bible and Entity ownership joins through Series.
- EpisodePlan joins through Series; Scene joins through plan and series; Shot joins through Scene.
- Bible, Entity and EpisodePlan edits append new revisions and activate one exact version.
- Scene/Shot edits create rows under a new EpisodePlan revision; historical rows are not overwritten.
- Series slug uniqueness becomes `(workspace_id, slug)`.

## Transaction Algorithm

1. Lock application/approval and return an existing receipt if present.
2. Reload current membership and require editor or stronger.
3. Lock targets in stable kind/id order and verify same workspace plus non-archived status.
4. Recompute canonical bases, diff, content fingerprint and exact revision fingerprint.
5. Require exact latest validation and decision values.
6. Apply all canonical operations through transaction-aware owner primitives.
7. Insert application receipt and timeline event.
8. Commit; on unknown client result, reconcile by idempotency key.

Serialization conflicts retry at most three times. All other errors roll back and surface a typed safe
state without consuming approval. Cookie-authenticated commands pass strict same-origin validation before
this algorithm. User/workspace/operation rate limits are reserved atomically and never keyed by an
untrusted client IP.

## Retention

Conversation content is retained while its workspace exists and is deleted with workspace deletion;
redacted application receipts and decisions required to explain canonical revisions retain only stable
IDs/fingerprints and timestamps. No background expiration policy is invented by this feature. Any future
shorter workspace policy is enforced through an explicit `expires_at` plus a tested sweep that never
deletes required canonical provenance.
