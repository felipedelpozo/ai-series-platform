# Implementation Plan: Foundation Bun Monorepo

**Branch**: `001-foundation-bun-monorepo` | **Date**: 2026-09-04 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-foundation-bun-monorepo/spec.md`

## Summary

Bootstrapping the executable base of the platform as a greenfield Bun monorepo: a Next.js App
Router web application with a professional creator-studio shell (sidebar, header, main area and
placeholder pages for Series, Assets, Prompts, Generations and Settings), a separate Bun-native
worker process exposing an HTTP health endpoint, Zod-validated environment configuration at boot,
coherent root commands for dev/build/typecheck/lint/test, and a dev-only diagnostic page. Dark and
light themes are provided through a shared UI package. The layout stays decoupled so future
domain/persistence/generation packages can be added without coupling to the web app.

## Technical Context

**Language/Version**: TypeScript (strict) over Bun 1.3.x; ESM everywhere.

**Primary Dependencies**: Next.js 16 (App Router, React 19), Tailwind CSS v4, shadcn/ui + Radix
primitives, Zod 4.

**Storage**: None in this feature (no database, no persistence). All state is in-memory and
derived from the validated environment.

**Testing**: `bun test` for deterministic logic (env validation, health response); a startup smoke
test for the worker. Browser E2E is deferred to a later feature.

**Target Platform**: Developer workstation / creator studio (macOS and Linux). Desktop-first UI,
responsive at smaller widths.

**Project Type**: Monorepo (web application + background worker + shared packages).

**Performance Goals**: Fast dev startup and instant dev-only diagnostic page; no throughput
targets apply to the foundation.

**Constraints**: TypeScript strict across the monorepo; secrets must never reach the client
bundle or logs; the diagnostic page must not exist in production; no extra services or
infrastructure beyond what this vertical slice needs.

**Scale/Scope**: 1 web app, 1 worker, 2 shared packages, 5 placeholder pages, 1 diagnostic page.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| II. Monorepo Bun-First | PASS | Bun workspaces + catalogs; no Turborepo/pnpm/npm/yarn |
| III. Stack Moderno y Actualizable | PASS | Next 16, Tailwind v4, shadcn/ui, Radix, Zod 4; latest stable resolved at install |
| IV. shadcn/Radix y Calidad de Interfaz | PASS | shadcn/ui + Radix; app shell/theme via shadcn primitives |
| XII. Seguridad | PASS | Secrets server-side; env validation; diagnostic gated to dev |
| XIII. Testing con Pirámide Práctica | PASS | `bun test` for config/health logic |
| XIV. Simplicidad y Vertical Slices | PASS | Minimal loop: web + worker + ui + config only |
| XV. Definition of Done | PASS | typecheck/lint/test/build validated |
| V, VI, VII, VIII, IX, X, XI | NOT APPLICABLE | Providers, prompts, persistence, jobs, observability belong to later features |

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation-bun-monorepo/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/
├── web/                     # Next.js App Router
│   ├── app/
│   │   ├── layout.tsx       # Root layout + theme + shell
│   │   ├── page.tsx         # Redirect/landing
│   │   ├── globals.css      # Tailwind v4 import + tokens
│   │   ├── (studio)/
│   │   │   ├── layout.tsx   # Sidebar + header shell
│   │   │   ├── page.tsx
│   │   │   ├── series/page.tsx
│   │   │   ├── assets/page.tsx
│   │   │   ├── prompts/page.tsx
│   │   │   ├── generations/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── diagnostics/page.tsx  # dev-only
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   ├── tsconfig.json
│   └── package.json
└── worker/                  # Bun-native worker
    ├── src/
    │   └── index.ts         # Bun.serve + GET /health
    ├── tsconfig.json
    └── package.json

packages/
├── ui/                      # shadcn/ui + Radix + Tailwind tokens
│   ├── src/
│   │   ├── components/      # shadcn components (button, ...)
│   │   ├── theme-provider.tsx
│   │   └── index.ts
│   ├── styles/globals.css   # Tailwind v4 @theme tokens + shadcn vars
│   ├── tsconfig.json
│   └── package.json
└── config/                  # Zod-validated env + subsystem status
    ├── src/
    │   ├── env.ts
    │   └── index.ts
    ├── tsconfig.json
    └── package.json

tsconfig.base.json           # shared strict TypeScript config
package.json                 # root workspaces + catalogs + scripts
bun.lock
```

**Structure Decision**: Bun workspace monorepo with `apps/*` and `packages/*`. Shared
dependencies are centralized in the root `catalog`/`catalogs` and referenced as `catalog:` from
each workspace. `packages/ui` owns the design tokens and shadcn primitives; `apps/web` imports
them. `packages/config` owns env validation and is the only place that reads `process.env`.

## Complexity Tracking

> No constitution violations. No justified complexity.
