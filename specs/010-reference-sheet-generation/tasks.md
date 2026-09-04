# Tasks: Reference Sheet Generation

## Phase 1: Schema + prompt

- [ ] T001 Add `reference_sheets` table and generate a migration; seed the `reference.sheet` prompt

## Phase 2: Domain

- [ ] T002 Add `generateReferenceSheet`, `listReferenceSheets`, `updateReferenceSheetStatus`, `promoteReferenceSheet` in `packages/entities/src/references.ts`

## Phase 3: API + UI

- [ ] T003 Implement reference-sheet API routes and the UI (generate/approve/reject/promote) within the entity detail

## Phase 4: Validation

- [ ] T004 Verify `typecheck`, `lint`, `test`, `build` and a real reference-sheet generation smoke
