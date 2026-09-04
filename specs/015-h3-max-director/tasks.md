# Tasks: H3 Max Director

## Phase 1: Schema

- [ ] T001 Add `director_sessions` table and generate a migration

## Phase 2: Domain + adapter

- [ ] T002 Add `packages/director` with session management (start/update/stop/list, prompt versioning) and an isolated realtime adapter in `packages/director/src/`
- [ ] T003 Add deterministic session-state and prompt-version tests

## Phase 3: API + UI

- [ ] T004 Implement director API routes and a compact session view

## Phase 4: Validation

- [ ] T005 Verify `typecheck`, `lint`, `test`, `build`; realtime live connection UNAVAILABLE (documented)
