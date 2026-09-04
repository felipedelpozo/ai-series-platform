# Tasks: Accounts & Workspaces

## Phase 1: Schema

- [x] T001 Add `users`, `sessions`, `workspace_members`, `invitations`, `workspace_quotas` and
      `workspace_settings` tables and generate a migration

## Phase 2: Domain

- [x] T002 Add `packages/accounts` with password hashing, register/login/session, members, roles,
      invitations, quotas and default-workspace adoption
- [x] T003 Add deterministic tests for hashing, role gating, quota enforcement and adoption

## Phase 3: API + UI

- [x] T004 Implement accounts API routes and a compact accounts view

## Phase 4: Validation

- [x] T005 Verify `typecheck`, `lint`, `test`, `build`
