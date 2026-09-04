# Contract: packages/db

## Exports

- `getDb(): PostgresJsDatabase` — returns a cached client; throws `DatabaseConfigError` if
  `DATABASE_URL` is missing or malformed (message names the variable, never the credentials).
- `checkDb(): Promise<{ ok: boolean; error?: string }>` — runs `SELECT 1`; never throws.
- `ensureDefaultWorkspace(): Promise<void>` — idempotent seed of the `default` workspace.
- `workspace`, `auditLog` — Drizzle table definitions.

## Rules

- No secret values are returned or logged by any function.
- All functions are safe to call from both `apps/web` and `apps/worker`.
- Migrations are applied via `bun run db:migrate` (drizzle-kit CLI) or the drizzle programmatic
  `migrate` used by the integration tests.
