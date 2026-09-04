# Tasks: TikTok Integration

## Phase 1: Schema

- [x] T001 Add `tiktok_accounts`, `tiktok_videos` and `engagement_imports` tables and generate a
      migration

## Phase 2: Domain

- [x] T002 Add `packages/tiktok` with capability status, account/video/engagement primitives and
      retry/rate-limit utilities
- [x] T003 Add deterministic tests for capability gating and retry/backoff

## Phase 3: API + UI

- [x] T004 Implement TikTok API routes and a compact integration status view

## Phase 4: Validation

- [x] T005 Verify `typecheck`, `lint`, `test`, `build`
