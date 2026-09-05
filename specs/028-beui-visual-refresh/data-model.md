# Data Model: BeUI Visual Refresh

No domain entity, persistence record, migration or API payload changes.

The feature changes presentation only. Existing canonical models, permissions, job states, request
bodies and the 46-action inventory remain the source of truth. UI-only motion state is ephemeral,
local to the rendered component, and must never be persisted or interpreted as production state.
