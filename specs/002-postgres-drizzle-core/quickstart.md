# Quickstart: PostgreSQL + Drizzle Core

## Prerequisites

- A reachable PostgreSQL instance with `DATABASE_URL` set (see `.env.example`).

## Generate migrations

```bash
bun run --cwd packages/db db:generate
```

## Apply migrations to an empty database

```bash
bun run --cwd packages/db db:migrate
```

Expected: `workspace` and `audit_log` tables are created and the `default` workspace is seeded.

## Run integration tests

```bash
bun run --cwd packages/db test
```

Expected: connection, migration and CRUD tests pass against `ai_series_test`.
