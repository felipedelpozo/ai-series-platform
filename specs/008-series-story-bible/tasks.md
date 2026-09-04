# Tasks: Series + Series Bible

## Phase 1: Schema

- [x] T001 Add `series` and `series_bibles` tables and generate a migration

## Phase 2: AI + Domain

- [x] T002 Add `packages/ai` (AI SDK + OpenAI structured generation with Zod) in `packages/ai/src/`
- [x] T003 Add `packages/series` domain (series CRUD + bible revisions + AI proposal) in `packages/series/src/`
- [x] T004 Seed the `series.bible` prompt and add deterministic domain tests

## Phase 3: API + UI

- [x] T005 Implement series/bible API routes and the Series UI (`/series` list + detail + bible editor + generate)

## Phase 4: Validation

- [x] T006 Verify `typecheck`, `lint`, `test`, `build` and a real AI bible proposal smoke
