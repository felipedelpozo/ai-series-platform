# Tasks: PostgreSQL + Drizzle Core

**Input**: Design documents from `/specs/002-postgres-drizzle-core/`

## Phase 1: Setup

- [x] T001 Add `drizzle-orm`, `drizzle-kit` and `postgres` to the root `catalog` and add `packages/db` workspace metadata in `packages/db/package.json` and `packages/db/tsconfig.json`
- [x] T002 Add `DATABASE_URL` postgres-URL format validation to `packages/config/src/env.ts` (presence-only stays, malformed fails)

## Phase 2: Foundational (Schema + Migrations)

- [x] T003 Define `workspace` and `auditLog` tables in `packages/db/src/schema.ts`
- [x] T004 Add `packages/db/drizzle.config.ts` and generate the initial migration into `packages/db/migrations/`

## Phase 3: User Story 1 - Migraciones reproducibles

- [x] T005 Add `db:generate` and `db:migrate` (drizzle-kit) scripts in `packages/db/package.json` and generate the initial migration into `packages/db/migrations/`
- [x] T006 Verify migrations apply cleanly against an empty `ai_series_test` database

## Phase 4: User Story 2 - Capa de datos común

- [x] T007 Implement `getDb()` and `checkDb()` in `packages/db/src/client.ts` with a cached client and `DatabaseConfigError`
- [x] T008 Export the public API from `packages/db/src/index.ts`

## Phase 5: User Story 3 - Workspace por defecto

- [x] T009 Implement `ensureDefaultWorkspace()` (idempotent `default` seed) in `packages/db/src/client.ts`

## Phase 6: User Story 4 - Auditoría mínima

- [x] T010 Add an `insertAuditLog` helper over the `auditLog` table in `packages/db/src/audit.ts`

## Phase 7: User Story 5 - Configuración inválida

- [x] T011 Wire `checkDb()` into `apps/worker/src/index.ts` `/health` (database up/down) and into `apps/web/app/diagnostics/page.tsx`

## Phase 8: Integration tests + Polish

- [x] T012 Add integration tests in `packages/db/src/db.integration.test.ts` (migrate empty DB, workspace seed, audit insert, health check, invalid URL error)
- [x] T013 Update `.env.example` and `README.md` with the database setup and commands
- [x] T014 Run `typecheck`, `lint`, `test`, `build` end to end

## Dependencies

- Setup → Foundational → US1 (migrations) → US2 (data layer) → US3/US4 (workspace/audit) → US5 (health) → tests.
