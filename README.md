# AI Series Platform

Creator studio for AI-native interactive serialized video. This repository is a Bun
monorepo that hosts the web studio (`apps/web`), a background worker (`apps/worker`), and
shared packages for the design system (`packages/ui`) and validated environment
configuration (`packages/config`).

## Prerequisites

- Bun >= 1.3 (verified with 1.3.14).

## Install

```bash
bun install
```

A single `bun.lock` is produced; shared dependency versions are centralized in the root
`catalog`.

## Run

Start web and worker together:

```bash
bun run dev
```

Or independently:

```bash
bun run dev:web      # http://localhost:3000
bun run dev:worker   # http://localhost:8787
```

The worker exposes its health at `GET /health`.

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Run web + worker in development |
| `bun run build` | Build the web app and the worker |
| `bun run typecheck` | Typecheck every workspace (strict) |
| `bun run lint` | Lint the monorepo with ESLint |
| `bun run test` | Run deterministic tests with `bun test` |

## Environment

Configuration is validated at boot by `packages/config` (Zod). Invalid or missing
configuration fails fast with an actionable error that names the variable, without
printing secret values.

| Variable | Rule | Default |
|----------|------|---------|
| `APP_ENV` | `development` / `test` / `production` | `development` |
| `NODE_ENV` | `development` / `test` / `production` | `development` |
| `WEB_PORT` | optional integer 1-65535 | unset |
| `WORKER_PORT` | integer 1-65535 | `8787` |
| `DATABASE_URL` | optional non-empty string (presence-only) | unset |
| `FAL_KEY` | optional non-empty string (presence-only) | unset |

See `.env.example` for a template. Secrets are server-side only.

## Diagnostics

In development, `/diagnostics` shows which subsystems are configured without revealing
secret values. In production the route is not available.

## Layout

```text
apps/
  web/      Next.js App Router studio
  worker/   Bun-native worker with a health endpoint
packages/
  ui/       shadcn/ui + Radix components, design tokens, theme provider
  config/   Zod-validated environment configuration
```
