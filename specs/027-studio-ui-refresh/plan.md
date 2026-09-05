# Implementation Plan: Studio UI Refresh

**Branch**: `feature/027-studio-ui-refresh` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/027-studio-ui-refresh/spec.md`

## Summary

Refresh the complete existing studio as a coherent, production-ready interface while preserving
all domain behavior and API contracts. Extend `@ai-series/ui` with official shadcn-compatible
primitives, adapt the official inset/collapsible Sidebar Block composition to the real navigation,
introduce reusable product patterns for page headers, state feedback and status labels, then
refactor every studio route around the same neutral production language. Validate routes and
interactions with automated tests plus browser evidence at 375, 768, 1024, 1280 and 1440 px.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19.2, Next.js 16.3 App Router, Bun 1.3+

**Primary Dependencies**: Tailwind CSS 4.3, `@ai-series/ui`, shadcn/ui patterns, Radix UI, Lucide
React, existing domain workspace packages

**Storage**: No persistence change; PostgreSQL/Drizzle remain untouched

**Testing**: Bun test, TypeScript compiler, ESLint, Next.js build, Playwright Test for reproducible
acceptance plus Playwright CLI for exploratory browser screenshots

**Target Platform**: Modern desktop, tablet and mobile browsers; desktop-first studio with full
responsive support at the five specified widths

**Project Type**: Bun monorepo web application

**Performance Goals**: Shell navigation responds immediately; no layout shift introduced by
loading states; no new eager data requests or media downloads beyond existing behavior

**Constraints**: Preserve existing routes, compatible fetch contracts, permissions, actions and
domain state; no new product capability or database/schema changes; allow the minimum job-boundary
idempotency hardening recorded in the specification; use semantic tokens; WCAG AA for all
interface-owned content; reduced motion support; no page-level horizontal overflow

**Scale/Scope**: 10 served routes, the shared/feature components enumerated below, one shared UI
package, light and dark themes, five viewport widths

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

- **I. Spec-Driven Development — PASS (design gate)**: Feature 027 contains the required spec,
  clarification decisions and design artifacts; tasks, implementation, validation and convergence
  remain mandatory completion gates.
- **II. Monorepo Bun-First — PASS**: Uses existing Bun workspace and scripts; no alternate package
  manager or service is introduced.
- **III. Stack Moderno — PASS**: Extends the existing Next/React/Tailwind/shadcn/Radix stack.
- **IV. shadcn/Radix y Calidad — PASS**: Adapts official Sidebar/Dashboard Block composition and
  existing primitives before creating product-specific composites; includes accessibility,
  responsive and async state requirements.
- **V–XIII. Domain, provider, data, security and testing — PASS**: No provider, API route, schema,
  persistence model or secret boundary changes. Job enqueueing gains atomic active-action
  deduplication and exact-retry keys to preserve the existing no-duplicate-paid-work invariant;
  concurrent integration coverage is required.
- **XIV. Simplicidad — PASS**: Adds only stable shared primitives and repeated product patterns;
  no parallel UI framework or speculative architecture.
- **XV. Definition of Done — PASS (planned gate)**: The plan requires focused tests, full
  typecheck/lint/test/build, browser acceptance, five-width evidence and convergence; this is not
  satisfied until those commands have run.

Post-design re-check: **PASS**. The design introduces no constitutional exception and needs no ADR.

## Design Direction

### Subject, audience and job

- **Subject**: a focused production workspace for AI-native serialized video.
- **Audience**: creators and technical operators supervising costly, asynchronous production.
- **Single job**: make the current production state and the next safe action unmistakable.

### Tokens

- Neutral shadcn background, foreground, card, popover, muted, border and ring tokens provide the
  same hierarchy in white/light and near-black/dark themes.
- Primary actions remain monochrome; `success`, `warning` and `destructive` are reserved for real
  semantic states.
- Sidebar tokens follow the active theme instead of forcing a dark navigation rail in light mode.

Typography uses Geist for headings, body and controls, and Geist Mono only for IDs and technical
metadata. The launcher signature is a compact **production setup rail** sourced from the selected
series' active Bible, entity collection and active plans. It presents those values as facts, not as
mandatory workflow transitions or a second production-state model.

### Layout comparison

```text
Rejected generic dashboard
┌──────────┬────────────────────────────────────┐
│ nav      │ [card] [card] [card] [card]       │
│          │ [chart] [chart]                   │
│          │ [table]                           │
└──────────┴────────────────────────────────────┘

Selected production workspace
┌──────────┬────────────────────────────────────┐
│ grouped  │ context / purpose       main action│
│ studio   ├────────────────────────────────────┤
│ rail     │ status narrative → work surface   │
│          │ supporting detail when requested  │
└──────────┴────────────────────────────────────┘

Mobile
┌─────────────────────┐
│ menu  context  theme│
├─────────────────────┤
│ status / next action│
│ work surface        │
│ contextual details  │
└─────────────────────┘
```

### Self-critique and revision

The first concept overexpressed brand through a warm canvas, terracotta actions, serif headings and
a permanently dark light-theme sidebar. User review rejected that launcher. The revision restores
the native shadcn neutral foundation, removes decorative typography/color, constrains the series
grid and places the selected workspace at full width. No beUI/Motion dependency is added; the
factual setup rail uses existing CSS and the global reduced-motion policy.

## Reuse and Component Strategy

- Adapt official shadcn `sidebar-01`/`sidebar-07` composition: `SidebarProvider`, responsive Sheet,
  `SidebarInset`, grouped navigation, trigger and contextual header.
- Use the official dashboard block only as an information-hierarchy reference; do not copy its demo
  card/chart/table content because the product has different operational semantics.
- Extend `@ai-series/ui` with shadcn-compatible `Badge`, `Card`, `Input`, `Label`, `Textarea`,
  `Select`, `Sheet`, `Skeleton`, `Alert`, `AlertDialog`, `Tabs` and responsive `Table` primitives
  where the product actually uses those patterns.
- Add narrow product composites in `apps/web/components/ui/`: `PageHeader`, `EmptyState`,
  `StatusBadge`, `SectionPanel`, `LoadingSkeleton` and `InlineNotice` only when repeated across
  multiple screens.
- Keep data fetching and mutations in the existing page/feature components; presentation changes
  must not move business rules into UI primitives.

## Validation Strategy

1. Add deterministic render tests for primitives plus an exact executable action compatibility
   inventory and browser fixtures for route headings, states and existing action/endpoint wiring.
2. Run `bun run --cwd packages/ui typecheck` and `bun run --cwd apps/web typecheck` after each
   component batch.
3. Run `bun test`, `bun run typecheck`, `bun run lint`, `bun run build` and `bun run format:check`.
4. Serve the application and run overflow/shell checks across every route at 375, 768, 1024, 1280
   and 1440 px; capture deeper interaction evidence for Series, Assets and Episode Studio.
5. Assert `document.documentElement.scrollWidth <= clientWidth`, visible focus, accessible names,
   minimum 40 px control height (44 px for isolated primary mobile actions), open/close behavior of
   mobile navigation, and preserved controls/actions.
6. Inspect light/dark screenshots and console/network failures; distinguish pre-existing unavailable
   backend data from feature-caused render failures.

## Rollback Strategy

The feature is isolated to `feature/027-studio-ui-refresh`. Reverting the feature commits restores
the previous shared tokens/primitives and page compositions without data migration or cleanup. No
API, database or persistent user data rollback is required.

## Project Structure

### Documentation (this feature)

```text
specs/027-studio-ui-refresh/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/ui/
├── src/components/          # shadcn-compatible primitives
├── src/index.ts             # public UI exports
└── styles/globals.css       # semantic design tokens

apps/web/
├── app/
│   ├── layout.tsx           # fonts and metadata
│   ├── globals.css          # Tailwind token bindings/base rules
│   └── (studio)/            # shell and all studio routes
├── components/
│   ├── app-header.tsx
│   ├── app-sidebar.tsx
│   ├── studio-shell.tsx
│   ├── ui/                  # repeated product composites
│   └── series-*.tsx         # existing feature behavior, refreshed presentation
└── lib/                     # unchanged auth/config plus optional UI metadata

tests remain colocated as `*.test.ts` / `*.test.tsx` under affected packages.
```

**Structure Decision**: Preserve the existing monorepo and route/component boundaries. Shared
framework-level primitives belong in `packages/ui`; product-specific presentation belongs in
`apps/web`; domain behavior and APIs remain untouched.
