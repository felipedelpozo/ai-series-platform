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

export function SeriesPlans({ seriesId }: { seriesId: string }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [episode, setEpisode] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          </li>
        ))}
      </ul>
    </div>
  );
}
