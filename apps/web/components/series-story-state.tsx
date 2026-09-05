"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { History } from "lucide-react";
import { Button, Label, Textarea } from "@ai-series/ui";
import {
  EmptyState,
  InlineNotice,
  LoadingSkeleton,
  SectionPanel,
  StatusBadge,
} from "@/components/ui";
import { studioMutation } from "@/lib/studio-mutation";

type StoryStateEntry = { id: string; version: number; kind: string; data: unknown };

export function SeriesStoryState({ seriesId }: { seriesId: string }) {
  const [history, setHistory] = useState<StoryStateEntry[]>([]);
  const [json, setJson] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [busyKind, setBusyKind] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRequestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++loadRequestRef.current;
    setLoading(true);
    try {
      const response = await fetch(`/api/series/${seriesId}/story-state`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load story state");
      if (request === loadRequestRef.current) {
        setHistory(data.history ?? []);
        setError(null);
      }
    } catch (loadError) {
      if (request === loadRequestRef.current) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load story state");
      }
    } finally {
      if (request === loadRequestRef.current) setLoading(false);
    }
  }, [seriesId]);

  useEffect(() => {
    void Promise.resolve().then(load);
    return () => {
      loadRequestRef.current += 1;
    };
  }, [load]);

  async function record(kind: string) {
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      setError("Invalid JSON");
      return;
    }

    setBusyKind(kind);
    setError(null);
    try {
      const res = await studioMutation("story.append", `/api/series/${seriesId}/story-state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, data }),
      });
      if (!res.ok) throw new Error("Failed to record state");
      await load();
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : "Failed to record state");
    } finally {
      setBusyKind(null);
    }
  }

  return (
    <SectionPanel
      title="Story state"
      description="Capture the canonical narrative state before and after each episode transition."
    >
      <div className="space-y-5" aria-busy={busyKind !== null}>
        <div className="space-y-2">
          <Label htmlFor="story-state-json">Canonical state (JSON)</Label>
          <Textarea
            id="story-state-json"
            value={json}
            onChange={(event) => setJson(event.target.value)}
            rows={6}
            className="font-mono text-xs"
            placeholder='{"currentEpisode":1,"facts":["..."],"goals":["..."],"characters":[]}'
            aria-invalid={error === "Invalid JSON"}
            disabled={busyKind !== null}
          />
          <p className="text-xs text-muted-foreground">
            Use “before” for the incoming truth and “after” for the state produced by the episode.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => record("before")}
            disabled={busyKind !== null}
          >
            {busyKind === "before" ? "Recording…" : "Record before"}
          </Button>
          <Button type="button" onClick={() => record("after")} disabled={busyKind !== null}>
            {busyKind === "after" ? "Recording…" : "Record after"}
          </Button>
        </div>

        {error ? (
          <InlineNotice title="Story state unavailable" variant="destructive">
            <div className="flex flex-wrap items-center gap-3">
              <span>{error}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          </InlineNotice>
        ) : null}

        <div>
          <h5 className="mb-3 text-sm font-medium">Version history</h5>
          {loading ? (
            <LoadingSkeleton rows={2} />
          ) : error ? null : history.length === 0 ? (
            <EmptyState
              icon={History}
              title="No story state recorded"
              description="Record the incoming state for the first episode to begin the continuity history."
              compact
            />
          ) : (
            <ol
              className="relative ml-2 space-y-3 border-l border-border pl-5"
              aria-label="Story state history"
            >
              {history.map((entry) => (
                <li key={entry.id} className="relative min-w-0 rounded-lg border bg-card p-3">
                  <span
                    className="absolute -left-[1.63rem] top-4 size-2.5 rounded-full border-2 border-background bg-primary"
                    aria-hidden="true"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      Version {entry.version}
                    </span>
                    <StatusBadge status={entry.kind} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        <span className="sr-only" aria-live="polite">
          {busyKind ? `Recording ${busyKind} story state` : ""}
        </span>
      </div>
    </SectionPanel>
  );
}
