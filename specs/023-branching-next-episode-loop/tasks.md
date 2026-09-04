# Tasks: Branching Next Episode Loop

## Phase 1: Schema

- [x] T001 Add `branches` and `episode_loops` tables and generate a migration

## Phase 2: Domain

- [x] T002 Add `packages/loop` with deterministic StoryState transition, draft plan, branch and
      decision timeline
- [x] T003 Add deterministic tests for transition, rejection and branch isolation

## Phase 3: Pipeline + API + UI

- [x] T004 Wire plan/scenes/generation-graph stages into the loop
- [x] T005 Implement loop API routes and a compact loop view

## Phase 4: Validation

- [x] T006 Verify `typecheck`, `lint`, `test`, `build`
