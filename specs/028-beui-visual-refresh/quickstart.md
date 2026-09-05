# Quickstart: BeUI Visual Refresh Validation

## Prerequisites

```bash
bun install --frozen-lockfile
docker ps --filter name=ai-series-db
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/ai_series_platform bun run db:migrate
```

Install Chromium once if Playwright reports it missing:

```bash
bunx playwright install chromium
```

## Focused gates

```bash
bun test packages/ui/src/components/components.test.tsx apps/web/lib/studio-ui.test.ts
bun run --cwd packages/ui typecheck
bun run --cwd apps/web typecheck
```

Confirm the action inventory still reports exactly 46 compatible mutations.

## Browser acceptance

```bash
DATABASE_URL=postgres://postgres@127.0.0.1:5432/ai_series_platform \
ASSET_STORE_DIR="$(pwd)/.media" \
bun run --cwd apps/web test:e2e -- --workers=1
```

The suite starts this worktree on `127.0.0.1:3100`. Inspect screenshots for all desktop routes and
Series, Assets, Prompts and Episode Studio at 375/768 px. Verify both themes, non-happy states,
keyboard focus, reduced motion, long content containment and absence of page overflow.

## Full gates

```bash
bun test
bun run typecheck
bun run lint
bun run build
bun run format:check
git diff --check
```

If repository-wide formatting fails on files outside this feature, classify that debt separately and
run Prettier check over every changed Feature 028 file. No paid provider smoke test is required for a
presentation-only change.

## Delivery check

Before opening the PR, fetch refs and verify whether `codex/027-launcher-prompts-follow-up` is still
open. Use it as the PR base while open; if merged, confirm ancestry and retarget Feature 028 to
`develop`. Never merge or deploy from this workflow.
