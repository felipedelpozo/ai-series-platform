# Tasks: Generation Jobs Worker

## Phase 1: Schema

- [x] T001 Add `jobs`, `job_attempts`, `job_events` tables and generate a migration

## Phase 2: Job service

- [x] T002 Add `packages/jobs` with enqueue (idempotent), claimNextJob (SKIP LOCKED), completeJob, failJob (bounded retry), cancelJob, recordEvent in `packages/jobs/src/`
- [x] T003 Add deterministic unit tests for retry limit and idempotency in `packages/jobs/src/jobs.test.ts`

## Phase 3: Worker

- [x] T004 Implement the worker loop in `apps/worker/src/worker.ts` that claims and processes generation jobs (image/video) with attempts and events

## Phase 4: Migrate generation + UI

- [x] T005 Migrate `POST /api/generations` to enqueue jobs and `GET /api/generations/[id]` to read job-driven status
- [x] T006 Extend the Generations UI with filters and attempts/events detail

## Phase 5: Validation

- [x] T007 Verify `typecheck`, `lint`, `test`, `build`
