# Tasks: BeUI Visual Refresh

## Phase 1: Setup

- [x] T001 Verify and record the four-commit stacked ancestry, capture the baseline shared-client gzip size, add `motion` to the root catalog and `packages/ui/package.json`, then update `bun.lock`
- [x] T002 Record the selected BeUI MIT source, pinned upstream commit and registry hash, shadcn Block references and stacked PR dependency in `specs/028-beui-visual-refresh/research.md`

## Phase 2: Foundational Design System

- [x] T003 Add render/source regression coverage for BeUI attribution, hover/focus versus permanent active-route semantics, reduced motion and near-stock tokens in `packages/ui/src/components/components.test.tsx` and `apps/web/lib/studio-ui.test.ts`
- [x] T004 Adapt BeUI `shared-layout-bg` and spring tokens into `packages/ui/src/components/shared-layout-background.tsx` and `packages/ui/src/lib/motion.ts`, retaining attribution and the complete MIT notice in `packages/ui/THIRD_PARTY_NOTICES.md`
- [x] T005 Export the adapted component from `packages/ui/src/index.ts` without adding a parallel component namespace
- [x] T006 Simplify shared Button, Card, Tabs, form and overlay visual contracts while preserving their props and Radix semantics in `packages/ui/src/components/`
- [x] T007 Remove unused/decorative Feature 027 styling while preserving stock semantic light/dark/state tokens and global accessibility rules in `packages/ui/styles/globals.css` and `apps/web/app/globals.css`
- [x] T008 Simplify repeated PageHeader, SectionPanel, EmptyState, LoadingSkeleton, InlineNotice and StatusBadge presentation in `apps/web/components/ui/`
- [x] T009 Run focused `packages/ui` and `apps/web` tests/typechecks for the foundational visual contract

## Phase 3: User Story 1 — Recognize a clear and coherent studio (P1)

**Story goal**: Apply one BeUI-inspired, low-chrome language across the real studio.

**Independent test**: Compare shell, headers, surfaces and controls across all primary routes and verify one coherent language with no unjustified Feature 027 ornament.

- [x] T010 [US1] Integrate the shared-layout navigation pill and simplify shell chrome without changing route, collapse, mobile Sheet or focus-return behavior in `apps/web/components/app-sidebar.tsx`, `apps/web/components/app-header.tsx`, `apps/web/components/studio-shell.tsx` and `apps/web/app/(studio)/layout.tsx`
- [x] T011 [P] [US1] Apply the shared hierarchy to Series and its Bible, Entities, Story State, Plans, Decisions, Loops and TikTok sections in `apps/web/app/(studio)/series/page.tsx` and `apps/web/components/series-*.tsx`
- [x] T012 [P] [US1] Apply the shared hierarchy to Assets in `apps/web/app/(studio)/assets/page.tsx`
- [x] T013 [P] [US1] Apply the shared hierarchy to Prompts and prompt forms/editor in `apps/web/app/(studio)/prompts/`, `apps/web/components/new-prompt-form.tsx` and `apps/web/components/prompt-editor.tsx`
- [x] T014 [P] [US1] Apply the shared hierarchy to Generations and Generation Lab in `apps/web/app/(studio)/generations/page.tsx` and `apps/web/components/generation-lab.tsx`
- [x] T015 [P] [US1] Apply the shared hierarchy to Operations in `apps/web/app/(studio)/ops/page.tsx`
- [x] T016 [P] [US1] Apply the shared hierarchy to Accounts, Settings and Diagnostics in `apps/web/app/(studio)/accounts/page.tsx`, `apps/web/app/(studio)/settings/page.tsx`, `apps/web/app/diagnostics/page.tsx` and `apps/web/components/placeholder-page.tsx`
- [x] T017 [P] [US1] Apply the shared hierarchy to Episode Studio and QA without changing production actions in `apps/web/app/(studio)/studio/[planId]/page.tsx` and `apps/web/components/plan-qa.tsx`

## Phase 4: User Story 2 — Keep production work intact (P1)

**Story goal**: Preserve every inherited route, role, input, request and safety guard.

**Independent test**: The executable inventory still contains exactly 46 compatible actions and representative E2E journeys retain payloads, pending locks, error recovery and destructive confirmations.

- [x] T018 [US2] Verify and, only where necessary, extend the 46-action compatibility tests and recovered prompt/input assertions in `apps/web/lib/studio-ui.test.ts` and `apps/web/e2e/studio-ui.spec.ts`
- [x] T019 [US2] Review the implementation diff against `apps/web/lib/studio-action-contracts.ts` and prove that handlers, methods, targets, payload fields, permission decisions and async guards are unchanged

## Phase 5: User Story 3 — Understand states and next steps (P2)

**Story goal**: Keep loading, empty, error, disabled, success and in-progress states explicit in the new language.

**Independent test**: Each screen family exposes the inherited state matrix with localized recovery and no color-only meaning.

- [x] T020 [US3] Validate the inherited state matrix and semantic variants across all protected sources in `apps/web/lib/studio-ui.test.ts`, `apps/web/e2e/studio-ui.spec.ts` and `specs/027-studio-ui-refresh/contracts/state-matrix.md`
- [x] T021 [US3] Capture one non-happy state per major screen family and verify structure, recovery, input retention and duplicate prevention in `apps/web/e2e/studio-ui.spec.ts`

## Phase 6: User Story 4 — Use every size and modality (P2)

**Story goal**: Preserve responsive, theme, keyboard and reduced-motion acceptance.

**Independent test**: All primary routes pass at 375, 768, 1024, 1280 and 1440 px; desktop and selected mobile/tablet screenshots show both themes and usable non-happy states.

- [x] T022 [US4] Extend browser assertions for the adapted BeUI motion, reduced motion, focus, touch targets, long content and no overflow in `apps/web/e2e/studio-ui.spec.ts`
- [x] T023 [US4] Run the complete route × five viewport × two theme Playwright matrix on the isolated port 3100 and inspect attached screenshots for every desktop route plus Series, Assets, Prompts and Episode Studio on mobile/tablet

## Phase 7: Polish, Convergence and Delivery

- [x] T024 Run `bun test`, `bun run typecheck`, `bun run lint`, `bun run build`, changed-file Prettier, `bun run format:check` and `git diff --check`; record the final shared-client gzip delta and reject values above 45 KiB
- [x] T025 Complete an independent read-only spec, accessibility, functional and visual review and classify every finding as BLOCKER, HIGH, MEDIUM or LOW
- [x] T026 Remediate every BLOCKER/HIGH independent-review finding in the affected Feature 028 files and rerun focused evidence
- [x] T027 Obtain independent re-review after remediation and require zero open BLOCKER/HIGH findings
- [x] T028 Run Spec Kit convergence and update `specs/028-beui-visual-refresh/completion-report.md` with source provenance, files, gates, browser evidence and stacked-base status
- [ ] T029 Commit and push `feature/028-beui-visual-refresh`, re-check upstream PR/ancestry, and open a PR against `codex/027-launcher-prompts-follow-up` or retarget to `develop` if the base has landed

## Dependencies

- Phase 1 precedes all source implementation.
- T003 precedes T004–T008 so the shared contract is regression-protected first.
- T004–T008 block every route batch.
- T010–T017 are parallel-safe only after the foundational contract is fixed; each task has exclusive files.
- T018–T021 follow route integration and guard functional/state preservation.
- T022–T023 follow all route work; final review and delivery follow all validation.

## Parallel Execution Examples

- After T009 passes, T010–T017 may run concurrently with the exact file ownership listed in each task.
- Source-contract review and browser fixture preparation may run in parallel after route integration, but final Playwright execution uses one isolated server and one owner.
- Independent review starts only after the candidate diff and browser evidence are complete.

## Implementation Strategy

1. Establish and test the selected BeUI adaptation inside the existing shadcn package.
2. Propagate the low-chrome contract through shared composites and shell.
3. Refine route presentation in exclusive batches while freezing all pre-render behavior.
4. Prove the 46-action/state contracts and full browser matrix.
5. Converge, independently review, remediate and deliver as a stacked PR without merge/deploy.
