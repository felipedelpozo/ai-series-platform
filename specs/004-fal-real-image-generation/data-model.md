# Data Model: Image Generation

## generations

`id`, `workspace_id`, `purpose`, `template_id`, `version_id`, `prompt_snapshot_id`, `provider`,
`model`, `status` (queued/running/succeeded/failed), `request_id`, `params` (jsonb), `error`,
`duration_ms`, timestamps.

## assets

`id`, `workspace_id`, `generation_id`, `kind`, `source`, `url` (internal), `mime`, `width`,
`height`, `size_bytes`, `provider`, `model`, `status`, timestamps.
