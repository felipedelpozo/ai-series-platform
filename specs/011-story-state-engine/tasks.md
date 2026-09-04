# Tasks: Story State Engine

## Phase 1: Schema

- [x] T001 Add `story_states` table and generate a migration

## Phase 2: Domain

- [x] T002 Add `packages/story` with the StoryState Zod schema, `recordStoryState`, `getCurrentStoryState`, `getStoryStateHistory`, `diffStoryStates`, `checkCanonCompatibility` in `packages/story/src/`
- [x] T003 Add deterministic tests for versioning, diff and canon contradiction

## Phase 3: API + UI

- [x] T004 Implement story-state API routes and a compact story-state view in the series detail

## Phase 4: Validation

- [x] T005 Verify `typecheck`, `lint`, `test`, `build`
