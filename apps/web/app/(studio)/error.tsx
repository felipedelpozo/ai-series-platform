"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@ai-series/ui";
import { InlineNotice, PageHeader } from "@/components/ui";

export default function StudioError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Recovery"
        title="This production view could not load"
        description="The route is still available. Retry the request; your persisted production data has not been changed."
      />
      <InlineNotice title="The page returned an unexpected error" variant="destructive">
        Retry now. If it fails again, use Operations to inspect the related job or request.
      </InlineNotice>
      <Button onClick={reset}>
        <RotateCcw aria-hidden="true" />
        Retry page
      </Button>
    </div>
  );
}
