# Tasks: Foundation Bun Monorepo

**Input**: Design documents from `/specs/001-foundation-bun-monorepo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included - constitution XIII and the spec success criteria require deterministic coverage for env validation and worker health.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1..US5)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Root workspace, catalogs, shared TypeScript config, lint/format.

- [x] T001 Create root `package.json` with `workspaces: ["apps/*", "packages/*"]`, `catalog`/`catalogs` for shared deps, and root scripts (`dev`, `dev:web`, `dev:worker`, `build`, `typecheck`, `lint`, `test`) in `package.json`
- [x] T002 [P] Create shared strict TypeScript config in `tsconfig.base.json`
- [x] T003 [P] Add ESLint flat config in `eslint.config.mjs` and Prettier config in `.prettierrc.json`
- [x] T004 [P] Verify `.gitignore` ignores `node_modules/`, `dist/`, `.next/`, `coverage/`, `.env*` but keeps `bun.lock` tracked

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Environment configuration package - required by worker health, web boot and diagnostics.

- [x] T005 Implement `packages/config` Zod env schema, `loadEnv()`, `EnvValidationError`, and subsystem status derivation in `packages/config/src/env.ts` and `packages/config/src/index.ts` (plus `packages/config/package.json`, `packages/config/tsconfig.json`)
- [x] T006 Add unit tests for env validation (valid/invalid/missing, no-secret-in-error) in `packages/config/src/env.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

## Phase 3: User Story 1 - Base ejecutable del monorepo (Priority: P1) 🎯 MVP

**Goal**: A clone → `bun install` → `bun run dev` boots web and worker; strict TS; shared deps resolved without duplication.

**Independent Test**: Clean checkout, single install, start web and worker, run typecheck.

- [x] T007 [US1] Scaffold `apps/web` (Next.js App Router) with `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/postcss.config.mjs`, `apps/web/tsconfig.json`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/app/globals.css`
- [x] T008 [US1] Scaffold `apps/worker` with `apps/worker/package.json`, `apps/worker/tsconfig.json`, `apps/worker/src/index.ts` (Bun.serve process that boots)
- [x] T009 [US1] Wire root `dev` script to run web and worker concurrently (via `scripts/dev.sh`) and verify both boot on a clean `bun install`
- [x] T010 [US1] Resolve shared dependencies through catalogs and confirm `bun.lock` has no duplicated versions across workspaces

**Checkpoint**: US1 works - web and worker boot from a single install.

## Phase 4: User Story 2 - Shell de producto profesional (Priority: P1)

**Goal**: Studio shell with sidebar, header, main area, 5 placeholder pages, dark/light theme, accessible.

**Independent Test**: Open the app, navigate the 5 pages, toggle theme, verify keyboard focus.

- [x] T011 [US2] Create `packages/ui` with `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/styles/globals.css` (Tailwind v4 `@theme` + shadcn tokens), and `packages/ui/src/index.ts` barrel
- [x] T012 [US2] Add shadcn primitives (Button, Separator, Tooltip) in `packages/ui/src/components/` using Radix, exported from the barrel
- [x] T013 [US2] Implement studio shell `apps/web/app/(studio)/layout.tsx` (sidebar + header + main) and placeholder pages `series/page.tsx`, `assets/page.tsx`, `prompts/page.tsx`, `generations/page.tsx`, `settings/page.tsx`
- [x] T014 [US2] Implement `ThemeProvider` in `packages/ui/src/theme-provider.tsx` (system default + manual override persisted in localStorage) and wire the theme toggle in the header
- [x] T015 [US2] Ensure accessibility: visible focus, aria labels on nav/toggle, loading/empty states on placeholder pages

**Checkpoint**: US2 works - full shell with navigation and theme.

## Phase 5: User Story 3 - Worker con estado de salud (Priority: P2)

**Goal**: Worker exposes `GET /health` per the contract.

**Independent Test**: Start worker alone, `curl /health`, assert JSON contract with no secrets.

- [x] T016 [US3] Implement `GET /health` in `apps/worker/src/index.ts` returning the `worker-health.md` contract JSON (status, service, subsystems, timestamp)
- [x] T017 [US3] Add a worker health smoke test in `apps/worker/src/index.test.ts` that boots the worker and asserts the `/health` contract contains no secret values

**Checkpoint**: US3 works - worker health is queryable.

## Phase 6: User Story 4 - Configuración de entorno validada al arranque (Priority: P2)

**Goal**: Web and worker validate env at boot and fail fast with an actionable, secret-free error.

**Independent Test**: Boot with invalid `APP_ENV`; confirm fast failure naming the variable.

- [x] T018 [US4] Wire `loadEnv()` into `apps/web` startup via `apps/web/instrumentation.ts` `register()` plus a server config accessor in `apps/web/lib/config.ts` so invalid env fails boot
- [x] T019 [US4] Confirm `apps/worker/src/index.ts` calls `loadEnv()` before serving and exits with `EnvValidationError` on invalid config; add an assertion in `apps/worker/src/index.test.ts`

**Checkpoint**: US4 works - invalid config fails fast without leaking secrets.

## Phase 7: User Story 5 - Página de diagnóstico solo en desarrollo (Priority: P3)

**Goal**: Dev-only diagnostics page showing subsystem status without secrets.

**Independent Test**: In dev, open diagnostics and see subsystem table; in production, route returns not-found.

- [x] T020 [US5] Implement `apps/web/app/diagnostics/page.tsx` that renders the subsystem table from `packages/config` and returns not-found when not in development
- [x] T021 [US5] Add a test asserting the diagnostics view derives presence-only booleans and never renders secret values

**Checkpoint**: US5 works - diagnostics gated to dev.

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, env example, final gates.

- [x] T022 [P] Write `README.md` with install/dev/build/typecheck/lint/test instructions and documented env vars
- [x] T023 [P] Add `.env.example` documenting env vars (no real secrets)
- [x] T024 Run `quickstart.md` validation end to end and confirm `typecheck`, `lint`, `test`, `build` all pass

## Dependencies & Execution Order

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup; blocks US3/US4/US5 (all read `packages/config`).
- **US1 (Phase 3)**: depends on Setup. US2 (Phase 4) depends on US1 web scaffold + `packages/ui`.
- **US3 (Phase 5)** and **US4 (Phase 6)** depend on Foundational.
- **US5 (Phase 7)** depends on Foundational.
- **Polish (Phase 8)**: depends on all stories.

### Parallel Opportunities

- Setup T002/T003/T004 can run in parallel.
- `packages/ui` (T011/T012) and the worker (T008) touch different files and can progress in parallel.
- US2 shell (T013/T014/T015) is sequential within itself (shell → theme → a11y).

### MVP Scope

US1 + US2 (P1) form the MVP; US3-US5 are additive increments on the same foundation.
