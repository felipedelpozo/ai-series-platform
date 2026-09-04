# Research: PostgreSQL + Drizzle Core

- **Decision**: Drizzle ORM with the `postgres-js` driver (`postgres` package) over `node-postgres`.
  Rationale: Bun-compatible, typed schema, versioned migrations via `drizzle-kit`.
- **Decision**: IDs are UUIDv4 generated in application code (`crypto.randomUUID()`) with a
  `uuid` column and `defaultRandom()`. Rationale: stable cross-provider IDs, no DB extension needed.
- **Decision**: The default workspace is seeded idempotently by unique `slug` (`default`) using an
  `ON CONFLICT DO NOTHING` insert. Rationale: repeatable across migrations and boots.
- **Decision**: Integration tests use a dedicated `ai_series_test` database created idempotently.
  Rationale: isolates test data from the development `ai_series` database.
- **Alternatives considered**: Prisma — rejected (constitution mandates Drizzle); raw `pg` — rejected
  (loses schema typing and migration tooling).
