# Tasks: Audience Decision Engine

## Phase 1: Schema

- [x] T001 Add `audience_decisions` and `decision_candidates` tables and generate a migration

## Phase 2: Domain

- [x] T002 Add `packages/decision` with the deterministic decision pipeline
      (moderate → intent → cluster → candidates → score → winner/alternatives/confidence)
- [x] T003 Add deterministic tests for scoring, spam-resistance and approval state

## Phase 3: Prompts + API + UI

- [x] T004 Seed `audience.classify` and `audience.decide` prompts with deterministic fallback
- [x] T005 Implement decision API routes and a compact decision view

## Phase 4: Validation

- [x] T006 Verify `typecheck`, `lint`, `test`, `build`
