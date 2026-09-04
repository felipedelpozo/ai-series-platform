# Contract: Worker Health Endpoint

## Endpoint

```text
GET /health
```

Served by the worker process (`apps/worker`) on `WORKER_PORT` (default `8787`).

## Response

```json
{
  "status": "ok",
  "service": "ai-series-worker",
  "subsystems": [
    { "id": "web", "label": "Web", "configured": true, "status": "configured" },
    { "id": "worker", "label": "Worker", "configured": true, "status": "configured" },
    { "id": "database", "label": "Database", "configured": false, "status": "not-applicable" },
    { "id": "generation", "label": "Generation provider", "configured": false, "status": "not-applicable" }
  ],
  "timestamp": "2026-09-04T00:00:00.000Z"
}
```

## Rules

- Response is always JSON with `Content-Type: application/json`.
- No secret values are ever included; `configured` is a presence-only boolean.
- A non-2xx result means the worker is not healthy or not running.
