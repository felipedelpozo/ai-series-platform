# Tasks: Conversational Creative Copilot

**Input**: Design documents from `/specs/029-conversational-creative-copilot/`

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/copilot-api.md`, `quickstart.md`

**Tests**: Required. Feature 029 requires deterministic unit, PostgreSQL integration, API, accessibility, responsive, concurrency and idempotency evidence without paid providers.

## Phase 1: Setup and contracts

**Purpose**: Establish the package boundary and public contracts before persistence or UI work.

- [x] T001 Create the `@ai-series/copilot` workspace package skeleton and exports in `packages/copilot/package.json`, `packages/copilot/tsconfig.json`, and `packages/copilot/src/index.ts`
- [x] T002 Register the copilot package in root validation scripts and web dependencies in `package.json` and `apps/web/package.json`
- [x] T003 [P] Define bounded intent, context, proposal, change-set, diff, validation, decision, application, quote, and receipt schemas in `packages/copilot/src/contracts.ts`
- [x] T004 [P] Define application-owned typed errors and non-enumerating error mapping in `packages/copilot/src/errors.ts`
- [x] T005 [P] Record the durable copilot/canonical-domain boundary in `docs/adr/0001-conversational-copilot-boundary.md`

---

## Phase 2: Foundational persistence, security and canonical primitives

**Purpose**: Build the transactional and authorization foundation required by every story.

**CRITICAL**: No user-story implementation begins until this phase is green.

- [x] T006 Add copilot history, inference usage, rate-limit, proposal, validation, decision, application, quote, confirmation and job-provenance tables plus composite tenant keys/FKs and workspace-scoped Series slug constraints in `packages/db/src/schema.ts`
- [x] T007 Generate and inspect forward migration 0024 plus Drizzle metadata in `packages/db/migrations/0024_*.sql`, `packages/db/migrations/meta/0024_snapshot.json`, and `packages/db/migrations/meta/_journal.json`
- [x] T008 [P] Add canonical JSON, SHA-256 fingerprint and stable idempotency-key unit tests in `packages/copilot/src/fingerprint.test.ts`
- [x] T009 Implement canonical JSON, revision/base/diff/scope fingerprints and stable workspace intent keys in `packages/copilot/src/fingerprint.ts`
- [x] T010 [P] Add exhaustive proposal and cost state-transition tests in `packages/copilot/src/state.test.ts`
- [x] T011 Implement explicit proposal and cost state machines in `packages/copilot/src/state.ts`
- [x] T012 [P] Add workspace-explicit, transaction-aware Series/Bible primitives and regression tests in `packages/series/src/series.ts` and `packages/series/src/series.test.ts`
- [x] T013 [P] Add workspace-explicit, transaction-aware Entity version primitives and regression tests in `packages/entities/src/entities.ts` and `packages/entities/src/entities.test.ts`
- [x] T014 [P] Add transaction-aware EpisodePlan/Scene/Shot revision primitives and screenplay-mapping tests in `packages/planner/src/planner.ts`, `packages/planner/src/scenes.ts`, `packages/planner/src/planner.test.ts`, and `packages/planner/src/scenes.test.ts`
- [x] T015 [P] Make credit reservation transaction-safe and concurrency-tested in `packages/accounts/src/accounts.ts` and `packages/accounts/src/accounts.test.ts`
- [x] T016 [P] Add workspace-bound active/succeeded paid-job reconciliation and tests in `packages/jobs/src/jobs.ts` and `packages/jobs/src/jobs.test.ts`
- [x] T017 Implement Secure/HttpOnly/SameSite cookie sessions with Bearer compatibility and login/logout lifecycle in `apps/web/lib/auth.ts`, `apps/web/app/api/auth/login/route.ts`, and `apps/web/app/api/auth/logout/route.ts`
- [x] T018 Add reusable copilot authorization, strict cookie Origin/Host validation, membership, correlation, durable actor/workspace/operation rate limits, input bounds and safe-error helpers in `apps/web/lib/copilot-api.ts`
- [x] T019 Add migration and repository integration tests for direct-SQL composite-FK tenant isolation, immutable history, message/revision client-key replay, exact uniqueness, forward-compatible slug rollback and concurrent receipt creation in `packages/db/src/copilot.integration.test.ts`

**Checkpoint**: Foundational contracts, storage, locks, authentication and owner-domain write primitives are independently validated.

---

## Phase 3: User Story 1 — Create a complete series from the home page (Priority: P1) MVP

**Goal**: A creator starts at `/`, converses in workspace context, reviews one series/Bible/entities proposal and applies the exact approved revision atomically.

**Independent Test**: With deterministic generation, create a conversation, draft a complete series bundle, edit it, validate it, approve it, apply it and verify one Series plus its active Bible/entities and one immutable receipt; retry ten times and verify no duplicates.

### Tests for User Story 1

- [x] T020 [P] [US1] Add classification, bounded prompt-input, prompt-injection, unsupported-Season and complete-series change-contract tests in `packages/copilot/src/intake.test.ts` and `packages/copilot/src/contracts.test.ts`
- [x] T021 [P] [US1] Add proposal revision, full diff, validation finding, exact-decision and stale-base tests in `packages/copilot/src/proposals.test.ts`
- [x] T022 [P] [US1] Add atomic series-bundle apply, rollback, replay and ten-way concurrency integration tests in `packages/copilot/src/apply.integration.test.ts`
- [x] T023 [P] [US1] Add conversation-mode, viewer deterministic fallback/provider denial, message/inference-quote-confirm-generate/proposal/validate/decision/apply API contract tests in `apps/web/tests/api/copilot-series.test.ts`
- [x] T024 [P] [US1] Add desktop/mobile, keyboard, Axe and message/draft inference quote-confirm-cancel-expire-replay acceptance in `apps/web/e2e/copilot-series.spec.ts`

### Implementation for User Story 1

- [x] T025 [US1] Implement authorized canonical context capture with fixed workspace/series/resource bases in `packages/copilot/src/context.ts`
- [x] T026 [US1] Implement intent decomposition and query-versus-mutation classification without command authority in `packages/copilot/src/intake.ts`
- [x] T027 [US1] Register versioned `copilot.answer` and `copilot.proposal` purposes and seed prompts in `packages/prompts/src/purposes.ts`, `packages/prompts/src/registry.ts`, and `packages/prompts/src/seed.ts`
- [x] T028 [US1] Implement provider-independent structured draft generation with deterministic injection plus exact pre-inference quote/confirmation, real-AI quota reservation and provider/model/prompt/usage/duration/cost attribution in `packages/copilot/src/generator.ts` and `packages/ai/src/copilot.ts`
- [x] T029 [US1] Implement immutable conversations, required client-key idempotent messages/revisions, ordered responses, context snapshots and proposals in `packages/copilot/src/repository.ts`
- [x] T030 [US1] Implement full canonical diff plus structural/domain/ownership/base validation and actionable findings in `packages/copilot/src/validation.ts`
- [x] T031 [US1] Implement exact one-use approve/reject/discard decisions and invalidation rules in `packages/copilot/src/proposals.ts`
- [x] T032 [US1] Implement locked, revalidated, all-or-nothing Series/Bible/entities application and receipt reconciliation in `packages/copilot/src/apply.ts`
- [x] T033 [US1] Implement conversation, message, message-cost-confirm/generate, revision, validation, decision and apply handlers in `apps/web/app/api/copilot/conversations/route.ts`, `apps/web/app/api/copilot/conversations/[conversationId]/route.ts`, `apps/web/app/api/copilot/conversations/[conversationId]/messages/route.ts`, `apps/web/app/api/copilot/conversations/[conversationId]/messages/[messageId]/{cost/confirm,generate}/route.ts`, and `apps/web/app/api/copilot/proposals/[proposalId]/{revisions,validate,decision,apply}/route.ts`
- [x] T034 [US1] Replace the existing authenticated root redirect with copilot bootstrap inside the studio route group in `apps/web/app/(studio)/page.tsx` and `apps/web/lib/copilot-loader.ts`
- [x] T035 [US1] Build the responsive two-pane/mobile-tabs experience with visible context, statuses, safe next actions, viewer deterministic fallback and message/draft inference quote-confirm-cancel/expiry UI in `apps/web/components/copilot/CopilotWorkspace.tsx`, `apps/web/components/copilot/ConversationPane.tsx`, and `apps/web/components/copilot/ProposalReviewPane.tsx`
- [x] T036 [US1] Build accessible structured proposal editing, revision comparison, validation findings, explicit approval and immutable history components in `apps/web/components/copilot/ProposalEditor.tsx`, `apps/web/components/copilot/ProposalDiff.tsx`, and `apps/web/components/copilot/ConversationHistory.tsx`
- [x] T037 [US1] Update existing shell navigation and applied-resource links without duplicating workspace/studio state in `apps/web/components/studio-shell.tsx` and `apps/web/components/copilot/AppliedResourceLink.tsx`

**Checkpoint**: User Story 1 is a deployable MVP with exact approval and atomic canonical persistence.

---

## Phase 4: User Story 2 — Create the first episode in canonical context (Priority: P1)

**Goal**: From an authorized Series context, draft and atomically create an EpisodePlan revision with ordered canonical Scene/Shot screenplay content.

**Independent Test**: Select a Series with Bible/entities/story state, draft an episode, verify context provenance and continuity findings, apply it, then open the resulting Episode Studio; no screenplay table or parallel canon is created.

### Tests for User Story 2

- [x] T038 [P] [US2] Add SeriesBible/entities/StoryState context and missing-context validation tests in `packages/copilot/src/context.test.ts`
- [x] T039 [P] [US2] Add canonical Scene/Shot episode-contract, continuity conflict and allowed documented-exception, stale-plan and atomic apply integration tests in `packages/copilot/src/episode.integration.test.ts`
- [x] T040 [P] [US2] Add episode proposal/apply API contract tests in `apps/web/tests/api/copilot-episode.test.ts`
- [x] T041 [P] [US2] Add episode context selection, conflict recovery, Episode Studio return without conversation loss and navigation E2E coverage in `apps/web/e2e/copilot-episode.spec.ts`

### Implementation for User Story 2

- [x] T042 [US2] Extend authorized context assembly with active Bible, entity versions, StoryState and EpisodePlan bases in `packages/copilot/src/context.ts`
- [x] T043 [US2] Implement EpisodePlan plus ordered Scene/Shot change validation and continuity findings in `packages/copilot/src/validation.ts`
- [x] T044 [US2] Implement immutable EpisodePlan/Scene/Shot aggregate application and result links in `packages/copilot/src/apply.ts`
- [x] T045 [US2] Add series/episode/resource context switching and Episode Studio navigation to `apps/web/components/copilot/ContextSelector.tsx` and `apps/web/components/copilot/AppliedResourceLink.tsx`

**Checkpoint**: User Story 2 works without introducing a Season or screenplay source of truth.

---

## Phase 5: User Story 3 — Query and modify existing resources (Priority: P2)

**Goal**: Authorized users can ask read-only questions without approval and can revise/archive supported canonical resources only through a proposal.

**Independent Test**: A viewer obtains a grounded answer with resource links but cannot mutate; an editor revises a Bible/entity/plan, sees the complete diff, and stale or foreign targets never apply or leak existence.

### Tests for User Story 3

- [x] T046 [P] [US3] Add grounded read-only answer, mixed-intent decomposition and unsupported-resource tests in `packages/copilot/src/query.test.ts`
- [x] T047 [P] [US3] Add multi-resource update/archive/relationship, exact base, entity archive, viewer denial and cross-workspace non-enumeration integration tests in `packages/copilot/src/modification.integration.test.ts`
- [x] T048 [P] [US3] Add viewer deterministic-query/provider-denial, actionable-mode rejection, mixed-intent and IDOR API tests in `apps/web/tests/api/copilot-query.test.ts`
- [x] T049 [P] [US3] Add query, modification, reject/discard and viewer E2E coverage in `apps/web/e2e/copilot-query.spec.ts`

### Implementation for User Story 3

- [x] T050 [US3] Implement source-linked grounded queries and separable mixed-intent responses in `packages/copilot/src/query.ts`
- [x] T051 [US3] Extend proposal validation and apply for Series rename/archive, Bible/Entity/EpisodePlan revisions, entity archive and explicit multi-resource dependencies in `packages/copilot/src/validation.ts` and `packages/copilot/src/apply.ts`
- [x] T052 [US3] Render grounded answer references, mixed-intent boundaries, reject/discard results and read-only viewer history in `apps/web/components/copilot/ConversationPane.tsx` and `apps/web/components/copilot/ProposalReviewPane.tsx`

**Checkpoint**: Read-only and mutation paths are visibly distinct, tenant-safe and independently testable.

---

## Phase 6: User Story 4 — Confirm paid work separately (Priority: P2)

**Goal**: Paid generation requires an exact, expiring quote and separate confirmation; concurrent retries reserve quota and create at most one reusable job.

**Independent Test**: Quote a validated paid intent, confirm amount/scope/quota, start it ten times concurrently and verify one quota reservation plus one queued/running/reusable succeeded job; altered or expired evidence starts nothing.

### Tests for User Story 4

- [x] T053 [P] [US4] Add inference attribution, quote expiry, exact editorial approval, independent-vs-receipt dependency, scope/revision/permission/quota invalidation and safe-error tests in `packages/copilot/src/cost.test.ts`
- [x] T054 [P] [US4] Add atomic inference/job quota plus ten-way paid-start deduplication and both mixed-intent orderings in `packages/copilot/src/cost.integration.test.ts`
- [x] T055 [P] [US4] Add quote/confirm/start, missing approval/receipt, cross-site cookie, rate-limit, viewer and IDOR contract tests in `apps/web/tests/api/copilot-cost.test.ts`
- [x] T056 [P] [US4] Add separate cost-dialog, expiry and duplicate-click E2E coverage in `apps/web/e2e/copilot-cost.spec.ts`

### Implementation for User Story 4

- [x] T057 [US4] Implement immutable exact approval-bound quotes, separate confirmations, explicit target dependencies, invalidation and atomic job launch/reconciliation in `packages/copilot/src/cost.ts`
- [x] T058 [US4] Implement quote, confirm and start endpoints in `apps/web/app/api/copilot/proposals/[proposalId]/cost/{quote,confirm,start}/route.ts`
- [x] T059 [US4] Build the separate accessible cost confirmation and status UI in `apps/web/components/copilot/CostConfirmationDialog.tsx` and `apps/web/components/copilot/ProposalReviewPane.tsx`

**Checkpoint**: No paid call can occur from free text or canonical approval alone.

---

## Phase 7: User Story 5 — Review, recover and continue (Priority: P3)

**Goal**: Reloaded conversations reconstruct full persisted history, explain interruptions/conflicts, preserve safe state and support recovery without duplicate effects.

**Independent Test**: Interrupt before and after commit, reload the conversation, reconcile the receipt/job, display context/state/cause/next action, and continue or branch to a new proposal revision without lost history.

### Tests for User Story 5

- [x] T060 [P] [US5] Add conversation projection, required client message/revision replay, out-of-order response, interruption and receipt/job reconciliation tests in `packages/copilot/src/recovery.test.ts`
- [x] T061 [P] [US5] Add reload/history pagination/retry API tests in `apps/web/tests/api/copilot-recovery.test.ts`
- [x] T062 [P] [US5] Add refresh, interrupted apply, stale conflict, recoverable error and focus recovery E2E coverage in `apps/web/e2e/copilot-recovery.spec.ts`

### Implementation for User Story 5

- [x] T063 [US5] Implement bounded conversation projection, state cause/next-action derivation and receipt/job reconciliation in `packages/copilot/src/recovery.ts`
- [x] T064 [US5] Return paginated reconstructible history and reconciliation state from `packages/copilot/src/repository.ts` and `apps/web/app/api/copilot/conversations/[conversationId]/route.ts`
- [x] T065 [US5] Add reload-safe client state, accessible log/live regions, retry controls and explicit focus restoration in `apps/web/components/copilot/CopilotWorkspace.tsx` and `apps/web/components/copilot/ConversationHistory.tsx`

**Checkpoint**: Persistent history, safe recovery and idempotent effects survive refreshes and uncertain client outcomes.

---

## Phase 8: Polish, traceability and release gates

**Purpose**: Close cross-cutting security, observability, documentation and whole-repository evidence.

- [x] T066 [P] Add structured redacted correlation/audit events, inference attribution and workspace-lifetime retention enforcement in `packages/copilot/src/observability.ts` and `docs/operations/copilot.md`
- [x] T067 [P] Maintain the Feature 029 matrix for all 52 FRs, 12 SCs and 21 scenarios in `specs/029-conversational-creative-copilot/traceability.md`
- [x] T068 [P] Add input-size, untrusted-ID, prompt-injection, cross-site cookie, actor/workspace/operation rate-limit, role-revocation, direct tenant-FK and secret-redaction security tests in `packages/copilot/src/security.test.ts` and `apps/web/tests/api/copilot-security.test.ts`
- [x] T069 Validate migration from an empty database and the current schema plus forward-compatible composite-slug rollback in `packages/db/migrations/0024_*.sql` and record evidence in `specs/029-conversational-creative-copilot/validation.md`
- [x] T070 Run focused package/API/E2E tests, formatting, typecheck, lint, deterministic suite and production build; record PASS/BLOCK/NOT_RUN/SKIPPED/UNAVAILABLE separately in `specs/029-conversational-creative-copilot/validation.md`
- [x] T071 Execute the `quickstart.md` happy path plus conflict, viewer, CSRF/rate-limit and cost scenarios without paid providers and record evidence in `specs/029-conversational-creative-copilot/validation.md`
- [x] T072 Perform independent specification, architecture, security and diff convergence review and record resolved/unresolved findings in `specs/029-conversational-creative-copilot/validation.md`
- [x] T073 Run the explicitly authorized real OpenAI query/draft smoke through visible quote-confirm-generate with usage/cost attribution and record PASS or blocking UNAVAILABLE evidence in `specs/029-conversational-creative-copilot/validation.md`
- [x] T074 Run the ten-participant SC-001/SC-008 usability protocol or record the manual release gate as NOT_RUN in `specs/029-conversational-creative-copilot/validation.md`

---

## Dependencies and execution order

### Phase dependencies

- Phase 1 establishes interfaces and can begin immediately.
- Phase 2 depends on T001–T004 and blocks every user story.
- US1 depends on Phase 2 and is the MVP.
- US2 depends on US1 proposal/application infrastructure but is independently demonstrable with EpisodePlan fixtures.
- US3 depends on US1 query/proposal infrastructure and may proceed alongside US2 after that boundary is stable.
- US4 depends on exact proposal revisions plus foundational quota/job primitives, not on US2 or US3.
- US5 depends on persisted effects from US1 and US4 and closes recovery behavior.
- Phase 8 follows all selected stories and blocks delivery.

### Parallel opportunities

- T003–T005 are independent contract/ADR work.
- T012–T016 use separate package ownership after T006–T011 fix the shared contracts.
- Each story's tests marked `[P]` can be authored in parallel before its implementation.
- After US1 stabilizes the application boundary, US2, US3 and US4 own distinct context/query/cost files and can proceed concurrently; edits to `validation.ts`, `apply.ts` and `ProposalReviewPane.tsx` must be serialized by the orchestrator.
- T066–T068 are independent before final gates.

## Implementation strategy

1. Deliver the US1 MVP first: authorized conversation, immutable series-bundle proposal, full validation/diff, exact approval, atomic apply and receipt.
2. Extend the same contracts to canonical EpisodePlan/Scene/Shot creation; do not introduce Season or screenplay persistence.
3. Add grounded queries and supported modifications, then the separately confirmed cost gate.
4. Close reload/reconciliation behavior and run cross-cutting security, migration, accessibility and repository gates.
5. Treat measurable usability targets SC-001 and SC-008 as a manual release gate and the real OpenAI smoke as an opt-in external-integration gate; neither can be replaced by simulated evidence.

## Format validation

All 74 tasks use the required checkbox plus sequential `T###` identifier format. Story-phase tasks contain their `[US#]` label; `[P]` appears only where files and prerequisites permit parallel work; every task names concrete repository paths.
