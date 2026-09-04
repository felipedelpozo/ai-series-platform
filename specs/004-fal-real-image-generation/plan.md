# Implementation Plan: Real fal.ai Image Generation

**Branch**: `004-fal-real-image-generation` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

## Summary

Add the first real generation vertical slice: a `packages/fal` adapter (server-side), a
`packages/generation` orchestration layer, `generations` + `assets` tables, API routes, and a
Generation Lab UI. Submissions use the fal queue (non-blocking) and are polled; results are
ingested into local storage (`ASSET_STORE_DIR`) and registered as assets with an internal URL.

## Technical Context

**Language/Version**: TypeScript (strict), Bun.
**Primary Dependencies**: `@fal-ai/client` 1.10.1 (stable).
**Storage**: PostgreSQL (generations/assets) + `ASSET_STORE_DIR` for images.
**Testing**: `bun test` (unit with mocked fal) + opt-in `test:live:fal`.
**Constraints**: `FAL_KEY` server-only; no fake provider; non-blocking HTTP.
**Scale/Scope**: 1 adapter package, 1 orchestration package, 2 tables, API + UI.

## Constitution Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| V. Generación Real | PASS | fal.ai real, smoke opt-in, no fake provider |
| VII. Providers Reemplazables | PASS | adapter behind typed port, Zod validation |
| IX. Trabajos Asíncronos | PASS | queue submit + polling, no blocking HTTP |
| XII. Seguridad | PASS | FAL_KEY server-side only |

## Project Structure

```text
packages/fal/            # fal.ai adapter (server-only)
packages/generation/     # submit/poll/ingest orchestration
apps/web/app/api/generations/...   # start + list + poll
apps/web/app/api/assets/[id]/content/route.ts  # serve ingested image
apps/web/app/(studio)/generations/...  # Generation Lab
```

## Complexity Tracking

> No constitution violations.
