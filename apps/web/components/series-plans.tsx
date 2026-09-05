"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@ai-series/ui";

type Plan = {
  id: string;
  episodeNumber: number;
  version: number;
  status: string;
  source: string;
  isActive: boolean;
  data: {
    hook?: string;
    dramaticGoal?: string;
    beats?: string[];
    targetDuration?: string;
    characterIds?: string[];
    locationIds?: string[];
    propIds?: string[];
    reveals?: string[];
    requiredContinuity?: string[];
    closing?: string;
    cliffhanger?: string;
    audienceQuestion?: string | null;
    proposedStoryStateAfter?: Record<string, unknown>;
  };
};

type Scene = {
  id: string;
  order: number;
  data: { purpose: string };
  shots: { id: string; data: { type: string } }[];
};
type Entity = { id: string; type: string; name: string };

function PlanTextField({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm">{String(value ?? "—")}</dd>
    </div>
  );
}

function PlanListField({
  label,
  values,
  resolve,
}: {
  label: string;
  values: string[];
  resolve?: (value: string) => string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">
        {values.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5">
            {values.map((value, index) => (
              <li key={`${index}-${value}`}>{resolve ? resolve(value) : value}</li>
            ))}
          </ul>
        ) : (
          "—"
        )}
      </dd>
    </div>
  );
}

function PlanDetails({
  data,
  entityNames,
}: {
  data: Plan["data"];
  entityNames: Record<string, string>;
}) {
  const nameOf = (id: string) => entityNames[id] ?? id;
  const hasContent = Object.values(data).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return Boolean(value);
  });
  if (!hasContent) {
    return <p className="text-xs text-muted-foreground">No details in this plan.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        <PlanTextField label="Hook" value={data.hook} />
        <PlanTextField label="Dramatic goal" value={data.dramaticGoal} />
        <PlanTextField label="Target duration" value={data.targetDuration} />
        <PlanTextField label="Audience question" value={data.audienceQuestion} />
        <PlanTextField label="Closing" value={data.closing} />
        <PlanTextField label="Cliffhanger" value={data.cliffhanger} />
      </dl>
      <dl className="grid gap-3 sm:grid-cols-2">
        <PlanListField label="Beats" values={data.beats ?? []} />
        <PlanListField label="Reveals" values={data.reveals ?? []} />
        <PlanListField label="Required continuity" values={data.requiredContinuity ?? []} />
        <PlanListField label="Characters" values={data.characterIds ?? []} resolve={nameOf} />
        <PlanListField label="Locations" values={data.locationIds ?? []} resolve={nameOf} />
        <PlanListField label="Props" values={data.propIds ?? []} resolve={nameOf} />
      </dl>
      {data.proposedStoryStateAfter && (
        <details className="rounded-md border bg-muted/20">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">
            Proposed story state after
          </summary>
          <pre className="overflow-x-auto whitespace-pre-wrap border-t bg-background p-3 font-mono text-xs">
            {JSON.stringify(data.proposedStoryStateAfter, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export function SeriesPlans({ seriesId }: { seriesId: string }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});
  const [episode, setEpisode] = useState(1);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Record<string, Scene[]>>({});
  const [progress, setProgress] = useState<
    Record<
      string,
      { status: string; shotsWithKeyframe: number; shotsWithVideo: number; totalShots: number }
    >
  >({});

  function load() {
    fetch(`/api/series/${seriesId}/plans`)
      .then((r) => r.json())
      .then((d) => setPlans(d.plans as Plan[]));
  }

  useEffect(() => {
    load();
  }, [seriesId]);

  useEffect(() => {
    fetch(`/api/entities?seriesId=${seriesId}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, string> = {};
        for (const entity of (d.entities ?? []) as Entity[]) {
          map[entity.id] = entity.name;
        }
        setEntityNames(map);
      });
  }, [seriesId]);

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/series/${seriesId}/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episodeNumber: episode, details }),
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
      <h4 className="text-xs font-semibold text-muted-foreground">Episode plans</h4>
      <div className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={episode}
            onChange={(e) => setEpisode(Number(e.target.value))}
            className="w-16 rounded-md border bg-background px-2 py-1 text-sm"
          />
          <Button size="sm" onClick={generate} disabled={busy}>
            {busy ? "Generating plan…" : "Generate plan (AI)"}
          </Button>
        </div>
        <label htmlFor="episode-details" className="text-xs font-medium">
          Episode details for AI{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="episode-details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="Describe the plot, tone, characters, locations, conflicts, reveals or any constraints the AI should follow for this episode."
          className="rounded-md border bg-background px-3 py-2 text-sm"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            These details will be included in this generation and recorded in its prompt snapshot.
          </p>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {details.length}/4000
          </span>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <ul className="flex flex-col gap-1">
        {plans.map((p) => (
          <li key={p.id} className="rounded-md border bg-muted/40">
            <details open={p.isActive}>
              <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs hover:bg-muted">
                <span>
                  ep{p.episodeNumber} v{p.version} {p.isActive ? "(active)" : ""} · {p.status} ·{" "}
                  {p.source}
                </span>
                <span className="flex items-center gap-2">
                  {p.status === "draft" && (
                    <button
                      onClick={(event) => {
                        event.preventDefault();
                        approve(p.id);
                      }}
                      className="underline"
                    >
                      approve
                    </button>
                  )}
                  <button
                    onClick={(event) => {
                      event.preventDefault();
                      generateScenes(p.id);
                    }}
                    className="underline"
                  >
                    scenes
                  </button>
                  <button
                    onClick={(event) => {
                      event.preventDefault();
                      generateShots(p.id, "keyframe");
                    }}
                    className="underline"
                  >
                    keyframes
                  </button>
                  <button
                    onClick={(event) => {
                      event.preventDefault();
                      generateShots(p.id, "video");
                    }}
                    className="underline"
                  >
                    videos
                  </button>
                  <Link href={`/studio/${p.id}`} className="underline">
                    studio
                  </Link>
                </span>
              </summary>
              <div className="flex flex-col gap-3 border-t bg-background p-3">
                <PlanDetails data={p.data} entityNames={entityNames} />
              </div>
            </details>
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
          progress: {p.shotsWithKeyframe}/{p.totalShots} keyframes · {p.shotsWithVideo}/
          {p.totalShots} videos · {p.status}
        </p>
      ))}
    </div>
  );
}
