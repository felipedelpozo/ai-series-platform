# Quickstart: Prompt Registry + Prompt Studio

```bash
bun run db:migrate          # apply the prompt tables migration
bun run dev                 # seed test.image/test.video on boot
```

Open `/prompts` to list templates, filter by purpose, open a template and edit/preview. Editing
creates a new version; the version history and preview (missing variables) are visible.
