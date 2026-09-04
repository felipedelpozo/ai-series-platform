# Tasks: Branching Next Episode Loop

## Phase 1: Schema

- [ ] T001 Add `branches` and `episode_loops` tables and generate a migration

## Phase 2: Domain

- [ ] T002 Add `packages/loop` with deterministic StoryState transition, draft plan, branch and
      decision timeline
- [ ] T003 Add deterministic tests for transition, rejection and branch isolation

## Phase 3: Pipeline + API + UI

- [ ] T004 Wire plan/scenes/generation-graph stages into the loop
- [ ] T005 Implement loop API routes and a compact loop view

## Phase 4: Validation

- [ ] T006 Verify `typecheck`, `lint`, `test`, `build`
