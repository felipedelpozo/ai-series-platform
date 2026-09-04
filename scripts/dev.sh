#!/usr/bin/env bash
set -e

bun run --cwd apps/web dev &
WEB_PID=$!

bun run --cwd apps/worker dev &
WORKER_PID=$!

cleanup() {
  kill "$WEB_PID" "$WORKER_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT
wait "$WEB_PID" "$WORKER_PID"
