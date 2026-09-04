"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@ai-series/ui";

type Capability = { id: string; label: string; mode: string; connected: boolean };
type Video = { id: string; episodeNumber: number; url: string | null; status: string };
type Import = { id: string; source: string; signalCount: number; status: string };

export function SeriesTikTok({ seriesId }: { seriesId: string }) {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [imports, setImports] = useState<Import[]>([]);
  const [url, setUrl] = useState("");
  const [episode, setEpisode] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/series/${seriesId}/tiktok`)
      .then((r) => r.json())
      .then((d) => {
        setCapabilities(d.capabilities as Capability[]);
        setVideos(d.videos as Video[]);
        setImports(d.imports as Import[]);
      });
  }, [seriesId]);

  useEffect(() => {
    load();
  }, [load]);

  async function associate() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/series/${seriesId}/tiktok/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episodeNumber: episode, url }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Failed to associate video");
      return;
    }
    setUrl("");
    load();
  }

  async function importDemo() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/series/${seriesId}/tiktok/engagement`, {
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
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Failed to import engagement");
      return;
    }
    setMessage(`Imported: ${data.signalsImported} signals`);
    load();
  }

  async function publish() {
    setBusy(true);
    const res = await fetch(`/api/series/${seriesId}/tiktok/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episodeNumber: episode }),
    });
    const data = await res.json();
    setBusy(false);
    setMessage(`${data.status}${data.reason ? `: ${data.reason}` : ""}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold text-muted-foreground">TikTok integration</h4>

      <ul className="flex flex-col gap-1">
        {capabilities.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-md bg-muted px-2 py-1 text-xs">
            <span>{c.label}</span>
            <span
              className={
                c.mode === "connected"
                  ? "text-green-600"
                  : c.mode === "manual"
                    ? "text-muted-foreground"
                    : "text-destructive"
              }
            >
              {c.mode}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={episode}
          onChange={(e) => setEpisode(Number(e.target.value))}
          className="w-16 rounded-md border bg-background px-2 py-1 text-sm"
          aria-label="Episode number"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Published video URL"
          className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
        />
        <Button size="sm" variant="outline" disabled={busy} onClick={associate}>
          Associate
        </Button>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={importDemo}>
          Import demo engagement
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={publish}>
          Publish
        </Button>
      </div>

      {message && <p className="text-xs text-muted-foreground">{message}</p>}

      {videos.length > 0 && (
        <div className="text-xs">
          <span className="font-semibold text-muted-foreground">Videos:</span>{" "}
          {videos.map((v) => `${v.status}#${v.episodeNumber}`).join(", ")}
        </div>
      )}
      {imports.length > 0 && (
        <div className="text-xs">
          <span className="font-semibold text-muted-foreground">Imports:</span>{" "}
          {imports.map((i) => `${i.source} (${i.signalCount} signals)`).join(", ")}
        </div>
      )}
    </div>
  );
}
