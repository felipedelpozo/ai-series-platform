import { Skeleton } from "@ai-series/ui";

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-label="Loading" role="status" className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-xl border bg-card p-4">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="mt-3 h-3 w-4/5" />
          <Skeleton className="mt-2 h-3 w-3/5" />
        </div>
      ))}
      <span className="sr-only">Loading content</span>
    </div>
  );
}
