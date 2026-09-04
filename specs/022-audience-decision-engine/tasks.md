# Tasks: Audience Decision Engine

## Phase 1: Schema

- [ ] T001 Add `audience_decisions` and `decision_candidates` tables and generate a migration

## Phase 2: Domain

- [ ] T002 Add `packages/decision` with the deterministic decision pipeline
      (moderate → intent → cluster → candidates → score → winner/alternatives/confidence)
- [ ] T003 Add deterministic tests for scoring, spam-resistance and approval state

## Phase 3: Prompts + API + UI

- [ ] T004 Seed `audience.classify` and `audience.decide` prompts with deterministic fallback
- [ ] T005 Implement decision API routes and a compact decision view

## Phase 4: Validation

- [ ] T006 Verify `typecheck`, `lint`, `test`, `build`
