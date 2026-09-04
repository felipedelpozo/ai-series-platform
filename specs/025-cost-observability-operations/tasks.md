# Tasks: Cost Observability & Operations

## Phase 1: Schema

- [ ] T001 Add `cost_records` table and generate a migration

## Phase 2: Domain

- [ ] T002 Add `packages/ops` with cost recording, aggregation, job health, failed-job trace,
      orphan detection and safe reprocess/cleanup
- [ ] T003 Add deterministic tests for estimation, budget alert and retry/health classification

## Phase 3: Worker + API + UI

- [ ] T004 Record cost estimate/actual in the worker loop
- [ ] T005 Implement operations API routes and a compact operations view

## Phase 4: Validation

- [ ] T006 Verify `typecheck`, `lint`, `test`, `build`
