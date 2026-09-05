# Research: BeUI Visual Refresh

## BeUI compatibility and license

**Decision**: Use only free BeUI registry source with verified MIT provenance. BeUI is a React,
Next.js, TypeScript and Tailwind component collection distributed as shadcn registry source, not a
Vue framework or runtime.

**Rationale**: The official repository and registry match the platform stack. Copying a bounded
component into the existing UI package preserves one component authority and permits attribution.

**Sources**:

- https://github.com/starc007/ui-components
- https://github.com/starc007/ui-components/blob/main/LICENSE
- https://beui.dev/llms.txt
- https://beui.dev/r/shared-layout-bg.json

Verified source snapshot: upstream commit `04d6f76e9e67e35cded996b1b8d08a5ddcebc13a`; registry
payload SHA-256 `b61ea3ac09650b2049d0a9edf0aba7fa1ab4a53c2aacdf1998b1346e11b69b92`.
The adapted source must retain its source comment and the complete MIT notice in
`packages/ui/THIRD_PARTY_NOTICES.md`.

**Alternatives considered**: BeUI Pro was rejected because it is commercial/private. Running
`shadcn add @beui/...` was rejected because this monorepo has no `components.json` and its UI target
is `packages/ui`, so generated aliases/paths could be wrong.

## Selected pattern

**Decision**: Manually adapt `@beui/shared-layout-bg` and its spring token, keeping source attribution,
reduced-motion behavior and shared-layout continuity. Apply it to existing navigation only.

**Rationale**: It is the smallest recognizable BeUI interaction and does not replace navigation,
state or accessibility contracts. `motion` is its only dependency not already present.

**Alternatives considered**:

- `@beui/animated-sidebar`: rejected because it duplicates the existing responsive shell.
- `@beui/tabs`: visual reference only; Radix Tabs remain the accessible state authority.
- `@beui/button-stateful`: interaction reference only; replacing Button would lose `asChild`, local
  variants and server-component compatibility. CSS press feedback preserves those contracts.

## shadcn Blocks

**Decision**: Preserve the existing Feature 027 adaptation of official `sidebar-07` and use
`dashboard-01` only as a hierarchy reference.

**Rationale**: The current shell already owns collapse, mobile Sheet, focus return, active route and
real navigation. Reinstalling block demo code would add fake data and duplicate components.

**Source**: https://ui.shadcn.com/blocks

## Visual language

**Decision**: Keep shadcn's neutral semantic tokens close to stock; remove decorative uppercase,
wide tracking, unneeded mono/display treatment, redundant shadows and unused continuity utilities.
Use quiet bordered surfaces, rounded control groups and limited pills.

**Rationale**: Official BeUI components consume semantic shadcn tokens and are distinguished by
motion rather than a proprietary palette. This also directly removes the rejected Feature 027
aesthetic without weakening state colors, dark mode or focus.

## Functional baseline and stacked delivery

**Decision**: Treat `79bd1d6` (`codex/027-launcher-prompts-follow-up`) as the exact baseline and open
a stacked PR while its upstream PR remains open.

**Rationale**: The four commits contain required prompt/detail inputs and duplicate guards that are
not yet on `develop`. Cherry-picking or reimplementation would risk divergence.

**Alternatives considered**: Building directly on `origin/develop` was rejected until the follow-up
lands. Retarget to `develop` only after verifying it contains the baseline commits.

Pre-implementation ancestry check on 2026-09-05: `origin/develop` was an ancestor of `79bd1d6`, and
the range contained exactly four commits (`17849c2`, `03a3f22`, `71a06f9`, `79bd1d6`). The Feature
028 branch was advanced by fast-forward, without cherry-picks or duplicated changes.
