# Implementation Plan: PostgreSQL + Drizzle Core

**Branch**: `002-postgres-drizzle-core` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

## Summary

Add the shared persistence layer (`packages/db`) on top of PostgreSQL with Drizzle ORM: versioned
migrations, a default internal `workspace`, a minimal `audit_log`, a database health check, and
real integration tests. Web and worker consume this single layer; the data model stays independent
of UI internals.

## Technical Context

**Language/Version**: TypeScript (strict), Bun.
**Primary Dependencies**: `drizzle-orm` 0.45.2, `drizzle-kit` 0.31.10, `postgres` 3.4.9.
**Storage**: PostgreSQL (source of truth). Local `ai_series` DB; tests use `ai_series_test`.
**Testing**: `bun test` (unit) + integration tests against real PostgreSQL.
**Target Platform**: Developer workstation / server; macOS/Linux.
**Project Type**: Monorepo shared package.
**Constraints**: Migrations versioned (no destructive push); secrets never logged.
**Scale/Scope**: 1 package, 2 tables, 1 seed, 1 health check.

## Constitution Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| X. Persistencia y Migraciones | PASS | PostgreSQL + Drizzle, versioned migrations, no destructive push |
| XII. Seguridad | PASS | Secrets server-side; no secrets in logs/UI |
| XIII. Testing | PASS | Integration tests against real PostgreSQL |
| XIV. Simplicidad | PASS | Minimal: workspace + audit_log only |

## Project Structure

```text
packages/db/
├── drizzle.config.ts        # drizzle-kit config (schema + url)
├── migrations/              # generated SQL migrations
├── src/
│   ├── schema.ts            # workspace, auditLog tables
│   ├── client.ts            # getDb(), checkDb(), ensureDefaultWorkspace()
│   ├── migrate.ts           # programmatic migrate()
│   ├── index.ts             # barrel
│   └── db.integration.test.ts
├── tsconfig.json
└── package.json
```

## Complexity Tracking

> No constitution violations.
