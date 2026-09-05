# Implementation Plan: Prompt Registry + Prompt Studio

**Branch**: `003-prompt-registry-studio` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

## Summary

Introduce a versioned, editable Prompt Registry (`packages/prompts`) persisted in PostgreSQL
(`packages/db`), plus a Prompt Studio in `apps/web`. Templates are versioned (edits append a new
version), support variable preview, activation/archive/clone, scope-aware overrides, immutable
snapshots, and editable seeds for `test.image`/`test.video`.

## Technical Context

**Language/Version**: TypeScript (strict), Bun.
**Primary Dependencies**: Drizzle (existing), React/Next 16 (existing). No new runtime deps.
**Storage**: PostgreSQL via `packages/db`.
**Testing**: `bun test` (render/registry logic + integration).
**Constraints**: Immutable versions/snapshots; no hardcoded prompt strings for the 20 purposes.
**Scale/Scope**: 3 new tables, 1 domain package, REST routes, 2 studio pages.

## Constitution Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| VI. Prompts Como Datos Editables | PASS | Versioned templates, editable seeds, immutable snapshots |
| X. Persistencia | PASS | Drizzle tables + migration |
| IV. shadcn/Radix UI | PASS | Studio built on `@ai-series/ui` primitives |
| XIII. Testing | PASS | Deterministic render/registry tests + integration |

## Project Structure

```text
packages/prompts/
├── src/
│   ├── purposes.ts        # 20 canonical purposes
│   ├── render.ts          # renderTemplate + missing-variable detection
│   ├── registry.ts        # create/edit/clone/activate/archive/snapshot/list
│   ├── seed.ts            # seed test.image + test.video (idempotent)
│   ├── render.test.ts
│   └── registry.integration.test.ts
├── tsconfig.json
└── package.json

apps/web/app/
├── api/prompts/route.ts                  # GET list, POST create, POST preview
├── api/prompts/[id]/route.ts             # GET detail, PATCH edit
├── api/prompts/[id]/clone/route.ts       # POST clone
├── api/prompts/[id]/archive/route.ts     # POST archive
├── api/prompts/[id]/versions/[vid]/activate/route.ts  # POST activate
└── (studio)/prompts/...                  # list + editor pages
```

## Complexity Tracking

> No constitution violations.
