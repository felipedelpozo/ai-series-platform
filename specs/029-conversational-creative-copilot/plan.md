# Implementation Plan: Conversational Creative Copilot

**Branch**: `feature/029-conversational-creation` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/029-conversational-creative-copilot/spec.md`

## Summary

Replace the authenticated root redirect with a conversational creative workspace that reads canonical
series context and turns mutation intents into immutable, validated proposals. A new application
package owns classification, proposal state, deterministic fingerprints, validation, exact approvals,
atomic application, cost confirmation, and reconciliation. Canonical creative data remains in the
existing Series, Entities, Story, Planner, Jobs, and Operations domains. The web application supplies a
cookie-or-bearer authenticated API facade and a responsive shadcn-based chat/review UI; it never calls
legacy unscoped mutators from the copilot path.

## Technical Context

**Language/Version**: TypeScript 5.9.3, strict ESM; Bun 1.3+

**Primary Dependencies**: Next.js 16 App Router, React 19, AI SDK 7 with the existing OpenAI adapter,
Zod 4, Drizzle ORM 0.45, PostgreSQL, Tailwind CSS 4, shadcn/ui and Radix primitives already present

**Storage**: PostgreSQL through the existing Drizzle package; immutable copilot history plus canonical
domain tables and existing jobs/cost records

**Testing**: `bun:test` unit and PostgreSQL integration tests; Playwright with Axe for served UI,
responsive, keyboard and accessibility acceptance

**Target Platform**: Authenticated web studio on modern desktop and mobile browsers; Bun worker for
existing asynchronous generation jobs

**Project Type**: Bun monorepo web application with shared domain/application packages and a worker

**Performance Goals**: Acknowledge user input and expose an active workflow state within one second;
keep context, state and next action identifiable within ten seconds; bound conversation/detail lists to
prevent unbounded payloads

**Constraints**: No canonical mutation from free text; no cross-workspace lookup; exact one-use
approval; all-or-nothing application; deterministic server fingerprint; no paid call in default tests;
mandatory opt-in live smoke before external-integration completion; same-origin cookie commands;
workspace/user/operation rate limits; no long-running media-provider call inside the HTTP lifecycle; no
second screenplay or studio source of truth

**Scale/Scope**: Initial vertical slice supports query, series/Bible/entities bundle creation or
revision, episode plan plus Scene/Shot aggregate creation/revision, immutable history, and the paid-job
gate. The applicable catalog is Series, Bible, Character, Location, Prop, EpisodePlan, Scene and Shot;
Season is explicitly unsupported for mutation until a canonical domain exists.

## Constitution Check

_GATE: PASS before research and PASS after design._

| Principle                           | Design evidence                                                                                                                                      | Gate |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| I. Spec-Driven Development          | Spec 029 is complete, checklist is 16/16, and this plan preserves all 52 FRs.                                                                        | PASS |
| II. Monorepo Bun-First              | One new Bun workspace package; no alternate runtime or package manager.                                                                              | PASS |
| III. Stack Moderno y Actualizable   | Uses only the pinned compatible stack and existing dependencies.                                                                                     | PASS |
| IV. shadcn/Radix                    | Reuses the existing shell and primitives; official Blocks were reviewed and no second shell/block is needed.                                         | PASS |
| V. Generación Real                  | OpenAI is used for real conversational structure, records usage/cost and must pass a separately authorized live smoke before integration completion. | PASS |
| VI. Prompts Versioned               | Copilot answer/draft instructions are Prompt Registry purposes and each generated revision records the prompt snapshot.                              | PASS |
| VII. Domain-First                   | AI output stops at a Zod contract; provider types do not enter domain or persistence contracts.                                                      | PASS |
| VIII. Canon and Continuity          | Context is rebuilt from SeriesBible/StoryState/plan data; conversation memory is never canonical.                                                    | PASS |
| IX. Async, Idempotency, Retries     | Application and paid-job keys are stable; existing jobs remain async and retries reconcile first.                                                    | PASS |
| X. Persistence and Migrations       | Drizzle migration, database constraints, locks and one outer transaction enforce invariants.                                                         | PASS |
| XI. Observability and Cost          | Correlation IDs, event history, quote/confirmation/job links and receipts are persisted without secrets.                                             | PASS |
| XII. Security                       | Every copilot route authenticates; workspace/role/ownership and untrusted IDs are revalidated server-side.                                           | PASS |
| XIII. Testing                       | Pure, DB, contract and E2E coverage is deterministic; the real copilot smoke is opt-in but mandatory before external integration completion.         | PASS |
| XIV. Simplicity and Vertical Slices | One application package and one integrated root experience; no microservice or parallel canon.                                                       | PASS |
| XV. Definition of Done              | Full gates, migration-from-zero, E2E, convergence and independent review are planned.                                                                | PASS |

No constitutional exception or complexity waiver is required.

## Architecture and Boundaries

### Request and trust flow

```text
authenticated user action
  -> copilot API adapter (session, request schema, correlation id)
  -> @ai-series/copilot application service
  -> authorized canonical snapshot
  -> Prompt Registry snapshot + AI structured output (untrusted)
  -> Zod/domain/ownership/continuity validation
  -> immutable proposal revision + visible diff
  -> explicit exact approval
  -> revalidation + one database transaction
  -> canonical revisions + immutable application receipt
```

Free-text message handling can call only query or draft operations. Approval, apply, cost confirmation,
and job launch are separate authenticated commands that require server-persisted identifiers and
server-recomputed fingerprints.

### Package ownership

- `packages/copilot`: application-owned schemas, state machines, fingerprinting, diff, context capture,
  validation, proposal repository, exact decisions, atomic apply, cost gate and query/draft orchestration.
- `packages/db`: tables, constraints, migration and exported database types only.
- `packages/series`, `packages/entities`, `packages/planner`, `packages/story`: transaction-aware,
  workspace-explicit canonical primitives. Existing wrappers remain compatible.
- `packages/accounts`: session/role lookup and atomic quota reservation used inside caller transactions.
- `packages/prompts` and `packages/ai`: versioned prompt resolution and real structured generation;
  neither can approve or persist canon.
- `packages/jobs` and `packages/ops`: workspace-bound paid-job deduplication and cost provenance.
- `apps/web`: HTTP adaptation and shadcn UI only; no business rules or direct cross-domain writes.

### Canonical mutation scope

The first applicable change contract is a discriminated union covering:

- create/rename/archive Series;
- append and activate SeriesBible revisions;
- create or append Character, Location and Prop versions;
- create or append EpisodePlan revisions;
- insert ordered Scene/Shot aggregates under the new plan revision;
- optional paid-generation intent that is quoted and confirmed separately.

Episode screenplay content is `Scene.purpose`, `Scene.action`, `Scene.dialogue`, entity references and
entry/exit continuity. There is no screenplay table. Edits to scenes/shots create a new plan aggregate
instead of mutating historical rows. Unsupported resource kinds remain non-applicable findings, never
generic JSON canon.

## Persistence and Concurrency

- Append-only tables record conversations, events/messages, context snapshots, proposal revisions,
  validation runs/findings, decisions, quotes, confirmations and receipts.
- Mutable proposal/application status is a projection for UX; history remains reconstructible from
  immutable rows.
- SHA-256 fingerprints cover schema version, fixed context, ordered targets, canonical bases,
  normalized payload, diff and immutable revision identity. A separate content hash may repeat when an
  editor intentionally restores earlier content.
- Composite `(id, workspace_id)` keys and foreign keys enforce the entire copilot tenant graph at the
  database boundary; repository ownership checks are defense in depth.
- One approval per exact revision and one receipt per approval are guaranteed by unique constraints.
- Application locks the approval/proposal and targets in deterministic order, revalidates membership,
  editor role, workspace ownership, archived status, canonical bases, fingerprint and continuity, then
  writes all canonical changes and the receipt in one transaction.
- Replays and timeout-after-commit resolve the stored receipt before attempting work.
- Paid launch revalidates quote expiry, revision, exact editorial approval, declared dependency, role and
  quota; a dependent target also requires its exact application receipt. Quota reservation and job
  creation are atomic. Stable workspace-bound intent fingerprints reuse queued, running or reusable
  succeeded jobs.

## Public Contracts

All endpoints accept authenticated cookie sessions and preserve the existing Bearer-token fallback.
State-changing cookie requests require same-origin `Origin`/`Host`; all operations reserve durable
workspace/actor/operation rate-limit buckets before expensive work.
The API contract is detailed in `contracts/copilot-api.md`.

- `GET/POST /api/copilot/conversations`
- `GET /api/copilot/conversations/:conversationId`
- `POST /api/copilot/conversations/:conversationId/messages`
- `POST /api/copilot/conversations/:conversationId/messages/:messageId/cost/confirm`
- `POST /api/copilot/conversations/:conversationId/messages/:messageId/generate`
- `POST /api/copilot/proposals/:proposalId/revisions`
- `POST /api/copilot/proposals/:proposalId/validate`
- `POST /api/copilot/proposals/:proposalId/decision`
- `POST /api/copilot/proposals/:proposalId/apply`
- `POST /api/copilot/proposals/:proposalId/cost/quote`
- `POST /api/copilot/proposals/:proposalId/cost/confirm`
- `POST /api/copilot/proposals/:proposalId/cost/start`

Cross-workspace, missing and archived identifiers use non-enumerating responses. Stale base/fingerprint
returns a conflict with the current safe state; validation findings are unprocessable, not partial writes.

## UI Integration

- `/` becomes “Creative copilot” inside the existing StudioShell; `/series` remains Series Workspace and
  `/studio/[planId]` remains Episode Studio.
- At `lg` and wider, a fixed grid presents conversation left and review right. Below `lg`, controlled
  Radix tabs expose equivalent Chat and Draft views while state and context live in the parent.
- The context/status bar remains outside mobile tabs. Proposal state always includes the cause and safe
  next action. Viewer mutation controls are absent.
- Existing Button, Tabs, AlertDialog, Badge, Textarea, Select, notices, tokens and navigation are reused.
  Official shadcn Blocks were reviewed; available dashboard/sidebar blocks are broader than this focused
  two-pane workspace, so adapting the existing shell is the smallest compliant choice.
- Cost confirmation is a separate AlertDialog showing amount, currency, validity, scope and quota.
- History uses an accessible log; workflow updates use polite live status; explicit commands manage focus.

## Security and Privacy

- Authentication and authorization are enforced both at the route and immediately before apply/launch.
- Workspace comes from membership, never from model content or an unverified target ID.
- AI-returned IDs are allowlisted against the authorized snapshot; prompt injection cannot call command
  services or change gates.
- Every real copilot inference requires a visible maximum quote and exact confirmation for that
  message/draft, records provider, model, prompt snapshot, usage, duration and estimated or actual cost,
  and respects existing account quota. Deterministic no-provider responses do not consume a confirmation.
- Prompts delimit user/canonical content as untrusted data and do not include secrets, unrelated tenants,
  raw memberships or internal instructions in outputs/logs.
- Request and proposal schemas bound text, arrays, target counts and payload size.
- Errors do not distinguish foreign from missing IDs and never expose provider credentials.
- Conversation content follows workspace lifetime. Redacted receipts/decisions retain only the minimal
  canonical audit link; a future shorter policy must use explicit expiry plus a tested sweep.

## Failure Handling and Observability

- Request/message IDs make retries idempotent and preserve out-of-order responses without replacing the
  current revision.
- Validation distinguishes `valid_with_warnings` from blocking errors; only blocking findings prevent
  approval. Empty diffs cannot be approved.
- Transaction failures return recoverable state with no partial canon. Serialization conflicts retry a
  bounded number of times before human retry.
- Correlation IDs link message, proposal, revision, validation, approval, application, quote and job.
- No raw prompt, token or sensitive payload is written to production logs.

## Migration Compatibility

- Add a single forward migration after the current latest journal entry.
- New tables are additive. Existing canonical rows require no destructive backfill.
- Change Series slug uniqueness from global to `(workspace_id, slug)` so two tenants may use the same
  slug; existing rows are already workspace-owned and remain valid.
- Add uniqueness/indexes needed by new transactions without rewriting history. Any partial “one active
  revision” constraints are introduced only where existing data passes a preflight query.
- Before production use, rollback may drop only new copilot tables/indexes. After use, rollback disables
  routes/root UI but retains audit data and the workspace-scoped Series slug constraint; valid canonical
  writes remain. Any corrective schema change is forward-only after a duplicate cross-workspace slug
  exists.

## Test Strategy

1. Pure unit tests: intent classification, contracts, state transitions, canonical JSON/fingerprint,
   diff, validation, prompt-injection resistance and Scene-based screenplay mapping.
2. PostgreSQL integration: migration, tenant isolation, immutable history, exact approval, atomic aggregate
   creation/revision, stale base, role revocation, concurrent apply, rollback and receipt reconciliation.
3. Cost/job/inference integration: pre-inference quote/confirmation, usage attribution, quote
   expiry/change, exact mixed approval/receipt, atomic quota, rate limiting, viewer denial, ten concurrent
   starts and queued/running/succeeded reuse.
4. API tests: auth, cookie CSRF/origin rejection, non-enumerating IDOR behavior, input bounds,
   conflict/validation statuses and replay.
5. Playwright: root copilot, desktop/mobile layout, all workflow states, query vs mutation, “adelante”,
   approve/apply, reject/discard, stale/conflict/error, cost gate, context switch, keyboard, Axe and target
   widths.
6. Full repository: format, lint, typecheck, deterministic tests, build and E2E. The paid live copilot
   smoke is separate and opt-in, but `UNAVAILABLE` blocks declaring the external integration complete.
7. A bounded participant protocol measures SC-001/SC-008; missing participants are reported as a manual
   release gate, never replaced by simulated automated evidence.

## Rollout and Rollback

- Land additive persistence and secured APIs before enabling the root experience in the same PR.
- The root UI degrades to an actionable configuration error if conversational AI is unavailable; queries
  and stored history never pretend to be generated.
- Legacy `/series` and `/studio` routes remain available throughout rollout.
- Rollback restores the root redirect and disables copilot routes while retaining append-only audit data;
  canonical revisions already applied remain valid and traceable.

## Project Structure

### Documentation (this feature)

```text
specs/029-conversational-creative-copilot/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── copilot-api.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/copilot/
├── package.json
├── tsconfig.json
└── src/
    ├── contracts.ts
    ├── errors.ts
    ├── state.ts
    ├── fingerprint.ts
    ├── context.ts
    ├── intake.ts
    ├── generator.ts
    ├── query.ts
    ├── validation.ts
    ├── repository.ts
    ├── proposals.ts
    ├── apply.ts
    ├── cost.ts
    ├── recovery.ts
    ├── observability.ts
    └── *.test.ts

packages/db/
├── src/schema.ts
├── src/index.ts
└── migrations/0024_*.sql

packages/{series,entities,planner,story,accounts,jobs,prompts}/src/
└── transaction-aware and workspace-scoped extensions

apps/web/
├── app/(studio)/page.tsx
├── app/api/copilot/**/route.ts
├── components/copilot/*.tsx
├── lib/copilot-api.ts
├── lib/copilot-loader.ts
├── tests/api/copilot-*.test.ts
└── e2e/copilot-*.spec.ts

docs/adr/
└── 0001-conversational-copilot-boundary.md
```

**Structure Decision**: One application package coordinates existing domain packages and exposes no
provider types. Web routes remain thin adapters, and the root UI composes existing design primitives.
The ADR records this durable multi-package transaction and trust boundary.

## Validation Commands

```bash
bun test packages/copilot/src
DATABASE_URL='<test database>' bun test packages/copilot/src/*.integration.test.ts packages/db/src/copilot.integration.test.ts
bun run format:check
bun run typecheck
bun run lint
bun test --path-ignore-patterns=apps/web/e2e/**
bun run build
bun run --cwd apps/web test:e2e -- copilot-series.spec.ts copilot-episode.spec.ts copilot-query.spec.ts copilot-cost.spec.ts copilot-recovery.spec.ts --workers=1
bun run --cwd apps/web test:e2e -- studio-ui.spec.ts --workers=1
git diff --check
```

## Complexity Tracking

No constitution violations. The new package is justified as the single application boundary for a
multi-domain transaction; placing this logic in React routes or any existing creative domain would
couple canonical state to HTTP or AI concerns and violate Domain-First.
