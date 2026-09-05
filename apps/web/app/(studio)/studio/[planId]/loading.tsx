import { Skeleton } from "@ai-series/ui";

export default function EpisodeStudioLoading() {
  return (
    <div
      className="grid min-h-[calc(100svh-8rem)] gap-4 lg:grid-cols-[16rem_minmax(0,1fr)_20rem]"
      role="status"
      aria-label="Loading episode studio"
    >
      <Skeleton className="min-h-48 rounded-xl" />
      <Skeleton className="min-h-[24rem] rounded-xl" />
      <Skeleton className="min-h-64 rounded-xl" />
      <span className="sr-only">Loading scenes, preview and inspector</span>
    </div>
  );
}
