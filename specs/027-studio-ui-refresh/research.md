# Research: Studio UI Refresh

## Decision 1: Adapt an official shadcn Sidebar Block composition

**Decision**: Use the official inset/collapsible Sidebar composition as the shell foundation,
including a provider, inset content, trigger, grouped menu, mobile Sheet and contextual header.

**Rationale**: The official shadcn Sidebar is composable, themeable, keyboard-aware and explicitly
supports mobile state. The Blocks catalog provides matching `sidebar-01` and `sidebar-07` examples
with breadcrumb/header composition, which maps to this studio without copying demo content.

**Alternatives considered**: Keep the current fixed `<aside>` (fails mobile and has no collapse
model); import a third-party application shell (duplicates the existing UI system); copy the entire
dashboard block (brings irrelevant charts/demo structure).

**Sources**: [Sidebar documentation](https://ui.shadcn.com/docs/components/radix/sidebar),
[Sidebar Blocks](https://ui.shadcn.com/blocks/sidebar),
[Dashboard Blocks](https://ui.shadcn.com/blocks?category=dashboard).

## Decision 2: Extend the shared package with focused shadcn primitives

**Decision**: Implement the primitives already needed repeatedly—Badge, Card, Input, Label,
Textarea, Select, Sheet, Skeleton, Alert, AlertDialog, Tabs and Table—in `@ai-series/ui`, using
Radix only where interaction semantics warrant it.

**Rationale**: The audit found raw controls and local panel styles repeated across every route while
the shared package exports only Button, Separator and Tooltip. Consolidating the actual repeated
patterns establishes consistency without creating a second component framework.

**Alternatives considered**: Keep local Tailwind controls (continues drift); add every shadcn
component pre-emptively (unnecessary surface); add a full third-party UI kit (constitutional breach).

**Sources**: [shadcn component catalog](https://ui.shadcn.com/docs/components),
[Table](https://ui.shadcn.com/docs/components/radix/table),
[Sheet](https://ui.shadcn.com/docs/components/radix/sheet).

## Decision 3: Preserve behavior in place

**Decision**: Keep fetch ownership, endpoint paths and domain results in their current components.
Refactor markup and local view state, with one compatible exception: use the API's existing
idempotency input and atomically reuse equivalent active jobs when the UI lock alone cannot cover
multiple tabs or a response-lost retry.

**Rationale**: The feature is explicitly visual/interaction architecture. Moving domain behavior at
the same time would enlarge regression risk and obscure whether failures are design or business
logic changes. The idempotency exception is narrowly bounded to preventing duplicate paid work and
does not add a route, schema, provider behavior or product capability.

**Alternatives considered**: Rewrite each screen as server components (changes request timing and
ownership); add a new client data library (unnecessary dependency and behavior change).

## Decision 4: Use an editorial production identity

**Decision**: Use Newsreader sparingly for page display titles, Geist for interface text and Geist
Mono for production metadata; use a mist/ink canvas with grease-pencil signal orange and semantic
green/amber/red states. Reserve the continuity line for ordered domain sequences.

**Rationale**: The product is a control surface for serialized audiovisual production, not a generic
analytics dashboard. Editorial type and timeline/provenance cues reinforce the work while restrained
color preserves operational clarity.

**Alternatives considered**: Near-black/acid accent (common generated default and too theatrical);
cream/serif/terracotta (another common default); neutral monochrome enterprise UI (competent but
interchangeable).

## Decision 5: Validate visual behavior as a contract

**Decision**: Pair existing test/type/build gates with browser snapshots, overflow checks, keyboard
focus checks and interaction verification at the required viewports.

**Rationale**: Static typechecks cannot prove responsive layout, navigation usability or accessible
focus. Browser evidence also catches incorrect assumptions about the actually served routes.

**Alternatives considered**: Screenshot only at one desktop width (misses the known fixed-width
failure); visual inspection without assertions (weak regression evidence).
