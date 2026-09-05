# Implementation Plan: BeUI Visual Refresh

**Branch**: `feature/028-beui-visual-refresh` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/028-beui-visual-refresh/spec.md`

## Summary

Replace the rejected Feature 027 presentation layer with a quieter, recognizably BeUI-inspired
interaction language while preserving its complete functional baseline. Keep shadcn/Radix and the
near-stock semantic tokens as the only component system; manually adapt the MIT BeUI shared-layout
background into the existing UI package, add restrained spring/press behavior, simplify repeated
surfaces and typography, then apply those shared contracts across the existing shell and routes.

The branch is intentionally stacked on `codex/027-launcher-prompts-follow-up` at `79bd1d6` until its
PR reaches `develop`, because those four commits contain the generation inputs and guards that
Feature 028 must preserve rather than reimplement.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19.2, Next.js 16.3 App Router, Bun 1.3+

**Primary Dependencies**: Tailwind CSS 4.3, `@ai-series/ui`, shadcn/ui, Radix UI, Lucide React,
`motion` for the selected BeUI shared-layout behavior

**Storage**: No persistence change; PostgreSQL/Drizzle remain untouched

**Testing**: Bun test, TypeScript compiler, ESLint, Next.js build, Playwright Test, Axe and
Playwright CLI visual inspection

**Target Platform**: Modern desktop, tablet and mobile browsers at 375, 768, 1024, 1280 and 1440 px

**Project Type**: Bun monorepo web application

**Performance Goals**: Motion adds at most 45 KiB gzip to the baseline shared client chunks, remains
scoped to the existing client sidebar, uses transform/opacity and becomes duration-free under reduced
motion; it adds no request or media work

**Constraints**: Preserve all Feature 027 routes, 46 action contracts, permissions, request bodies,
prompts/inputs, async guards, loading/empty/error states, light/dark mode, keyboard behavior and
responsive layouts; no CLI-generated paths, parallel component framework or paid BeUI material

**Scale/Scope**: Nine studio routes plus `/`, `/diagnostics`, shared shell/product composites,
`packages/ui`, five viewport widths and both themes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

- **I. Spec-Driven Development — PASS**: Feature 028 has a separate spec and complete lifecycle.
- **II. Monorepo Bun-First — PASS**: Bun remains the only package/runtime workflow.
- **III. Stack Moderno — PASS**: BeUI free components are shadcn-compatible React/Tailwind source;
  `motion` is the single small runtime dependency required by the selected interaction.
- **IV. shadcn/Radix y Calidad — PASS**: shadcn/Radix remain authoritative. Official shadcn
  `sidebar-07` and `dashboard-01` were reviewed; the existing adapted shell is retained.
- **V–XII. Provider, domain, persistence, jobs, observability and security — PASS**: No API, schema,
  provider, job or authorization boundary changes.
- **XIII. Testing — PASS**: Existing deterministic action tests and 69 Playwright cases remain gates;
  no paid generation is required.
- **XIV. Simplicity — PASS**: One selected MIT component is adapted into the shared package; the
  full BeUI sidebar and a second tabs system are rejected.
- **XV. Definition of Done — PASS (planned)**: focused/full gates, browser evidence, convergence and
  independent review are mandatory.

Post-design re-check: **PASS**. No constitutional exception or ADR is required.

## Design Direction

### Subject, audience and job

- **Subject**: a control room for serialized audiovisual production.
- **Audience**: creators and operators supervising long-running, costly work.
- **Single job**: expose current context and the next safe action without visual noise.

### Compact token system

- **Canvas** `#ffffff` / **Night canvas** `#171717`: semantic background.
- **Surface** `#ffffff` / **Night surface** `#262626`: cards and popovers.
- **Soft field** `#f5f5f5` / **Night field** `#404040`: grouped controls and hover targets.
- **Ink** `#171717` / **Night ink** `#fafafa`: content and primary action.
- **Hairline** `#e5e5e5` / translucent white: boundaries without decorative elevation.
- Success, warning and destructive tokens remain reserved for real state.

Geist remains the sole interface face. Geist Mono is limited to identifiers, payload/code and
technical values; decorative uppercase/tracking labels are removed.

### Layout and signature

```text
Desktop
┌──────────────────────────────────────────────────────┐
│ quiet inset nav │ contextual header      key action │
│  (active pill)  ├────────────────────────────────────┤
│                 │ low-chrome work surface            │
│                 │ grouped by purpose, not decoration │
└──────────────────────────────────────────────────────┘

Mobile
┌─────────────────────────────┐
│ menu · context · theme      │
├─────────────────────────────┤
│ action / state              │
│ stacked work surface        │
└─────────────────────────────┘
```

The memorable gesture is a shared-layout pill that previews eligible navigation items on hover or
keyboard focus, plus a small press response on controls. It never replaces location state:
`aria-current` and the active route surface remain permanent. On coarse pointers there is no
hover-only behavior. Surrounding surfaces stay static, neutral and disciplined. Motion uses
transforms/opacity and honors reduced motion.

### Self-critique

An initial risk was to treat “BeUI” as a new theme and reintroduce custom colors, glass everywhere or
decorative motion. Official source shows that BeUI's useful distinction is interaction continuity,
not a global palette. The plan therefore keeps stock semantic color, spends boldness only on the
shared-layout indicator, and removes unused continuity CSS and ornamental typography.

## Component and Route Strategy

- Add shared motion tokens and an adapted `SharedLayoutBackground` to `packages/ui`, retaining the
  official source attribution and MIT provenance in `research.md`.
- Preserve the server-compatible shadcn `Button` contract including `asChild`; add CSS press feedback
  rather than replacing it with BeUI's client-only button base.
- Keep Radix Tabs as the accessible authority; simplify its visual surface instead of introducing a
  second tabs state model.
- Simplify `Card`, `PageHeader`, `SectionPanel`, `EmptyState`, `LoadingSkeleton`, badges and notices so
  every route inherits the same low-chrome hierarchy.
- Integrate shared-layout motion only into the existing AppSidebar and retain its Next routing,
  current-page semantics, mobile Sheet, focus return and collapse behavior.
- Refactor presentation classes route-by-route without changing code before render functions,
  handlers, fetch calls, methods, request bodies, locks or permission decisions.

## Validation Strategy

1. Extend render/source tests for the adapted component, near-stock tokens, reduced motion and the
   absence of rejected ornamental utilities.
2. Record baseline and final gzip sizes for shared client chunks; reject a delta above 45 KiB and
   confirm `motion` is not imported by server route modules.
3. Run the executable 46-action inventory before and after the visual refactor.
4. Run focused UI/web tests and typechecks after shared primitives and after route integration.
5. Run `bun test`, `bun run typecheck`, `bun run lint`, `bun run build`, changed-file Prettier and
   `git diff --check`.
6. Run the Playwright suite with PostgreSQL on the isolated port 3100, covering all five widths,
   light/dark, keyboard, Axe, async states, destructive confirmation and action locks.
7. Inspect the route × five viewport × two theme matrix, with captured screenshots for every route
   at 1440 px plus Series, Assets, Prompts and Episode Studio at mobile/tablet sizes. Record visual
   evidence and any unavailable checks truthfully.
8. Require independent review, owner remediation and independent re-review with zero BLOCKER/HIGH
   findings before push/PR.

## Rollback and Delivery

Feature-owned changes are presentation code, tests and documentation only; reverting its commits
restores the previous presentation without data rollback. Push `feature/028-beui-visual-refresh` and
open a stacked PR against `codex/027-launcher-prompts-follow-up` while that PR is open. If the base is
merged first, verify ancestry and retarget Feature 028 to `develop`. Never merge or deploy.

## Project Structure

### Documentation

```text
specs/028-beui-visual-refresh/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ui-contract.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code

```text
packages/ui/
├── src/components/              # shadcn primitives + selected BeUI adaptation
├── src/lib/                     # motion tokens and existing utilities
├── src/index.ts                 # one public component surface
└── styles/globals.css           # near-stock semantic tokens

apps/web/
├── app/globals.css              # Tailwind mappings and base accessibility rules
├── app/(studio)/                # existing route compositions
├── components/                  # existing feature components and shell
├── components/ui/               # repeated product composites
├── e2e/studio-ui.spec.ts        # browser contract and visual evidence
└── lib/studio-action-contracts.ts # immutable 46-action baseline
```

**Structure Decision**: Preserve the monorepo and all current boundaries. Framework primitives and
motion live in `packages/ui`; product composition remains in `apps/web`; business/domain packages
are untouched.
