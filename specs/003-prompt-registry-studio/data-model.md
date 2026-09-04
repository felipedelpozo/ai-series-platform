# Data Model: Prompt Registry

## prompt_templates

`id`, `workspace_id`, `purpose`, `name`, `description`, `scope_type` (global/workspace/series/
episode/scene/shot), `scope_id` (nullable), `status` (active/archived), timestamps.

## prompt_versions

`id`, `template_id` (FK), `version` (int, monotonic per template), `template` (text), `variables`
(jsonb: `{name, required, default}[]`), `output_contract` (jsonb, nullable), `is_active` (bool),
`created_at`. Exactly one active version per template (enforced in the registry).

## prompt_snapshots

`id`, `template_id`, `version_id`, `rendered_text`, `variables` (jsonb), `model` (nullable),
`params` (jsonb, nullable), `created_at`. Insert-only.
