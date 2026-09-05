# Quickstart: Image Generation

```bash
bun run db:migrate           # apply generations/assets tables
bun run dev                  # web + worker
```

Open `/generations`, pick a `test.image`/`image.generate` template, set variables and submit.
The job is polled to queued/running/succeeded/failed; on success the image is ingested to
`ASSET_STORE_DIR` and shown.

Live smoke (opt-in, spends fal balance):

```bash
bun run --cwd packages/fal test:live:fal
```
