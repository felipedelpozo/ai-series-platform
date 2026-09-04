# Tasks: Real fal.ai Image Generation

## Phase 1: Adapter

- [ ] T001 Add `packages/fal` (`@fal-ai/client`) with Zod-validated submit/status/result + `FalError` in `packages/fal/src/`
- [ ] T002 Add unit tests for the adapter error/validation branches in `packages/fal/src/image.test.ts`

## Phase 2: Schema

- [ ] T003 Add `generations` and `assets` tables to `packages/db/src/schema.ts` and generate a migration

## Phase 3: Orchestration

- [ ] T004 Add `packages/generation` with `startImageGeneration` and `pollImageGeneration` (render via `@ai-series/prompts`, snapshot, submit, poll, ingest asset) in `packages/generation/src/`

## Phase 4: API + UI

- [ ] T005 Implement `apps/web/app/api/generations/route.ts` (POST start, GET list) and `apps/web/app/api/generations/[id]/route.ts` (GET poll)
- [ ] T006 Implement `apps/web/app/api/assets/[id]/content/route.ts` (serve ingested image)
- [ ] T007 Implement the Generation Lab page `apps/web/app/(studio)/generations/page.tsx` (template select, variables, submit, polling, image)

## Phase 5: Opt-in live smoke + validation

- [ ] T008 Add `test:live:fal` opt-in script in `packages/fal` (real generation) and document in `.env.example`/README
- [ ] T009 Verify `typecheck`, `lint`, `test`, `build`
