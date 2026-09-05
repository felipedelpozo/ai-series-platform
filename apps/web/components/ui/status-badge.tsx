import { Badge } from "@ai-series/ui";

const success = new Set([
  "active",
  "approved",
  "completed",
  "connected",
  "ready",
  "succeeded",
  "success",
]);
const warning = new Set(["draft", "generating", "pending", "processing", "queued", "running"]);
const danger = new Set(["blocked", "cancelled", "error", "failed", "rejected", "stuck"]);

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const normalized = (status ?? "unknown").toLowerCase();
  const variant = success.has(normalized)
    ? "success"
    : danger.has(normalized)
      ? "destructive"
      : warning.has(normalized)
        ? "warning"
        : "muted";

  return <Badge variant={variant}>{normalized.replaceAll("_", " ")}</Badge>;
}
