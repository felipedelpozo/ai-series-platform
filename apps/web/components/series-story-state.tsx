"use client";

import { useEffect, useState } from "react";
import { Button } from "@ai-series/ui";

export function SeriesStoryState({ seriesId }: { seriesId: string }) {
  const [history, setHistory] = useState<{ id: string; version: number; kind: string; data: unknown }[]>([]);
  const [json, setJson] = useState("{}");
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/series/${seriesId}/story-state`)
      .then((r) => r.json())
      .then((d) => setHistory(d.history ?? []));
  }

  useEffect(() => {
    load();
  }, [seriesId]);

  async function record(kind: string) {
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      setError("Invalid JSON");
      return;
    }
    const res = await fetch(`/api/series/${seriesId}/story-state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, data }),
    });
    if (!res.ok) {
      setError("Failed to record state");
      return;
    }
    setError(null);
    load();
  }

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold text-muted-foreground">Story state</h4>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={5}
        className="rounded-md border bg-background px-2 py-1 font-mono text-xs"
        placeholder='{"currentEpisode":1,"facts":["..."],"goals":["..."],"characters":[]}'
      />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => record("before")}>
          Record before
        </Button>
        <Button size="sm" variant="outline" onClick={() => record("after")}>
          Record after
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <ul className="flex flex-col gap-1">
        {history.map((h) => (
          <li key={h.id} className="rounded-md bg-muted px-2 py-1 text-xs">
            v{h.version} {h.kind} {h.kind === "before" || h.kind === "after" ? "" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
