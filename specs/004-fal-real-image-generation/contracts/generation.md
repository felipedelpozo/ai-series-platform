# Contract: packages/fal + packages/generation

## packages/fal

- `submitImage(input)` -> `{ requestId }` — submit to the fal queue (model configurable).
- `imageStatus(requestId)` -> status object.
- `imageResult(requestId)` -> result with image URL.

All responses are Zod-validated; provider errors map to `FalError`.

## packages/generation

- `startImageGeneration(db, { templateId | versionId, variables, params })` -> `{ id, requestId }`.
- `pollImageGeneration(db, id)` -> updated generation + asset (when succeeded).

## Rules

- `FAL_KEY` is read server-side only; never returned by any endpoint.
- The canonical asset URL is internal (`/api/assets/:id/content`); the provider URL is transient.
