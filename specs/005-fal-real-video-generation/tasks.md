# Tasks: Real fal.ai Video Generation

## Phase 1: Adapter

- [ ] T001 Extend `packages/fal` with `submitVideo`/`videoStatus`/`videoResult` (H3 Max) and `uploadImage` (fal storage) in `packages/fal/src/`
- [ ] T002 Add adapter unit tests for video result validation in `packages/fal/src/video.test.ts`

## Phase 2: Schema

- [ ] T003 Add `kind` column to `generations` and generate a migration

## Phase 3: Orchestration

- [ ] T004 Add `startVideoGeneration`/`pollVideoGeneration` (text-to-video and image-to-video) in `packages/generation/src/video.ts`

## Phase 4: API + UI

- [ ] T005 Extend `/api/generations` to accept video generation and serve video assets
- [ ] T006 Extend the Generation Lab with a video tab (text-to-video + image-to-video source asset)

## Phase 5: Live smoke + validation

- [ ] T007 Add opt-in `test:live:fal:video` smoke in `packages/fal` and verify `typecheck`/`lint`/`test`/`build`
