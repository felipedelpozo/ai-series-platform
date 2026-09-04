# Tasks: Prompt Registry + Prompt Studio

## Phase 1: Schema

- [ ] T001 Add `prompt_templates`, `prompt_versions`, `prompt_snapshots` tables to `packages/db/src/schema.ts` and generate a migration

## Phase 2: Domain

- [ ] T002 Add `packages/prompts` (package.json, tsconfig) with `purposes.ts` (20 purposes) and `render.ts` (render + missing vars) in `packages/prompts/src/`
- [ ] T003 Implement registry functions in `packages/prompts/src/registry.ts` (create/edit/clone/activate/archive/list/detail/snapshot)
- [ ] T004 Implement idempotent seeds for `test.image` and `test.video` in `packages/prompts/src/seed.ts`

## Phase 3: API

- [ ] T005 Implement `apps/web/app/api/prompts/route.ts` (GET list, POST create, POST preview)
- [ ] T006 Implement detail/edit/clone/archive/activate routes under `apps/web/app/api/prompts/[id]/`

## Phase 4: Studio UI

- [ ] T007 Implement the Prompt Studio list page (`apps/web/app/(studio)/prompts/page.tsx`) with purpose filter
- [ ] T008 Implement the template editor page (`apps/web/app/(studio)/prompts/[id]/page.tsx`) with variables, preview and version history

## Phase 5: Tests + wiring

- [ ] T009 Add `render.test.ts` (render + missing variables) and `registry.integration.test.ts` (versioning/immutability) in `packages/prompts/src/`
- [ ] T010 Wire seed on web boot and verify `typecheck`, `lint`, `test`, `build`
