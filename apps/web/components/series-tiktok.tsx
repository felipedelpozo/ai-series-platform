"use client";

import { useCallback, useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { Button, Input, Label } from "@ai-series/ui";
import {
  EmptyState,
  InlineNotice,
  LoadingSkeleton,
  SectionPanel,
  StatusBadge,
} from "@/components/ui";
import { studioMutation } from "@/lib/studio-mutation";

type Capability = { id: string; label: string; mode: string; connected: boolean };
type Video = { id: string; episodeNumber: number; url: string | null; status: string };
type Import = { id: string; source: string; signalCount: number; status: string };
type Feedback = { kind: "success" | "error" | "info"; message: string };

export function SeriesTikTok({ seriesId }: { seriesId: string }) {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [imports, setImports] = useState<Import[]>([]);
  const [url, setUrl] = useState("");
  const [episode, setEpisode] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/series/${seriesId}/tiktok`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load TikTok integration");
      setCapabilities(data.capabilities as Capability[]);
      setVideos(data.videos as Video[]);
      setImports(data.imports as Import[]);
    } catch (loadError) {
      setFeedback({
        kind: "error",
        message:
          loadError instanceof Error ? loadError.message : "Failed to load TikTok integration",
      });
    } finally {
      setLoading(false);
    }
  }, [seriesId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function associate() {
    setBusyAction("associate");
    setFeedback(null);
    try {
      const res = await studioMutation("tiktok.videos", `/api/series/${seriesId}/tiktok/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeNumber: episode, url }),
      });
      if (!res.ok) throw new Error("Failed to associate video");
      setUrl("");
      setFeedback({ kind: "success", message: "Published video associated with the episode." });
      await load();
    } catch (associationError) {
      setFeedback({
        kind: "error",
        message:
          associationError instanceof Error
            ? associationError.message
            : "Failed to associate video",
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function importDemo() {
    setBusyAction("import");
    setFeedback(null);
    try {
      const res = await studioMutation(
        "tiktok.engagement",
        `/api/series/${seriesId}/tiktok/engagement`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            episodeNumber: episode,
            source: "manual",
            correlationId: `demo-${Date.now()}`,
            events: [
              { id: `demo-${Date.now()}-1`, comment: "me encantó la escena del puente" },
              { id: `demo-${Date.now()}-2`, comment: "me encantó la escena del puente" },
              { id: `demo-${Date.now()}-3`, liked: true },
            ],
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to import engagement");
      setFeedback({ kind: "success", message: `Imported: ${data.signalsImported} signals` });
      await load();
    } catch (importError) {
      setFeedback({
        kind: "error",
        message: importError instanceof Error ? importError.message : "Failed to import engagement",
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function publish() {
    setBusyAction("publish");
    setFeedback(null);
    try {
      const res = await studioMutation("tiktok.publish", `/api/series/${seriesId}/tiktok/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeNumber: episode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to publish episode");
      setFeedback({
        kind: data.status === "published" ? "success" : "info",
        message: `${data.status}${data.reason ? `: ${data.reason}` : ""}`,
      });
    } catch (publishError) {
      setFeedback({
        kind: "error",
        message: publishError instanceof Error ? publishError.message : "Failed to publish episode",
      });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <SectionPanel
      title="TikTok integration"
      description="Connect released episodes with publishing and engagement signals without obscuring manual fallbacks."
    >
      <div className="space-y-6" aria-busy={busyAction !== null}>
        {loading ? (
          <LoadingSkeleton rows={2} />
        ) : feedback?.kind === "error" ? null : capabilities.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No TikTok capabilities available"
            description="Configure an available TikTok connection or manual workflow before publishing and importing engagement."
            compact
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2" aria-label="TikTok capabilities">
            {capabilities.map((capability) => (
              <li
                key={capability.id}
                className="flex min-w-0 items-center justify-between gap-3 rounded-lg border bg-card p-3"
              >
                <span className="truncate text-sm font-medium">{capability.label}</span>
                <StatusBadge status={capability.mode} />
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 lg:grid-cols-[8rem_minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-2">
            <Label htmlFor="tiktok-episode-number">Episode</Label>
            <Input
              id="tiktok-episode-number"
              type="number"
              min={1}
              value={episode}
              onChange={(event) => setEpisode(Number(event.target.value))}
              disabled={busyAction !== null}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tiktok-video-url">Published video URL</Label>
            <Input
              id="tiktok-video-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.tiktok.com/…"
              disabled={busyAction !== null}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={busyAction !== null || url.trim().length === 0}
            onClick={associate}
          >
            {busyAction === "associate" ? "Associating…" : "Associate"}
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={busyAction !== null}
            onClick={importDemo}
          >
            {busyAction === "import" ? "Importing…" : "Import demo engagement"}
          </Button>
          <Button type="button" disabled={busyAction !== null} onClick={publish}>
            {busyAction === "publish" ? "Publishing…" : "Publish"}
          </Button>
        </div>

        {feedback ? (
          <InlineNotice
            title={
              feedback.kind === "error"
                ? "TikTok action failed"
                : feedback.kind === "success"
                  ? "TikTok action complete"
                  : "TikTok update"
            }
            variant={
              feedback.kind === "error"
                ? "destructive"
                : feedback.kind === "success"
                  ? "success"
                  : "default"
            }
          >
            <div className="flex flex-wrap items-center gap-3">
              <span>{feedback.message}</span>
              {feedback.kind === "error" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFeedback(null);
                    void load();
                  }}
                >
                  Retry
                </Button>
              ) : null}
            </div>
          </InlineNotice>
        ) : null}

        {!loading && (videos.length > 0 || imports.length > 0) ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <section
              aria-labelledby="associated-videos-heading"
              className="min-w-0 rounded-xl border p-4"
            >
              <h5 id="associated-videos-heading" className="text-sm font-medium">
                Associated videos
              </h5>
              {videos.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No videos associated yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {videos.map((video) => (
                    <li
                      key={video.id}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-muted/35 p-3"
                    >
                      <span className="text-sm">Episode {video.episodeNumber}</span>
                      <StatusBadge status={video.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section
              aria-labelledby="engagement-imports-heading"
              className="min-w-0 rounded-xl border p-4"
            >
              <h5 id="engagement-imports-heading" className="text-sm font-medium">
                Engagement imports
              </h5>
              {imports.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No engagement imported yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {imports.map((engagementImport) => (
                    <li
                      key={engagementImport.id}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-muted/35 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium capitalize">
                          {engagementImport.source}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {engagementImport.signalCount} signals
                        </p>
                      </div>
                      <StatusBadge status={engagementImport.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
        <span className="sr-only" aria-live="polite">
          {busyAction ? "TikTok action in progress" : ""}
        </span>
      </div>
    </SectionPanel>
  );
}
