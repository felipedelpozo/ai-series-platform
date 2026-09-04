# Tasks: Series + Series Bible

## Phase 1: Schema

- [ ] T001 Add `series` and `series_bibles` tables and generate a migration

## Phase 2: AI + Domain

- [ ] T002 Add `packages/ai` (AI SDK + OpenAI structured generation with Zod) in `packages/ai/src/`
- [ ] T003 Add `packages/series` domain (series CRUD + bible revisions + AI proposal) in `packages/series/src/`
- [ ] T004 Seed the `series.bible` prompt and add deterministic domain tests

## Phase 3: API + UI

- [ ] T005 Implement series/bible API routes and the Series UI (`/series` list + detail + bible editor + generate)

## Phase 4: Validation

- [ ] T006 Verify `typecheck`, `lint`, `test`, `build` and a real AI bible proposal smoke
