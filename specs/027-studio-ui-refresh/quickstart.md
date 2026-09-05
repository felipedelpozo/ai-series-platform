# Quickstart: Studio UI Refresh Validation

## Prerequisites

- Bun dependencies installed.
- The existing PostgreSQL/development environment available for data-backed flows when possible.
- No paid generation is required for visual/regression validation.

## Automated gates

```bash
bun test
bun run typecheck
bun run lint
bun run build
bun run test:e2e
bun run format:check
git diff --check
```

Expected: all commands exit 0. If a backing local service is unavailable, classify the corresponding
runtime scenario as `UNAVAILABLE`; do not treat it as passed.

## Browser validation

Start the web app:

```bash
bun run dev:web
```

Use Playwright CLI against the actual served port.

### Route sweep

At 1440 × 1000, open every shell route in the
[UI compatibility contract](./contracts/ui-contract.md). Verify the shell, H1, active navigation,
real actions, loading/empty/error states and browser console. Verify `/` redirects and
`/diagnostics` remains intentionally outside the shell.

### Responsive matrix

Repeat **every served route** at widths 375, 768, 1024, 1280 and 1440. At each width assert:

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth;
```

At 375 and 768 px on each shell route, open/close the navigation Sheet by pointer and keyboard.
Confirm all destinations are reachable and focus returns to the trigger. For Series, Assets and
Episode Studio, additionally operate the page-specific mobile layout at all five widths.

### Interaction and state preservation

Validate every row in [action-matrix.md](./contracts/action-matrix.md) through the typed runtime
mutation guard and executable source-to-owner contract. Use deterministic browser interception for
representative members of every interaction and screen family in
[state-matrix.md](./contracts/state-matrix.md). Trigger loading, empty, error and success across the
primary data screens; verify retry where defined, pending duplicate locks, input retention after
failure and accessible live feedback. Keep the existing backend unit/integration suite green as the
evidence that request compatibility still produces the same business results.

- Series: create field, item selection, Bible generation/save/activation and all production sections.
- Assets: kind/status filters, item selection, preview, status change and guarded delete.
- Prompts: purpose filter, create form and editor route.
- Generations: filters, row selection and generation lab.
- Operations: refresh, budget/health/cost/failure sections and reprocess/cleanup actions.
- Accounts: login/register and workspace creation controls.
- Episode Studio: scene/shot selection, preview, prompt editing, save, regenerate, voice, QA and export.

Requests may be intercepted with deterministic responses for UI-state validation, but interception is
not evidence that a real backend integration works.

### Keyboard and contrast

- Traverse the primary journey of every shell route using Tab/Shift+Tab/Enter/Escape only.
- Assert each interactive control has a non-empty accessible name and a visible focus indicator.
- At 375 px assert isolated primary actions are at least 44 px high and other controls at least 40 px.
- In light and dark themes, calculate foreground/background contrast for body text, muted text,
  buttons, form controls, semantic status text and focus rings; require WCAG AA ratios (4.5:1 normal
  text, 3:1 large text and non-text UI components).

## Visual evidence

Capture light and dark desktop screenshots plus representative 375/768 screenshots. Inspect type,
spacing, hierarchy, truncation, touch targets, focus and the restrained use of the continuity line.
