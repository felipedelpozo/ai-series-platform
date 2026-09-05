import { Badge } from "@ai-series/ui";
import { FileDiff, Minus, Plus } from "lucide-react";
import type { CopilotDiffItem } from "@/lib/copilot-loader";

export function ProposalDiff({ items }: { items: CopilotDiffItem[] }) {
  if (items.length === 0) {
    return (
      <div className="grid min-h-52 place-items-center rounded-xl border border-dashed bg-muted/20 p-6 text-center">
        <div className="max-w-sm">
          <FileDiff className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold">No effective changes</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            This revision cannot be approved or applied until its diff contains a canonical change.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ol className="space-y-3" aria-label="Canonical changes">
      {items.map((item) => (
        <li key={item.id} className="overflow-hidden rounded-xl border bg-background">
          <header className="flex min-w-0 flex-wrap items-center gap-2 border-b bg-muted/20 px-3 py-2">
            <Badge
              variant={
                item.operation === "create"
                  ? "success"
                  : item.operation === "archive"
                    ? "destructive"
                    : "warning"
              }
            >
              {item.operation}
            </Badge>
            <span className="text-xs text-muted-foreground">{item.resourceType}</span>
            <span className="min-w-0 truncate text-sm font-medium">{item.resourceLabel}</span>
            {item.field ? (
              <code className="ml-auto text-[0.6875rem] text-muted-foreground">{item.field}</code>
            ) : null}
          </header>
          <div className="grid min-w-0 gap-px bg-border sm:grid-cols-2">
            <DiffValue label="Before" value={item.before} kind="before" />
            <DiffValue label="After" value={item.after} kind="after" />
          </div>
        </li>
      ))}
    </ol>
  );
}

function DiffValue({
  label,
  value,
  kind,
}: {
  label: string;
  value: unknown;
  kind: "before" | "after";
}) {
  const Icon = kind === "before" ? Minus : Plus;
  return (
    <div className="min-w-0 bg-card p-3">
      <p
        className={`mb-2 flex items-center gap-1 text-xs font-medium ${kind === "before" ? "text-destructive" : "text-success"}`}
      >
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </p>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[0.6875rem] leading-relaxed">
        {value === undefined
          ? "—"
          : typeof value === "string"
            ? value
            : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
