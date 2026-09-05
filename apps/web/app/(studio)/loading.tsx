import { Skeleton } from "@ai-series/ui";
import { LoadingSkeleton } from "@/components/ui";

export default function StudioLoading() {
  return (
    <div className="space-y-8" aria-label="Loading page" role="status">
      <header className="border-b pb-6">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-4 h-9 w-56" />
        <Skeleton className="mt-4 h-4 w-full max-w-xl" />
      </header>
      <LoadingSkeleton rows={3} />
      <span className="sr-only">Loading production data</span>
    </div>
  );
}
