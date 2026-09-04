# Research: Foundation Bun Monorepo

## Decision: Bun workspaces + catalogs for dependency management

- **Decision**: Use Bun workspaces (`workspaces: ["apps/*", "packages/*"]`) with the root
  `catalog` field; workspaces reference shared deps as `catalog:`.
- **Rationale**: Mandated by constitution II (Bun-First). Verified empirically with Bun 1.3.14:
  `catalog:` references resolve correctly and produce `bun.lock`.
- **Alternatives considered**: pnpm workspaces, npm workspaces — rejected by constitution;
  Turborepo — rejected (constitution II avoids it).

## Decision: Next.js 16 App Router for the web app

- **Decision**: Next.js 16 (latest stable, 16.3.4 at install time) with the App Router and
  React Server Components by default.
- **Rationale**: Mandated by constitution III. Client components only where real interactivity is
  needed (theme toggle).
- **Alternatives considered**: Vite + React — rejected; the constitution mandates Next.js App Router.

## Decision: Tailwind CSS v4 + shadcn/ui + Radix in a shared `packages/ui`

- **Decision**: `packages/ui` owns Tailwind v4 CSS-first tokens (`@theme`, shadcn HSL variables in
  `globals.css`), shadcn/ui components and the theme provider; `apps/web` imports them.
- **Rationale**: Mandated by constitution IV. Keeping tokens/components in a package satisfies
  FR-008 (decoupling UI from the web app) and lets future surfaces reuse the design system.
- **Alternatives considered**: colocating shadcn in `apps/web` — rejected because it couples the
  design system to a single app and conflicts with the base-plan package boundary.

## Decision: Zod 4 for environment validation in `packages/config`

- **Decision**: A single Zod schema in `packages/config` validates `process.env` and returns a
  typed config plus a subsystem-status summary. Both web and worker call it at boot and fail fast
  on invalid config.
- **Rationale**: Mandated by constitution X/XII (Zod at boundaries, secrets server-side). One
  validation source avoids drift between web and worker.
- **Alternatives considered**: hand-rolled validation — rejected; Zod is already mandated.

## Decision: Bun-native worker with an HTTP health endpoint

- **Decision**: `apps/worker` uses `Bun.serve` to expose `GET /health` returning JSON
  `{ status, subsystems, timestamp }`. No extra HTTP framework.
- **Rationale**: Smallest observable health surface (clarify decision Q2); Bun's built-in server
  avoids a framework dependency (constitution XIV).
- **Alternatives considered**: log-only health, an HTTP framework (Hono) — rejected to minimize
  dependencies.

## Decision: ESLint (flat config) + Prettier for lint/format

- **Decision**: ESLint 9 flat config with `@eslint/js`, `typescript-eslint` and
  `eslint-plugin-react-hooks` (classic recommended rules). Prettier for formatting. `bun test`
  is the test runner.
- **Rationale**: `eslint-config-next` 16.3.4 is incompatible with Next 16.3.4 + Bun: its parser
  resolves `next/babel`, which was removed in Next 16 (verified `node_modules/next/babel.js` is
  absent and `require.resolve('next/babel')` fails under both Node and Bun). The chosen flat
  config gives strict TypeScript and React hooks coverage without the removed preset.
- **Alternatives considered**: `eslint-config-next` — rejected for the compatibility break;
  Biome — rejected to stay on the established ESLint toolchain.

## Decision: Dev-only diagnostics gating

- **Decision**: The diagnostics route renders only when the runtime is development; in production
  it returns not-found. Subsystem status reports presence-only booleans, never secret values.
- **Rationale**: Clarify decisions Q3/Q4 and constitution XII.
- **Alternatives considered**: feature flag — rejected; env gating is simpler and deterministic.
