# Tasks: Audience Signal Ingestion

## Phase 1: Schema

- [ ] T001 Add `audience_signals` and `interaction_windows` tables and generate a migration

## Phase 2: Domain

- [ ] T002 Add `packages/audience` with signal import (normalize/dedupe/spam) and window management in `packages/audience/src/`
- [ ] T003 Add deterministic dedupe/spam tests

## Phase 3: API + UI

- [ ] T004 Implement audience API routes and a compact signals view

## Phase 4: Validation

- [ ] T005 Verify `typecheck`, `lint`, `test`, `build`
