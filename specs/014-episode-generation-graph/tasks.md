# Tasks: Episode Generation Graph

## Phase 1: Schema

- [ ] T001 Add `generation_steps` table and generate a migration

## Phase 2: Domain

- [ ] T002 Add `packages/production` with `generateShotKeyframe`, `generateShotVideo`, `listShotSteps`, `getPlanProgress` (reuse + isolation) in `packages/production/src/`

## Phase 3: API + UI

- [ ] T003 Implement generation-graph API routes and a compact progress view

## Phase 4: Validation

- [ ] T004 Verify `typecheck`, `lint`, `test`, `build` and a real two-shot generation smoke
