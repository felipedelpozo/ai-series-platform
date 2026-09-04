# Contract: Environment Configuration

## Entry point

`packages/config` exports `loadEnv(source?: Record<string, string | undefined>): AppEnvConfig`.

## Behavior

- Validates the supplied environment (defaults to `process.env`) against a Zod schema.
- Throws `EnvValidationError` with an actionable, human-readable message naming the invalid
  variable and its rule — never its value — when validation fails.
- Returns `AppEnvConfig` (see `data-model.md`) with `subsystems` derived from presence-only checks.

## Validated variables

| Variable | Rule | Default |
|----------|------|---------|
| `APP_ENV` | enum: development/test/production | development |
| `NODE_ENV` | enum: development/test/production | development |
| `WEB_PORT` | optional positive integer <= 65535 | unset |
| `WORKER_PORT` | positive integer <= 65535 | 8787 |
| `DATABASE_URL` | optional non-empty string (presence-only) | unset |
| `FAL_KEY` | optional non-empty string (presence-only) | unset |
