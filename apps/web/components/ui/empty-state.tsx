import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@ai-series/ui";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/25 px-5 text-center",
        compact ? "min-h-36 py-6" : "min-h-64 py-10",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-4 grid size-10 place-items-center rounded-full border bg-background text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      ) : null}
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
