"use client";

import { useEffect, useState } from "react";
import { Button } from "@ai-series/ui";

type Plan = {
  id: string;
  episodeNumber: number;
  version: number;
  status: string;
  source: string;
  isActive: boolean;
};

type Scene = { id: string; order: number; data: { purpose: string }; shots: { id: string; data: { type: string } }[] };

export function SeriesPlans({ seriesId }: { seriesId: string }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [episode, setEpisode] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Record<string, Scene[]>>({});
  const [progress, setProgress] = useState<Record<string, { status: string; shotsWithKeyframe: number; shotsWithVideo: number; totalShots: number }>>({});

  function load() {
    fetch(`/api/series/${seriesId}/plans`)
      .then((r) => r.json())
      .then((d) => setPlans(d.plans as Plan[]));
  }

  useEffect(() => {
    load();
  }, [seriesId]);

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/series/${seriesId}/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episodeNumber: episode }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Generation failed");
      return;
    }
    load();
  }

  async function approve(planId: string) {
    await fetch(`/api/plans/${planId}/approve`, { method: "POST" });
    load();
  }

  async function generateScenes(planId: string) {
    const res = await fetch(`/api/plans/${planId}/scenes`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Scene generation failed");
      return;
    }
    setError(null);
    const list = await (await fetch(`/api/plans/${planId}/scenes`)).json();
    setScenes((prev) => ({ ...prev, [planId]: list.scenes }));
  }

  async function generateShots(planId: string, kind: string) {
    await fetch(`/api/plans/${planId}/generate-shots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const p = await (await fetch(`/api/plans/${planId}/progress`)).json();
    setProgress((prev) => ({ ...prev, [planId]: p }));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold text-muted-foreground">Episode plans</h4>
        <input
          type="number"
          value={episode}
          onChange={(e) => setEpisode(Number(e.target.value))}
          className="w-16 rounded-md border bg-background px-2 py-1 text-sm"
        />
        <Button size="sm" onClick={generate} disabled={busy}>
          Generate plan (AI)
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <ul className="flex flex-col gap-1">
        {plans.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-md bg-muted px-2 py-1 text-xs">
            <span>
              ep{p.episodeNumber} v{p.version} {p.isActive ? "(active)" : ""} · {p.status} · {p.source}
            </span>
            {p.status === "draft" && (
              <button onClick={() => approve(p.id)} className="underline">
                approve
              </button>
            )}
            <button onClick={() => generateScenes(p.id)} className="underline">
              scenes
            </button>
            <button onClick={() => generateShots(p.id, "keyframe")} className="underline">
              keyframes
            </button>
            <button onClick={() => generateShots(p.id, "video")} className="underline">
              videos
            </button>
          </li>
        ))}
      </ul>
      {Object.entries(scenes).map(([planId, list]) => (
        <ul key={planId} className="mt-1 flex flex-col gap-1 pl-4">
          {list.map((scene) => (
            <li key={scene.id} className="text-xs text-muted-foreground">
              scene {scene.order + 1}: {scene.data.purpose} · {scene.shots.length} shots
            </li>
          ))}
        </ul>
      ))}
      {Object.entries(progress).map(([planId, p]) => (
        <p key={planId} className="mt-1 pl-4 text-xs text-muted-foreground">
          progress: {p.shotsWithKeyframe}/{p.totalShots} keyframes · {p.shotsWithVideo}/{p.totalShots} videos · {p.status}
        </p>
      ))}
    </div>
  );
}
