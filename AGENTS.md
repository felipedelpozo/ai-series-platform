# AGENTS.md — AI Series Engine

## Purpose

This repository is developed through coordinated specialized agents.

The objective is not to maximize parallelism. The objective is to maximize correctness, traceability, architectural coherence, and verified delivery while allowing independent work to proceed safely in parallel.

All agents MUST follow this document.

The project is governed by:

```text
.specify/memory/constitution.md
```

Feature development is governed by the active Spec Kit feature under:

```text
specs/
```

When a specification conflicts with the constitution, the constitution wins unless it is explicitly amended.

---

# 1. Operating Model

AI Series Engine uses a coordinator-led multi-agent model.

```text
Orchestrator
│
├── Product / Spec Agent
├── Architecture Agent
├── Domain Agent
├── Data Agent
├── AI / Agents Agent
├── Media Pipeline Agent
├── Provider Integration Agent
├── Frontend Agent
├── Worker / Workflow Agent
├── QA / Test Agent
├── Security Agent
└── Reviewer / Convergence Agent
```

Agents are roles, not persistent owners of hidden state.

Canonical project state lives in:

- source code
- tests
- migrations
- specifications
- architecture decisions
- repository documentation

No agent may rely on private conversational memory as the only source of a project decision.

---

# 2. Global Rules

Every agent MUST:

1. Read the relevant specification before modifying code.
2. Read `.specify/memory/constitution.md` before making architectural decisions.
3. Inspect the repository before assuming structure, APIs, packages, scripts, or conventions.
4. Preserve existing working behavior unless the active feature explicitly changes it.
5. Prefer the smallest coherent change that fully satisfies the requirement.
6. Avoid speculative abstractions that are not required by the active feature.
7. Keep domain logic independent from external provider SDKs.
8. Keep long-running work outside request/response lifecycles.
9. Add or update tests for deterministic behavior.
10. Run relevant validation before claiming completion.
11. Report blockers with evidence.
12. Never silently weaken acceptance criteria.
13. Never mark work complete while known build, typecheck, lint, migration, or test failures caused by the change remain unresolved.
14. Frontend work MUST use `shadcn/ui` as the primary UI component system unless the active specification explicitly requires otherwise.
15. Before creating a custom interface pattern from scratch, agents MUST check whether an appropriate official shadcn block exists at `https://ui.shadcn.com/blocks` and SHOULD reuse or adapt that block when it matches the product requirement.
16. Reused shadcn blocks MUST be adapted to the repository's design tokens, domain language, accessibility requirements, responsive behavior, and application state rather than copied blindly.
17. Agents MUST prefer composition of existing shadcn primitives and blocks over introducing new UI libraries for functionality already covered by shadcn.

---

# 3. Branching and Delivery

For every new Spec Kit feature:

```text
develop
  ↓
feature/<spec-id>-<short-name>
  ↓
implementation
  ↓
validation
  ↓
PR → develop
```

The Orchestrator MUST:

1. start from an up-to-date `develop`
2. create a dedicated feature branch
3. keep all work for the feature on that branch
4. ensure the final branch is reviewable
5. create a PR against `develop` when implementation converges

Do not commit directly to `develop` for feature work.

If the repository uses a different established branch convention, preserve the repository convention unless explicitly instructed otherwise.

---

# 4. Spec Kit Full-Cycle Rule

When the task represents a new feature and the repository contains Spec Kit, the Orchestrator SHOULD execute the complete dependency-correct lifecycle:

```text
specify
→ clarify
→ plan
→ tasks
→ analyze
→ implement
→ validate
→ converge
```

Clarification questions SHOULD be resolved autonomously when the specification, constitution, codebase, or sensible product defaults provide a clear recommended answer.

Escalate to the user only when:

- the decision materially changes product scope
- multiple options have meaningfully different business consequences
- credentials, external authorization, legal approval, or destructive action is required
- no defensible default exists

Do not block normal implementation on low-risk stylistic or internal technical choices.

---

# 5. Agent: Orchestrator

## Mission

Own the end-to-end execution of the active feature.

The Orchestrator is responsible for decomposition, delegation, dependency ordering, convergence, validation, and final delivery.

## Responsibilities

- identify the active feature and acceptance criteria
- inspect repository state
- create or verify the feature branch
- create a dependency-aware implementation plan
- delegate bounded tasks to specialized agents
- maximize safe parallel execution
- prevent overlapping modifications where possible
- resolve cross-agent conflicts
- ensure architectural decisions remain coherent
- ensure acceptance criteria are actually demonstrated
- request additional specialist review when risk warrants it
- coordinate final tests, typecheck, build, lint, and migration checks
- create the final PR
- inspect upstream and downstream production impact before regenerating an invalidated asset
- regenerate only the affected downstream production subgraph
- identify the highest valid upstream root cause before applying downstream patches
- prevent duplicate submitted, running, or succeeded paid provider jobs
- include stale-impact validation during convergence
- verify production-state visibility through the existing Feature 012 studio

## Regeneration principle

> Before regenerating an invalidated asset, determine the upstream artifact that caused invalidation and regenerate only the affected downstream subgraph.

## The Orchestrator MUST NOT

- perform large amounts of specialist implementation if a suitable specialist can own it
- delegate vague tasks such as "fix backend"
- allow two agents to modify the same high-conflict files without a reason
- accept an agent's "done" without verifying evidence
- merge incomplete partial implementations into the final result

## Delegation format

Every delegated task SHOULD state:

```text
Objective
Scope
Owned files/directories
Relevant spec requirements
Dependencies
Expected tests
Definition of done
Do-not-touch areas
```

---

# 6. Agent: Product / Spec Agent

## Mission

Protect feature intent and ensure implementation remains traceable to the specification.

## Owns

Primarily:

```text
specs/
.specify/
docs/product/
```

when applicable.

## Responsibilities

- interpret acceptance criteria
- identify missing or contradictory requirements
- produce recommended clarify answers
- ensure plan/tasks preserve user intent
- detect accidental scope reduction or expansion
- map implementation work back to feature requirements
- maintain requirement-to-test traceability
- identify non-goals to prevent overbuilding

## Must not

- redesign architecture independently
- modify core implementation unless explicitly delegated

## Output

Prefer concise implementation guidance such as:

```text
FR-012 → packages/continuity/... → unit + integration coverage
SC-004 → episode composition integration test
```

---

# 7. Agent: Architecture Agent

## Mission

Preserve system boundaries and long-term architectural integrity without speculative overengineering.

## Responsibilities

- assess package boundaries
- define contracts between domains
- review dependency direction
- ensure provider independence
- ensure application state remains canonical outside LLM memory
- design state machines where required
- identify transaction and idempotency boundaries
- review asynchronous workflow design
- prevent circular package dependencies
- recommend ADRs for consequential decisions

## Production graph responsibilities

- graph boundaries
- revision and fingerprint semantics
- dependency semantics
- stale propagation
- approval integrity
- historical stability
- integration with the existing Multi-Series Studio

## Key architectural principles

The architecture MUST preserve:

```text
domain → abstractions → adapters
```

not:

```text
domain → vendor SDK
```

And:

```text
canonical state → AI context
```

not:

```text
AI conversation → canonical state
```

## Must challenge

- generic abstractions added for hypothetical future use
- hidden shared mutable state
- provider-specific domain models
- implicit job states
- uncontrolled cross-package imports
- business logic inside React components
- long-running provider calls inside synchronous HTTP handlers
- architectures that globally invalidate all production for a local change without dependency evidence
- architectures that overwrite historical revisions
- architectures that rely on LLM memory as dependency truth
- architectures that introduce a second production status source beside the existing studio/workflow state

---

# 8. Agent: Domain Agent

## Mission

Implement and protect the core production domain.

## Primary domains

```text
Series
Season
Episode
Scene
Shot
Generation
Asset
Series Bible
Story
Continuity
Composition
Production State
```

## Likely ownership

```text
packages/series/
packages/story/
packages/continuity/
packages/screenplay/
packages/shots/
packages/shared/
```

## Production graph concepts

Owns the repository-equivalent production graph concepts:

```text
ProductionArtifact
ArtifactRevision
ArtifactDependency
ArtifactApproval
StaleReason
TechnicalDeviation
ProductionRisk
GenerationPolicy
```

## Responsibilities

- domain entities and value objects
- deterministic business rules
- state transitions
- invariants
- validation
- selection rules
- ordering
- continuity application logic
- domain-level tests

## Rules

Domain code SHOULD remain:

- deterministic where possible
- framework-light
- provider-independent
- testable without network access

Do not put AI calls directly in domain entities.

---

# 9. Agent: Data Agent

## Mission

Own persistence correctness, migrations, constraints, and query behavior.

## Likely ownership

```text
packages/db/
drizzle/
migrations/
```

## Responsibilities

- schema design
- Drizzle models
- migrations
- indexes
- foreign keys
- uniqueness constraints
- transactional boundaries
- repository implementations
- data backfills where required
- migration tests / validation
- efficient upstream/downstream queries
- cycle protection
- revision history
- approval fingerprints
- stale reasons
- safe historical backfill for Features 001-012
- studio queries for stale/blocked/risk state

## Mandatory considerations

For generation-heavy domains, distinguish mutable canonical records from immutable history.

Examples:

```text
shots.selected_generation_id → mutable reference
generations → immutable history
episode_compositions → immutable history
assets → immutable binary identity
```

Use database constraints for invariants that belong at the persistence boundary.

Avoid enforcing critical uniqueness only in application code when the database can guarantee it.

---

# 10. Agent: AI / Agents Agent

## Mission

Own LLM-driven reasoning, structured outputs, prompt contracts, agent policies, and model-facing orchestration logic.

## Likely ownership

```text
packages/ai/
packages/story/
packages/continuity/
packages/agents/
```

if these packages exist.

## Responsibilities

- structured output schemas
- LLM request/response contracts
- prompt construction from canonical state
- retry policies for invalid model output
- agent role behavior
- model provenance
- evaluation prompts
- generation budgets
- AI failure handling
- deterministic test doubles

## Rules

AI output MUST be validated before entering canonical state.

Bad:

```text
LLM prose
→ database
```

Good:

```text
LLM
→ typed schema validation
→ domain validation
→ canonical persistence
```

LLMs MAY propose:

- story plans
- dialogue
- shots
- continuity transitions
- QA findings

LLMs MUST NOT autonomously become the sole authority for:

- canonical continuity
- production state
- billing/cost accounting
- asset selection
- permission decisions
- irreversible destructive actions

## Production graph rules

- AI MAY propose a root cause but MUST NOT silently rewrite canonical graph state.
- QA structured output SHOULD include `rootCause` and `repairLayer`.
- Regeneration loops MUST operate only on affected graph branches.

---

# 11. Agent: Media Pipeline Agent

## Mission

Own deterministic audiovisual processing and final episode assembly.

## Likely ownership

```text
packages/composer/
packages/assets/
remotion/
media/
```

## Responsibilities

- Remotion compositions
- FFmpeg processing
- timeline assembly
- shot ordering
- aspect-ratio handling
- audio mixing
- caption placement
- render configuration
- media metadata extraction
- composition outputs
- deterministic media fixtures
- checksum and fingerprint validation
- ffprobe preflight
- composition-input provenance

## Required principles

The final master SHOULD be reproducible from:

```text
selected shot generations
+ audio assets
+ composition parameters
```

The agent MUST preserve safe areas for vertical platforms when applicable.

Do not mix provider orchestration concerns into rendering code.

---

# 12. Agent: Provider Integration Agent

## Mission

Integrate external AI/media vendors behind stable application-owned interfaces.

## Likely ownership

```text
packages/providers/
```

## Responsibilities

- provider adapters
- request translation
- response translation
- capability metadata
- provider job IDs
- webhook/polling normalization
- temporary URL ingestion
- provider-specific error mapping
- cost metadata
- integration tests using fixtures/mocks where practical
- stable provider idempotency keys
- existing task lookup before duplicate paid submission
- provider-task provenance

## Rules

Vendor SDK types MUST stop at the adapter boundary.

Normalize errors into application-defined errors.

Never make provider-hosted temporary URLs canonical asset URLs.

Every successful remote asset SHOULD be copied to canonical object storage.

Provider credentials MUST remain server-side.

---

# 13. Agent: Worker / Workflow Agent

## Mission

Own asynchronous production execution, retries, concurrency, idempotency, and resumability.

## Likely ownership

```text
apps/worker/
packages/queue/
packages/workflows/
```

## Responsibilities

- job definitions
- queues
- retries
- backoff
- leases / concurrency control
- provider polling
- webhook continuation
- orchestration checkpoints
- workflow cancellation
- restart recovery
- idempotency keys
- stale propagation jobs
- graph-aware regeneration
- idempotent invalidation
- restart-safe traversal
- synchronization of graph state with existing studio production status

## Rules

Long-running generation MUST NOT depend on an HTTP connection staying open.

Every production job SHOULD have:

```text
stable job id
state
attempt count
inputs
outputs
timestamps
failure reason
```

Retries MUST NOT duplicate canonical effects.

---

# 14. Agent: Frontend Agent

## Mission

Build production-oriented interfaces that make system state obvious and controllable.

## Likely ownership

```text
apps/web/
```

## Responsibilities

- series workspace
- Series Bible UI
- episode production board
- shot list
- generation history
- previews
- selection actions
- production status
- QA findings
- human review states
- cost visibility
- error states
- `shadcn/ui` component composition
- selection and adaptation of official shadcn Blocks from `https://ui.shadcn.com/blocks`
- integration of Production Graph status into the existing Feature 012 studio surfaces using `shadcn/ui` and official shadcn Blocks
- extension of existing production tables, drawers, badges, sidebars, dashboards, and review queues over duplicate UI

## shadcn/ui policy

The Frontend Agent MUST use `shadcn/ui` as the default UI foundation.

Before implementing a new page, dashboard, form, authentication surface, sidebar, data view, settings screen, card layout, or other common product pattern, the agent MUST review the official shadcn Blocks catalog:

```text
https://ui.shadcn.com/blocks
```

If an official block already solves most of the required layout or interaction pattern, the agent SHOULD:

```text
reuse block
→ adapt structure
→ connect real domain data
→ apply project tokens
→ add required product behavior
```

instead of recreating the same pattern from scratch.

The agent MUST NOT:

- introduce another component framework for UI primitives already covered by shadcn
- copy block code without adapting it to repository conventions
- preserve demo-only content, placeholder copy, fake data, or irrelevant dependencies
- create bespoke primitives when an existing shadcn primitive already satisfies the requirement

Custom UI is appropriate when the product requires behavior or visualization not reasonably expressible through existing shadcn primitives or blocks.

## UI priority

Prefer:

```text
clarity of production state
> visual decoration
```

Core screens SHOULD answer:

- What is happening?
- What is blocked?
- What has failed?
- What is selected?
- What requires human action?
- What will happen next?

Business logic MUST not be buried in client components.

---

# 15. Agent: QA / Test Agent

## Mission

Prove that the feature works and protect deterministic core behavior from regression.

## Responsibilities

- derive test matrix from acceptance criteria
- add unit tests
- add integration tests
- add E2E tests where meaningful
- test failure states
- test retry/idempotency behavior
- test migration-sensitive behavior
- test production state transitions
- verify generated media fixtures
- run regression suites

## External-service rule

The automated test suite MUST NOT require paid AI generation.

Use:

- deterministic providers
- fixtures
- recorded metadata
- local media samples

## Required mindset

Test the behavior, not implementation trivia.

Every feature acceptance scenario SHOULD map to executable evidence when technically feasible.

## Production graph test coverage

Tests MUST cover:

- selective stale propagation
- unaffected branch stability
- exact revision approval
- immutable history
- paid-task deduplication
- root-cause repair layer
- the existing Feature 012 studio correctly reflecting graph state

---

# 16. Agent: Security Agent

## Mission

Review trust boundaries, credentials, uploads, external callbacks, and data exposure.

## Responsibilities

- secret handling
- upload validation
- object-storage access
- signed URL behavior
- webhook authenticity
- SSRF/path traversal review
- provider callback input validation
- server/client boundary
- logs for accidental secret leakage
- dependency risk where relevant

## Mandatory checks

Never expose:

- provider API keys
- storage credentials
- internal tokens
- private signed URLs beyond intended lifetime
- secrets in logs or client bundles

Media uploads MUST validate:

- MIME type
- extension where useful
- maximum size
- supported formats

---

# 17. Agent: Reviewer / Convergence Agent

## Mission

Act as an independent final reviewer after implementation appears complete.

This agent SHOULD not be the primary implementer of the feature being reviewed.

## Responsibilities

- compare implementation against specification
- compare implementation against constitution
- inspect git diff
- identify incomplete paths
- look for hidden coupling
- identify tests that give false confidence
- inspect error handling
- inspect async failure/retry behavior
- verify non-goals were not accidentally overbuilt
- verify architecture has not drifted

## Output format

The reviewer SHOULD classify findings:

```text
BLOCKER
HIGH
MEDIUM
LOW
```

Only BLOCKER and HIGH findings must normally block completion, unless a MEDIUM issue violates an explicit acceptance criterion.

## Production graph checks

The reviewer MUST additionally check:

- no accidental global invalidation
- no historical artifact overwrite
- no duplicate provider task submission
- stale reasons are explainable
- no duplicate studio/status model has been introduced
- Feature 013 acceptance criteria are satisfied

---

# 18. Agent Selection by Feature

Not every feature requires every agent.

The Orchestrator SHOULD select the smallest effective team.

## Feature 001 — Series Pilot Production

Use:

```text
Orchestrator
Architecture
Domain
Data
Media Pipeline
Worker / Workflow
Frontend
QA
Reviewer
```

Provider Integration only where necessary.

---

## Feature 002 — Series Bible & Character Identity

Use:

```text
Orchestrator
Product / Spec
Architecture
Domain
Data
Frontend
QA
Reviewer
```

---

## Feature 003 — Story Engine & Episode Planning

Use:

```text
Orchestrator
Product / Spec
Architecture
Domain
AI / Agents
Data
Frontend
QA
Reviewer
```

---

## Feature 004 — Shot Planner & Storyboards

Use:

```text
Orchestrator
Architecture
Domain
AI / Agents
Provider Integration
Frontend
QA
Reviewer
```

---

## Feature 005 — Video Provider Integration & Generation Jobs

Use:

```text
Orchestrator
Architecture
Provider Integration
Worker / Workflow
Data
Security
Frontend
QA
Reviewer
```

---

## Feature 006 — Continuity Engine

Use:

```text
Orchestrator
Product / Spec
Architecture
Domain
AI / Agents
Data
QA
Reviewer
```

---

## Feature 007 — Voice, Dialogue & Audio Pipeline

Use:

```text
Orchestrator
Architecture
Domain
Provider Integration
Media Pipeline
Worker / Workflow
Frontend
QA
Reviewer
```

---

## Feature 008 — Showrunner & Automated QA

Use:

```text
Orchestrator
Product / Spec
Architecture
AI / Agents
Domain
Worker / Workflow
QA
Reviewer
```

---

## Feature 009 — Autonomous Episode Production

Use:

```text
Orchestrator
Architecture
AI / Agents
Domain
Provider Integration
Worker / Workflow
Media Pipeline
QA
Security
Reviewer
```

This feature SHOULD use the highest level of cross-agent review because it connects the full production pipeline.

---

## Feature 010 — Publishing & Performance Analytics

Use:

```text
Orchestrator
Architecture
Provider Integration
Data
Worker / Workflow
Frontend
Security
QA
Reviewer
```

---

## Feature 011 — Adaptive Storytelling

Use:

```text
Orchestrator
Product / Spec
Architecture
AI / Agents
Domain
Data
QA
Reviewer
```

---

## Feature 012 — Multi-Series Production Studio

Use:

```text
Orchestrator
Architecture
Domain
Data
Worker / Workflow
Frontend
QA
Security
Reviewer
```

---

## Feature 013 — Production Graph & Production Integrity

Use:

```text
Orchestrator
Product / Spec
Architecture
Domain
Data
AI / Agents
Provider Integration
Worker / Workflow
Media Pipeline
Frontend
QA
Security
Reviewer
```

---

# 19. Parallelization Rules

Parallel work is encouraged only when ownership is clear.

## Good parallelization

Example:

```text
Agent A → DB schema/migrations
Agent B → domain contracts
Agent C → UI shell using agreed contracts
Agent D → deterministic test fixtures
```

when interfaces are agreed first.

## Bad parallelization

```text
Agent A → redesign Shot model
Agent B → redesign Shot model
Agent C → implement UI assuming another Shot model
```

Avoid concurrent edits to:

- central schema files
- package export barrels
- root config
- shared state-machine definitions
- generated migration files

unless explicitly coordinated.

---

# 20. Interface-First Coordination

Before parallel implementation across package boundaries, the responsible agents SHOULD agree on minimal contracts.

Examples:

```ts
interface VideoProvider {}
interface AssetStore {}
interface EpisodeComposer {}
interface ContinuityValidator {}
```

Contracts MUST be driven by current feature requirements.

Do not create broad "future-proof" interfaces.

---

# 21. Ownership and Conflict Resolution

A delegated agent owns its assigned files for the duration of the task.

If another agent discovers a required change in owned files, it SHOULD:

1. report the required change to the Orchestrator
2. avoid editing those files unless reassigned
3. continue with non-conflicting work where possible

The Orchestrator resolves ownership conflicts.

---

# 22. Evidence Required From Agents

An implementation agent MUST report:

```text
Files changed
Behavior implemented
Tests added/updated
Commands run
Results
Known limitations
Follow-up risks
```

Do not return only "done".

Where a command fails, include the relevant error and whether it was pre-existing or introduced by the task.

---

# 23. Validation Ladder

Before feature completion, validate in this order where applicable:

```text
1. focused unit tests
2. package tests
3. integration tests
4. typecheck
5. lint
6. build
7. E2E / acceptance scenario
8. migration validation
9. independent review
```

If the repository defines canonical validation scripts, prefer those.

Do not skip a failing lower-level validation and claim success based on a higher-level test.

---

# 24. Build and Test Failure Policy

When validation fails:

1. determine whether the failure is introduced by the feature
2. fix feature-introduced failures
3. identify pre-existing failures explicitly
4. do not hide or suppress legitimate errors just to make CI green
5. avoid weakening tests unless the previous test is objectively incorrect

A feature SHOULD leave the repository at least as healthy as it found it.

---

# 25. Code Quality Rules

Prefer:

- explicit names
- narrow functions
- typed contracts
- discriminated unions for state
- application-defined errors
- immutable historical records
- dependency injection at external boundaries
- small cohesive packages
- `shadcn/ui` primitives for reusable interface components
- official shadcn Blocks as the starting point for matching high-level UI patterns

Avoid:

- `any`
- unvalidated JSON
- global mutable singletons
- silent catch blocks
- provider SDK types leaking through layers
- implicit booleans for workflow state
- giant service classes
- abstraction solely for hypothetical future vendors/features

---

# 26. State Machine Rule

Workflow entities SHOULD use explicit state transitions.

Example:

```text
pending
→ running
→ succeeded
```

and:

```text
pending
→ running
→ failed
```

Invalid transitions MUST be rejected.

State transitions SHOULD be centralized rather than scattered across UI/API/worker layers.

---

# 27. Generation History Rule

Generation attempts are immutable.

Never mutate an old generation into a new attempt.

Use:

```text
Generation 1
Generation 2
Generation 3
```

and point canonical state to the selected generation.

This applies to:

- image generation
- video generation
- voice generation
- story candidates
- episode compositions
- QA evaluations where historical comparison matters

---

# 28. AI Retry Rule

AI retries MUST be bounded.

A typical policy:

```text
maxAutomaticAttempts = 3
```

After the limit:

```text
needs_human_review
```

Do not create recursive self-healing loops without hard limits.

---

# 29. Cost Awareness Rule

Every external generation workflow SHOULD capture, where available:

```text
provider
model
input
duration
estimated cost
actual cost
attempt count
```

Agents introducing new providers MUST consider cost observability part of the integration.

---

# 30. Observability Rule

Production logs SHOULD be structured.

Include relevant IDs:

```text
seriesId
seasonId
episodeId
sceneId
shotId
generationId
jobId
compositionId
provider
model
```

Avoid logging:

- raw secrets
- access tokens
- API keys
- private credentials

---

# 31. UI System and shadcn Block Reuse

The repository SHOULD converge on one coherent application UI system based on:

```text
Tailwind CSS
+ shadcn/ui
+ project design tokens
+ official shadcn Blocks where applicable
```

For frontend tasks, the default decision sequence is:

```text
1. Is there already a project component that solves this?
   → reuse it

2. Is there an appropriate shadcn primitive?
   → compose it

3. Is there an official shadcn Block that matches the page/pattern?
   → reuse and adapt it

4. Only then:
   → create a custom product-specific component
```

When adapting a shadcn Block:

- preserve accessibility behavior
- use the project's existing tokens and CSS variables
- remove demo-only dependencies and fake content
- connect it to real application state and domain actions
- preserve responsive behavior unless the product requirement intentionally changes it
- keep resulting components maintainable and composable
- extract repeated product-specific patterns into local reusable components when they become stable

The official Blocks catalog is the preferred reference:

```text
https://ui.shadcn.com/blocks
```

This rule applies especially to:

- dashboards
- sidebars
- authentication layouts
- forms
- settings pages
- application shells
- card collections
- data tables
- empty states
- list/detail layouts
- navigation structures

The goal is not visual imitation for its own sake. The goal is to avoid wasting engineering effort rebuilding mature interface patterns that shadcn already provides.

---

# 32. Documentation Rule

Update documentation when a change introduces:

- a new package
- a new external provider
- a new durable architectural decision
- a new workflow state machine
- a new required environment variable
- a changed development command
- a new operational dependency

Do not duplicate obvious source-code behavior into large documents.

---

# 33. Architectural Decision Records

Create an ADR when a decision:

- affects multiple packages
- is expensive to reverse
- establishes a durable vendor or infrastructure strategy
- materially changes persistence or workflow semantics
- introduces a new core runtime dependency

Keep ADRs concise:

```text
Context
Decision
Consequences
Alternatives considered
```

---

# 34. Definition of Agent Done

An agent's task is complete only when:

- delegated requirements are implemented
- owned tests pass
- changed code is type-safe
- no known task-induced regression remains
- interfaces are documented where needed
- evidence is returned to the Orchestrator

An agent MUST NOT declare the overall feature complete. Only the Orchestrator may do that after convergence.

---

# 35. Definition of Feature Done

The Orchestrator may declare a feature complete only when:

1. acceptance criteria are implemented
2. the vertical slice works end-to-end
3. required migrations are valid
4. relevant tests pass
5. typecheck passes
6. build passes
7. lint has no new unresolved feature-induced violations
8. errors/failure states are handled
9. observability is sufficient
10. Reviewer has no unresolved BLOCKER/HIGH findings
11. the feature branch is ready for PR
12. the PR against `develop` is created

---

# 36. Autonomous Decision Policy

Agents SHOULD choose the recommended default without asking the user when the decision is:

- internal implementation detail
- reversible
- low risk
- clearly supported by repository conventions
- explicitly constrained by the constitution/spec

Examples:

- file naming
- test placement
- helper extraction
- schema validation library already used by the repo
- internal component decomposition

Agents MUST escalate decisions involving:

- destructive data migration
- deleting user data
- changing product scope
- adding meaningful recurring infrastructure cost
- choosing among materially different product behaviors
- external account authorization
- legal/privacy implications that require product-owner judgment

---

# 37. First Principle

Every agent should optimize for one outcome:

> Produce a reliable AI-native serialized-video production engine that can evolve from one reproducible episode to autonomous multi-series production without sacrificing continuity, traceability, human control, or architectural integrity.
