# Tasks: Characters, Locations & Props

## Phase 1: Schema

- [x] T001 Add `entities`, `entity_versions`, `reference_assets` tables and generate a migration

## Phase 2: Domain

- [x] T002 Add `packages/entities` with typed Zod schemas, entity CRUD (versioned), AI proposals and asset references in `packages/entities/src/`
- [x] T003 Seed the `character.reference`/`location.reference`/`prop.reference` prompts and add domain tests

## Phase 3: API + UI

- [x] T004 Implement entities API routes and the Characters/Locations/Props UI within the series detail

## Phase 4: Validation

- [x] T005 Verify `typecheck`, `lint`, `test`, `build` and a real AI entity proposal smoke
