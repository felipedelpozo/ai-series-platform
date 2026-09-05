# ADR 0001: Conversational Copilot Application Boundary

## Status

Accepted for Feature 029.

## Context

The conversational entry point coordinates accounts, canonical creative domains, prompt snapshots, AI
inference, cost controls and jobs. Existing domain helpers frequently own their own transaction or assume
the default workspace. Calling them sequentially from a route would allow partial writes, weaken tenant
isolation and make a chat transcript an accidental source of authority.

## Decision

Create one `@ai-series/copilot` application package. It owns intent classification, fixed authorized
context, immutable proposals/revisions, deterministic fingerprints, validation, exact decisions,
transaction coordination, cost gates and recovery projections.

Canonical state remains in Series, SeriesBible, Entity/EntityVersion, StoryState, EpisodePlan, Scene,
Shot, Job and CostRecord. Domain packages expose workspace-explicit primitives that accept a caller-owned
database executor. The copilot applies a complete approved change set and its immutable receipt in one
transaction.

HTTP routes authenticate, enforce same-origin cookie commands, bind workspace/role and validate bounded
input. AI providers receive only authorized delimited snapshots through typed, versioned prompts. Model
output is untrusted and cannot approve, apply, spend or select a workspace. Real inference requires its
own exact cost confirmation and usage attribution. Paid proposal jobs additionally bind the exact
editorial approval and any declared application-receipt dependency.

## Consequences

- Proposal and conversation history are audit evidence, not canonical creative truth.
- Approval is exact and one-use; retries reconcile receipts rather than repeat effects.
- Database composite tenant keys provide the final isolation boundary.
- Scene remains the structured screenplay model; no screenplay or Season store is introduced.
- Routes and UI can evolve without duplicating Series Workspace or Episode Studio state.
- The application package is intentionally orchestration-heavy but provider-light and testable with
  deterministic ports.

## Alternatives considered

- Calling legacy API routes: rejected because their transactions and authorization cannot compose.
- Writing canonical tables directly in React/route handlers: rejected because it duplicates domain rules.
- A generic JSON creative-resource store: rejected because it creates parallel canon.
- A new service or workflow runtime: rejected because conversational AI is request-sized; existing jobs
  remain the asynchronous boundary for long-running media work.
