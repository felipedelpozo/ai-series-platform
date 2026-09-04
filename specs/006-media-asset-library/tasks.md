# Tasks: Media Asset Library

## Phase 1: Schema

- [x] T001 Add `parent_id`, `name`, `duration_ms` to `assets` and generate a migration

## Phase 2: Domain

- [x] T002 Add `packages/media` with `listAssets`, `getAssetDetail`, `updateAssetStatus`, `deleteAsset` (safe) in `packages/media/src/`
- [x] T003 Add deterministic tests for status transitions and safe delete in `packages/media/src/assets.test.ts`

## Phase 3: API

- [x] T004 Extend `GET /api/assets` (filters), add `GET /api/assets/[id]`, `PATCH /api/assets/[id]`, `DELETE /api/assets/[id]`

## Phase 4: UI

- [x] T005 Implement the Asset Library page `apps/web/app/(studio)/assets/page.tsx` (list + filters + detail + status actions)

## Phase 5: Validation

- [x] T006 Verify `typecheck`, `lint`, `test`, `build`
