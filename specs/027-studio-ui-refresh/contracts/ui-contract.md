# UI Compatibility Contract

## Shell routes

The feature preserves these served routes and their existing destination semantics:

- `/series`
- `/assets`
- `/prompts`
- `/prompts/[id]`
- `/generations`
- `/ops`
- `/accounts`
- `/settings`
- `/studio/[planId]`

## External routes

- `/` redirects to `/series` without rendering a second home surface.
- `/diagnostics` is development-only and intentionally renders outside the studio shell; it remains
  usable but is not asserted to expose studio navigation.

Exact compatibility coverage is defined by [action-matrix.md](./action-matrix.md) and
[state-matrix.md](./state-matrix.md).

## Actions and requests

- Existing buttons, links, filters, selects and forms remain available.
- Existing HTTP methods, paths and response interpretation remain unchanged. Existing optional
  idempotency inputs may be populated to make pending locks reliable across tabs and network retries.
- Loading locks may prevent duplicate submission while a request is pending.
- Destructive actions may add an accessible confirmation step without changing the eventual request.
- The redesign must not add fabricated product data or a second source of status truth.

## Shared presentation contract

Every primary studio route provides:

1. one H1 naming the current context;
2. concise purpose/supporting text;
3. at most one visually dominant action per immediate context;
4. explicit loading, empty and error presentation where data is fetched;
5. visible focus and accessible names for interactive controls;
6. no page-level horizontal overflow at 375, 768, 1024, 1280 or 1440 px;
7. usable light/dark themes and reduced-motion behavior.

## Shell contract

- Desktop navigation is persistent and may collapse without removing destinations.
- Mobile/tablet navigation opens as a modal Sheet and returns focus to its trigger when closed.
- The active route is exposed with `aria-current="page"`.
- The header identifies the current route and retains the theme control.
