# Quickstart: Foundation Bun Monorepo

Runnable validation scenarios proving the feature works end to end.

## Prerequisites

- Bun >= 1.3 (verified with 1.3.14).
- A clean clone of the repository on the `001-foundation-bun-monorepo` branch.

## Install

```bash
bun install
```

Expected: a single `bun.lock` is produced and shared dependencies resolve without duplication.

## Run web + worker (dev)

```bash
bun run dev
```

Expected: web app starts and serves the studio shell; worker starts and serves `GET /health`.

## Worker health (isolated)

```bash
bun run dev:worker
curl -s http://localhost:8787/health
```

Expected: JSON with `"status": "ok"` and a `subsystems` array without secret values.

## Quality gates

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

Expected: all four complete successfully on a clean checkout.

## Environment validation

```bash
APP_ENV=invalid bun run dev:worker
```

Expected: the worker exits with an actionable `EnvValidationError` naming `APP_ENV` without
printing its value.

## Diagnostics (dev only)

Open the diagnostics route in development and confirm the subsystem table shows `web` and
`worker` configured with no secret values. In a production build the route returns not-found.
