# Data Model: PostgreSQL + Drizzle Core

## workspace

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `defaultRandom()` |
| `name` | text | human name |
| `slug` | text unique | stable identifier |
| `createdAt` | timestamptz | default now |
| `updatedAt` | timestamptz | default now |

## audit_log

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `defaultRandom()` |
| `actor` | text nullable | who performed the action (no auth yet) |
| `action` | text | action name |
| `entityType` | text | domain entity type |
| `entityId` | text | domain entity id |
| `metadata` | jsonb | arbitrary context |
| `createdAt` | timestamptz | default now |
