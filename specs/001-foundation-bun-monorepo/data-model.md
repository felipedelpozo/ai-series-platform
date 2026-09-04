# Data Model: Foundation Bun Monorepo

This feature has no persistent storage. The following types are the in-memory contracts shared
between the config package, the worker and the diagnostics page.

## EnvironmentConfiguration

Validated representation of `process.env`, produced once at boot by `packages/config`.

| Field | Type | Notes |
|-------|------|-------|
| `appEnv` | `"development" \| "test" \| "production"` | Validated enum |
| `nodeEnv` | `"development" \| "test" \| "production"` | Defaults to `development` |
| `webPort` | `number \| undefined` | Optional; numeric if present |
| `workerPort` | `number` | Defaults to `8787` |
| `subsystems` | `SubsystemStatus[]` | Presence-only summary |

No secret values are stored on this object; secrets are read and discarded, keeping only a
`configured: boolean`.

## SubsystemStatus

Presence-only snapshot used by the diagnostics page and the worker health endpoint.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Stable key, e.g. `web`, `worker`, `database`, `generation` |
| `label` | `string` | Human-readable label |
| `configured` | `boolean` | Whether the subsystem's required env is present |
| `status` | `"configured" \| "not-configured" \| "not-applicable"` | Derived state |

For this feature, `web` and `worker` are always `configured`; `database` and `generation` are
presence-detected from optional env vars and remain `not-applicable` until their features land.
