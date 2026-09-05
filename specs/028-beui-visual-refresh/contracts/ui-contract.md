# UI Contract: BeUI Visual Refresh

## Compatibility boundary

- Preserve every entry in `apps/web/lib/studio-action-contracts.ts`: owner, route, method, target and
  payload fields must remain compatible.
- Preserve the Feature 027 route/state matrix and the follow-up Bible, Entity and Episode Plan detail
  inputs, including pending locks and retained input after failure.
- Do not change API routes, domain packages, authorization rules, persistence or job semantics.

## Shared visual boundary

- `@ai-series/ui` remains the only primitive component package.
- BeUI source may enter only as a documented free/MIT adaptation with repository-local imports.
- Adapted BeUI source must be pinned by upstream commit and registry payload hash, retain source
  attribution and ship the complete MIT copyright and permission notice.
- All motion must respect reduced motion, avoid blocking interaction and use transform/opacity where
  practical.
- The moving navigation pill is hover/focus feedback only. Permanent location state remains exposed
  through `aria-current` and a non-transient active surface; coarse pointers do not depend on hover.
- State meaning must use text/icon/semantics in addition to color and remain AA in both themes.

## Responsive and accessibility boundary

- Served pages must not horizontally overflow at 375, 768, 1024, 1280 or 1440 px.
- Existing accessible names, labels, roles, `aria-current`, focus order, focus return and minimum
  touch targets remain valid.
- Mobile navigation retains the existing Sheet/dialog contract and keyboard containment.
- The final shared-client gzip delta must not exceed 45 KiB relative to the pinned baseline build.

## Visual acceptance boundary

- All primary routes inherit the same near-stock tokens, low-chrome surfaces and control language.
- Decorative Feature 027 utilities and local styling are removed or documented as necessary for a
  state, responsive, functional or accessibility constraint.
- Automated coverage exercises the route × five viewport × two theme matrix. Visual evidence
  includes every primary route at desktop and Series, Assets, Prompts and Episode Studio at
  mobile/tablet sizes, including non-happy states.
