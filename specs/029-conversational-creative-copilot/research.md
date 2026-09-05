# Research: Conversational Creative Copilot

## Decision 1 — One application boundary

**Decision**: Add `@ai-series/copilot` as the only owner of conversation, proposal and approval
orchestration.

**Rationale**: The feature spans accounts, series, entities, story, planner, jobs and cost, but none of
those domains should own conversational state or depend on AI/HTTP. A narrow application package keeps
dependency direction explicit and permits one transaction across canonical primitives.

**Alternatives considered**: Implement in Next.js routes (rejected: business rules in HTTP layer);
extend `@ai-series/ai` (rejected: model output would become canonical authority); add a service process
(rejected: microservice and operational complexity).

## Decision 2 — Root route integration

**Decision**: Render the copilot at `/`; retain `/series` as Series Workspace and `/studio/[planId]` as
Episode Studio.

**Rationale**: The root currently redirects to `/series`, while the spec requires a global entry and
explicit links to both specialized surfaces. This is backward compatible with deep links and avoids a
second workspace.

**Alternatives considered**: Replace `/series` entirely (rejected: duplicates or removes its canonical
detail workflows); create `/copilot` only (rejected: does not make the homepage the requested entry).

## Decision 3 — Exact server fingerprint

**Decision**: Keep a repeatable content hash, then SHA-256 a canonical serialization of immutable
revision identity, schema version, fixed context, ordered targets, canonical bases, normalized change
set and diff for the exact approval fingerprint.

**Rationale**: This binds approval to every semantically relevant input, remains deterministic across
key insertion order, and can be recomputed immediately before application. The server never trusts a
client/model fingerprint.

**Alternatives considered**: Database row timestamp only (insufficient for multi-target bases); random
revision token (does not prove content); raw JSON string (key order instability).

## Decision 4 — Append-only evidence plus small projections

**Decision**: Persist immutable events/messages/revisions/validations/decisions/confirmations/receipts;
keep only conversation/proposal/application status as mutable operational projections.

**Rationale**: Exact history and reconciliation are required, while listing current work should not need
to replay every event. The receipt written with canon resolves timeout-after-commit safely.

**Alternatives considered**: Event sourcing all canonical domains (far beyond scope); mutable single
proposal document (breaks revision and decision history).

## Decision 5 — Transaction-aware canonical primitives

**Decision**: Extract workspace-explicit primitives from Series/Entities/Planner/Story that accept the
caller's database executor; keep legacy wrappers compatible.

**Rationale**: Existing helpers often resolve the `default` workspace or open independent transactions.
Calling them sequentially cannot meet tenant isolation or all-or-nothing application.

**Alternatives considered**: Call legacy API routes internally (security and atomicity failure); duplicate
all canonical writes in copilot (rule drift); distributed compensation (unnecessary complexity).

## Decision 6 — Scene is the screenplay model

**Decision**: Define structured screenplay as ordered canonical Scenes with purpose, action, dialogue,
entities, timing and entry/exit continuity; Shots remain children.

**Rationale**: Feature 013 and `SceneSchema` already own those fields. A screenplay table would be a
second source of truth.

**Alternatives considered**: New screenplay aggregate (rejected); store prose only in proposal JSON
(rejected: not canonical or production-ready).

## Decision 7 — Canonical target catalog

**Decision**: Only validated resource kinds with canonical repositories may be applied. The catalog
covers Series, Bible, Character, Location, Prop, EpisodePlan, Scene and Shot. Season may be contextual but
is explicitly unsupported for mutation until a canonical Season domain is introduced by its own feature.

**Rationale**: This resolves the current absence of Season/Episode tables conservatively and honors the
spec condition “supported by the product” without hiding new canon in copilot JSON.

**Alternatives considered**: Generic JSON resource store (rejected: parallel canon); add Season/Episode
now (rejected: unnecessary expansion beyond the first delivery).

## Decision 8 — Real AI behind a typed port

**Decision**: Resolve versioned `copilot.answer` and `copilot.proposal` prompts, call the existing real
OpenAI structured generator, validate the result, and inject deterministic generators only in tests.
Every real call writes provider/model/prompt/usage/duration/cost attribution, consumes the existing
workspace/user limit, and requires a visible maximum quote plus exact confirmation for that message or
draft before the call. Deterministic no-provider responses do not consume the confirmation.

**Rationale**: This supplies an intelligent copilot while keeping tests free of paid calls and preserving
Prompt Registry provenance. The model receives authorized snapshots as delimited data and cannot call
approval/apply/job commands.

**Alternatives considered**: Keyword-only production parser (not intelligent); mock provider in runtime
(not real behavior); direct provider types in copilot (boundary leak).

## Decision 9 — Cookie session with Bearer compatibility

**Decision**: Login sets a Secure (in production), HttpOnly, SameSite=Lax session cookie; route auth
accepts that cookie or the existing Bearer token during migration. Every state-changing cookie request
must pass strict Origin/Host same-origin verification before parsing its body.

**Rationale**: The root experience needs a durable authenticated session. The current account UI keeps
the token only in component state; copying it into normal browser storage would increase exposure.

**Alternatives considered**: Local storage bearer token (XSS exposure); require manual header injection
(not usable in the app); replace the full auth system (unnecessary).

## Decision 10 — Separate economic gate

**Decision**: Quote and confirm cost independently from editorial approval. A paid target declares
`independent` or `requires_application_receipt`; launch always revalidates the exact editorial approval
and additionally the matching receipt for the latter rule. It then atomically revalidates quota and
creates/reuses a workspace-bound job.

**Rationale**: Approval cannot silently authorize spending; concurrent confirmations must not exceed
quota or duplicate billable provider work.

**Alternatives considered**: Consume quota during proposal approval (couples decisions); use current
read-then-update quota helper (race); client-generated idempotency keys (untrusted scope).

## Decision 11 — Existing shadcn shell, focused two-pane layout

**Decision**: Reuse StudioShell and existing primitives. Use CSS grid on desktop and controlled Radix
Tabs on mobile; no new component library or copied dashboard block.

**Rationale**: The official shadcn Blocks catalog was reviewed. Its dashboard/sidebar blocks solve a
broader shell already present in the repository; the product-specific chat/review flow is best expressed
by composing current primitives.

**Alternatives considered**: Install a resizable panel dependency (not required); duplicate a dashboard
block (would replace existing shell); bespoke low-level controls (violates UI policy).

## Decision 12 — Validation evidence

**Decision**: Make pure and PostgreSQL integration tests the correctness gate; use route-mocked
Playwright for UI/adversarial state coverage and a served-DB smoke for integration. A real OpenAI copilot
smoke is opt-in to avoid accidental spend but is a mandatory PASS before the external integration may be
declared complete. SC-001/SC-008 use a bounded participant protocol and remain a separately reported
manual gate until executed.

**Rationale**: Mocks cannot prove transactions or tenant isolation, and deterministic suites must not
spend AI/media credits.

**Alternatives considered**: E2E mocks only (false confidence); paid live AI on every routine test run
(cost and nondeterminism); manual-only acceptance (not repeatable).

## Decision 13 — Database-enforced tenant graph

**Decision**: Every copilot parent exposes `(id, workspace_id)` and every child references the composite
key. Repository checks remain defense in depth, not the isolation boundary.

**Rationale**: A malformed query or future code path must not be able to persist a cross-workspace child.

**Alternatives considered**: Application-only ownership checks (insufficient); row-level security in this
feature alone (inconsistent with the current connection model and broader migration scope).

## Decision 14 — Durable rate limits, no client-IP authority

**Decision**: Reserve bounded operation buckets atomically by workspace, actor and operation class.
Message generation has the strictest bucket; validation/apply/cost commands have independent replay-safe
buckets. Client-provided forwarding headers are never an identity or quota key.

**Rationale**: Multi-user AI and mutation endpoints need abuse protection without blocking idempotent
reconciliation or allowing IP spoofing.

**Alternatives considered**: In-memory counters (not multi-process); IP-only limits (shared NAT and
spoofing); one bucket for all operations (recovery can starve).

## Decision 15 — Forward-compatible retention and rollback

**Decision**: Conversation content follows workspace lifetime; redacted receipts/decisions retain the
minimal canonical audit link. The Series composite slug uniqueness is retained on code rollback because
valid post-migration data may violate the old global rule. Before production use, copilot tables can be
dropped; after use, rollback is a forward fix that preserves canonical revisions and audit evidence.

**Rationale**: Reinstating a global slug constraint after two tenants legitimately share a slug is not a
safe automated rollback. Durable canonical provenance must not disappear with UI rollback.

**Alternatives considered**: Destructive global slug restoration (data loss/block); delete audit history
(breaks traceability); invent a time-based retention rule without product policy (unsupported).
