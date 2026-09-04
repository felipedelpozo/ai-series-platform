# Contract: packages/prompts

## Exports

- `PURPOSES: string[]` — the 20 canonical purposes.
- `renderTemplate(template, variables, declared) -> { rendered, missing }` — substitutes `{{name}}`
  and returns missing required variables.
- `createPromptTemplate(db, input)`, `editPromptTemplate(db, id, input)`, `activatePromptVersion(db, id)`,
  `archivePromptTemplate(db, id)`, `clonePromptTemplate(db, id)`, `listPromptTemplates(db, purpose?)`,
  `getPromptDetail(db, id)`, `savePromptSnapshot(db, input)`.

## Rules

- Edits append a new version; prior versions and snapshots are never mutated.
- Activating a version flips the previous active version to inactive.
