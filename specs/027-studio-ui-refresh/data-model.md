# Data Model: Studio UI Refresh

This feature introduces **no persistent entities, schema changes or migrations**.

## Existing canonical data

Series, bibles, entities, story state, plans, decisions, loops, TikTok connections, assets,
generations, prompts, jobs, costs, users and workspaces continue to come from their existing APIs and
domain packages. The refreshed UI must not reinterpret or duplicate their canonical state.

## Ephemeral view state

The interface may hold only reversible presentation state:

- `navigationOpen`: whether the responsive navigation Sheet is visible.
- `selectedItemId`: the item currently shown in a list-detail context.
- `activeSection`: the visible series or inspector section.
- `requestState`: `idle | loading | success | error` for an existing user-triggered action.
- `filterValues`: current existing filter values.

These values are not new domain entities and are not persisted server-side by this feature.

## Invariants

- Existing endpoint payloads and response shapes are unchanged.
- Existing IDs/status strings remain the source of truth.
- A visual status label never creates or mutates domain state.
- Disabling an action during its request prevents duplicates but does not alter the underlying
  operation or retry policy.
