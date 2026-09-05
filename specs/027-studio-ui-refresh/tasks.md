# Tasks: Studio UI Refresh

## Phase 1: Setup

- [x] T001 Add Playwright artifact ignores to `.gitignore` and verify existing Bun/ESLint/Prettier
      ignore coverage
- [x] T002 Add only the Radix interaction dependencies required by shadcn Select, Sheet, Tabs and
      AlertDialog plus Playwright test support to `package.json`, `apps/web/package.json`,
      `packages/ui/package.json` and `bun.lock`

## Phase 2: Foundational Design System

- [x] T003 [P] Add deterministic render tests for shared primitives in
      `packages/ui/src/components/components.test.tsx`
- [x] T004 [P] Add executable UI action/route compatibility inventory tests in
      `apps/web/lib/studio-ui.test.ts` and browser fixtures in `apps/web/e2e/studio-ui.spec.ts`
- [x] T005 Implement semantic color, typography, radius, sidebar and motion tokens in
      `packages/ui/styles/globals.css` and `apps/web/app/globals.css`
- [x] T006 Implement shadcn-compatible Badge, Card, Input, Label, Textarea, Skeleton, Alert and Table
      primitives in `packages/ui/src/components/`
- [x] T007 Implement Radix-backed shadcn Select, Sheet, Tabs and AlertDialog primitives in
      `packages/ui/src/components/`
- [x] T008 Export the complete shared primitive surface from `packages/ui/src/index.ts` and align
      Button variants/states in `packages/ui/src/components/button.tsx`
- [x] T009 Implement repeated product composites PageHeader, EmptyState, InlineNotice, StatusBadge,
      SectionPanel and LoadingSkeleton in `apps/web/components/ui/`
- [x] T010 Run focused UI/web tests and typechecks for the foundational batch

## Phase 3: User Story 1 — Orientarse y actuar en el estudio (P1)

**Story goal**: Provide an unmistakable, responsive studio location and next-action hierarchy.

**Independent test**: Navigate all routes at desktop and mobile widths by pointer and keyboard;
active location, route purpose, theme control and every destination remain available without page
overflow.

- [x] T011 [US1] Add interface fonts and application metadata in
      `apps/web/app/layout.tsx`
- [x] T012 [US1] Adapt the official shadcn inset/collapsible Sidebar Block into a responsive studio
      shell in `apps/web/components/studio-shell.tsx`, `apps/web/components/app-sidebar.tsx` and
      `apps/web/components/app-header.tsx`
- [x] T013 [US1] Integrate the shell, skip link and bounded responsive content in
      `apps/web/app/(studio)/layout.tsx`
- [x] T014 [US1] Replace the settings placeholder with an honest, purposeful empty state in
      `apps/web/app/(studio)/settings/page.tsx` and `apps/web/components/placeholder-page.tsx`
- [x] T015 [US1] Verify the shell at 375 and 1440 px: navigation, focus return, active route, theme
      and route metadata in `apps/web/e2e/studio-ui.spec.ts`

## Phase 4: User Story 2 — Comprender y controlar producción (P2)

**Story goal**: Make real content, status, next action and recovery states clear without changing
business behavior.

**Independent test**: Exercise every existing control on populated, empty, loading and error states;
the same endpoint/method/payload is used and the screen explains the current state.

- [x] T016 [P] [US2] Refactor Series list/detail hierarchy, progressive production sections and
      local request states in `apps/web/app/(studio)/series/page.tsx`
- [x] T017 [P] [US2] Refactor Assets filters, gallery/detail, media fallback, status actions and
      guarded delete in `apps/web/app/(studio)/assets/page.tsx`
- [x] T018 [P] [US2] Refactor Generations filters/list/detail and state presentation in
      `apps/web/app/(studio)/generations/page.tsx`
- [x] T019 [P] [US2] Refactor Prompt library/create/editor hierarchy, controls and guarded archive in
      `apps/web/app/(studio)/prompts/page.tsx`, `apps/web/app/(studio)/prompts/[id]/page.tsx`,
      `apps/web/components/new-prompt-form.tsx` and `apps/web/components/prompt-editor.tsx`
- [x] T020 [P] [US2] Refactor Operations health, budget, cost, guarded cleanup and actionable failure hierarchy in
      `apps/web/app/(studio)/ops/page.tsx`
- [x] T021 [P] [US2] Refactor Accounts authentication/workspaces hierarchy, labels and feedback in
      `apps/web/app/(studio)/accounts/page.tsx`
- [x] T022 [US2] Refactor the existing Series subcomponents into a coherent continuity sequence in
      `apps/web/components/series-entities.tsx`, `apps/web/components/series-story-state.tsx`,
      `apps/web/components/series-plans.tsx`, `apps/web/components/series-decisions.tsx`,
      `apps/web/components/series-loops.tsx` and `apps/web/components/series-tiktok.tsx`
- [x] T023 [US2] Refactor Generation Lab and Plan QA presentation without changing generation or
      resolution requests in `apps/web/components/generation-lab.tsx` and
      `apps/web/components/plan-qa.tsx`
- [x] T024 [US2] Run focused compatibility tests and app/UI typechecks for all core screens

## Phase 5: User Story 3 — Trabajar con precisión en cualquier tamaño (P3)

**Story goal**: Make dense production work usable across the five required viewport widths.

**Independent test**: Operate Series, Assets and Episode Studio at 375, 768, 1024, 1280 and 1440
px with no page overflow, clipped menus or unreachable actions.

- [x] T025 [US3] Refactor Episode Studio into responsive scene rail, preview surface and contextual
      inspector while preserving every action in `apps/web/app/(studio)/studio/[planId]/page.tsx`
- [x] T026 [US3] Add accessible loading/error boundaries and layout-stable skeletons for studio
      routes in `apps/web/app/(studio)/loading.tsx`, `apps/web/app/(studio)/error.tsx` and
      `apps/web/app/(studio)/studio/[planId]/loading.tsx`
- [x] T027 [US3] Verify touch targets, long-content containment, focus visibility, reduced motion and
      light/dark contrast across `apps/web/` and `packages/ui/`
- [x] T028 [US3] Execute overflow, keyboard, accessible-name, touch-target, light/dark contrast,
      action compatibility and state matrices for every served route at 375, 768, 1024, 1280 and
      1440 px; capture deeper Series, Assets and Episode Studio evidence per
      `specs/027-studio-ui-refresh/quickstart.md`

## Phase 6: Polish & Cross-Cutting Validation

- [x] T029 Complete independent accessibility, security and spec-conformance review of the final
      diff and browser evidence, recording findings in the feature completion report
- [x] T030 Remediate all actionable BLOCKER/HIGH review findings and rerun their focused checks in
      the affected `apps/web/`, `packages/ui/` and `specs/027-studio-ui-refresh/` paths
- [x] T031 Run `bun test`, `bun run typecheck`, `bun run lint`, `bun run build`,
      `bun run format:check`, the full browser matrix and `git diff --check`, then run convergence

## Phase 7: Launcher correction and recovered generation context

- [x] T032 Restore the recent Bible, Entity and Episode Plan `details` inputs, API/domain prompt
      composition, immutable prompt snapshots and full revision detail views without losing the
      Feature 027 async guards or visual structure
- [x] T033 Replace the rejected warm editorial layer with neutral shadcn light/dark tokens, Geist
      typography and native component proportions without adding beUI or Motion
- [x] T034 Recompose `/series` as a bounded responsive grid plus full-width selected workspace and
      add a factual canonical setup rail with refresh after entity/plan creation
- [x] T035 Add synchronous duplicate guards for Entity and Episode Plan AI details generation and
      browser coverage for exact payload, pending state and input retention after failure
- [ ] T036 Capture fresh launcher evidence at 375, 768 and 1440 px in light/dark, run focused and
      full validation, remediate independent review and update the completion report

## Dependencies

- Phase 1 precedes all implementation.
- Phase 2 blocks every user-story phase because screens depend on shared tokens/primitives.
- US1 blocks final responsive verification because it owns the application shell.
- T016–T021 are parallel-safe after Phase 2 because they own separate route files.
- T022 follows T016 because Series defines the container/section contract.
- T023 follows the shared primitives and may run alongside T022 when file ownership is exclusive.
- US3 follows US1 and the relevant US2 screen; final validation follows all stories.

## Parallel Execution Examples

- After T005/T008/T009 define interfaces, T016, T017, T018, T019, T020 and T021 can run in parallel
  with exclusive route ownership.
- T003 and T004 can run in parallel because they cover separate packages.
- Browser evidence and independent source review can run in parallel only after implementation and
  focused typechecks are green. Review precedes remediation and the final full gate.

## Implementation Strategy

1. Deliver the shared token/primitives and responsive shell first as the independently testable P1
   slice.
2. Refactor high-value production screens without moving their behavior.
3. Finish the dense Episode Studio and cross-route responsive/accessibility pass.
4. Run the full gate, convergence and independent review before commit/PR.
