"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Clapperboard } from "lucide-react";
import { Button, Input, Label, Textarea } from "@ai-series/ui";
import {
  EmptyState,
  InlineNotice,
  LoadingSkeleton,
  SectionPanel,
  StatusBadge,
} from "@/components/ui";
import { studioMutation } from "@/lib/studio-mutation";

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
type Progress = {
  status: string;
  shotsWithKeyframe: number;
  shotsWithVideo: number;
  totalShots: number;
};
type Entity = { id: string; name: string };

function PlanTextField({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm">{String(value ?? "—")}</dd>
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
      <dd className="mt-1 text-sm">
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
    <div className="space-y-4">
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
      {data.proposedStoryStateAfter ? (
        <details className="rounded-md border bg-muted/20">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring">
            Proposed story state after
          </summary>
          <pre className="overflow-x-auto whitespace-pre-wrap border-t bg-background p-3 font-mono text-xs">
            {JSON.stringify(data.proposedStoryStateAfter, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

export function SeriesPlans({ seriesId }: { seriesId: string }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});
  const [episode, setEpisode] = useState(1);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Record<string, Scene[]>>({});
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const loadRequestRef = useRef(0);
  const entityRequestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++loadRequestRef.current;
    setLoading(true);
    try {
      const response = await fetch(`/api/series/${seriesId}/plans`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load episode plans");
      if (request === loadRequestRef.current) {
        setPlans(data.plans as Plan[]);
        setError(null);
      }
    } catch (loadError) {
      if (request === loadRequestRef.current) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load episode plans");
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

  useEffect(() => {
    const request = ++entityRequestRef.current;
    void fetch(`/api/entities?seriesId=${seriesId}`)
      .then((response) => response.json())
      .then((data) => {
        if (request !== entityRequestRef.current) return;
        const nextNames: Record<string, string> = {};
        for (const entity of (data.entities ?? []) as Entity[]) {
          nextNames[entity.id] = entity.name;
        }
        setEntityNames(nextNames);
      })
      .catch(() => {
        if (request === entityRequestRef.current) setEntityNames({});
      });

    return () => {
      entityRequestRef.current += 1;
    };
  }, [seriesId]);

  async function generate() {
    setBusyAction("generate-plan");
    setError(null);
    try {
      const res = await studioMutation("plans.create", `/api/series/${seriesId}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeNumber: episode, details }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      await load();
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Generation failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function approve(planId: string) {
    setBusyAction(`approve:${planId}`);
    setError(null);
    try {
      const response = await studioMutation("plans.approve", `/api/plans/${planId}/approve`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to approve plan");
      await load();
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : "Failed to approve plan");
    } finally {
      setBusyAction(null);
    }
  }

  async function generateScenes(planId: string) {
    setBusyAction(`scenes:${planId}`);
    setError(null);
    try {
      const res = await studioMutation("plans.generateScenes", `/api/plans/${planId}/scenes`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scene generation failed");
      const listResponse = await fetch(`/api/plans/${planId}/scenes`);
      const list = await listResponse.json();
      if (!listResponse.ok) throw new Error(list.error ?? "Failed to load scenes");
      setScenes((prev) => ({ ...prev, [planId]: list.scenes }));
    } catch (sceneError) {
      setError(sceneError instanceof Error ? sceneError.message : "Scene generation failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function generateShots(planId: string, kind: string) {
    setBusyAction(`${kind}:${planId}`);
    setError(null);
    try {
      const response = await studioMutation(
        "plans.generateShots",
        `/api/plans/${planId}/generate-shots`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind }),
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? `Failed to generate ${kind}s`);
      }
      const progressResponse = await fetch(`/api/plans/${planId}/progress`);
      const nextProgress = await progressResponse.json();
      if (!progressResponse.ok)
        throw new Error(nextProgress.error ?? "Failed to load production progress");
      setProgress((prev) => ({ ...prev, [planId]: nextProgress }));
    } catch (shotError) {
      setError(shotError instanceof Error ? shotError.message : `Failed to generate ${kind}s`);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <SectionPanel
      title="Episode plans"
      description="Develop each episode from plan approval through scenes, keyframes and video."
    >
      <div className="space-y-5" aria-busy={busyAction !== null}>
        <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
          <div className="w-full space-y-2 sm:max-w-40">
            <Label htmlFor="plan-episode-number">Episode number</Label>
            <Input
              id="plan-episode-number"
              type="number"
              min={1}
              value={episode}
              onChange={(event) => setEpisode(Number(event.target.value))}
              disabled={busyAction !== null}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="episode-details">
              Episode details for AI{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="episode-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Describe the plot, tone, characters, locations, conflicts, reveals or any constraints the AI should follow for this episode."
              aria-describedby="episode-details-help"
              disabled={busyAction !== null}
            />
          </div>
          <div
            id="episode-details-help"
            className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
          >
            <p>Included in this generation and recorded in its immutable prompt snapshot.</p>
            <span className="tabular-nums">{details.length}/4000</span>
          </div>
          <Button type="button" onClick={generate} disabled={busyAction !== null}>
            {busyAction === "generate-plan" ? "Generating plan…" : "Generate plan (AI)"}
          </Button>
        </div>

        {error ? (
          <InlineNotice title="Plan action failed" variant="destructive">
            <div className="flex flex-wrap items-center gap-3">
              <span>{error}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          </InlineNotice>
        ) : null}

        {loading ? (
          <LoadingSkeleton rows={2} />
        ) : error ? null : plans.length === 0 ? (
          <EmptyState
            icon={Clapperboard}
            title="No episode plans yet"
            description="Choose an episode number and generate a plan to begin its production sequence."
            compact
          />
        ) : (
          <ul className="space-y-4" aria-label="Episode plans">
            {plans.map((plan) => {
              const planScenes = scenes[plan.id];
              const planProgress = progress[plan.id];
              return (
                <li key={plan.id} className="min-w-0 rounded-xl border bg-card p-4 shadow-xs">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="font-medium">
                          Episode {plan.episodeNumber} · Version {plan.version}
                        </h5>
                        <StatusBadge status={plan.status} />
                        {plan.isActive ? <StatusBadge status="active" /> : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Source: {plan.source}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {plan.status === "draft" ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => approve(plan.id)}
                          disabled={busyAction !== null}
                        >
                          {busyAction === `approve:${plan.id}` ? "Approving…" : "Approve"}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => generateScenes(plan.id)}
                        disabled={busyAction !== null}
                      >
                        {busyAction === `scenes:${plan.id}` ? "Generating…" : "Generate scenes"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => generateShots(plan.id, "keyframe")}
                        disabled={busyAction !== null}
                      >
                        {busyAction === `keyframe:${plan.id}`
                          ? "Generating…"
                          : "Generate keyframes"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => generateShots(plan.id, "video")}
                        disabled={busyAction !== null}
                      >
                        {busyAction === `video:${plan.id}` ? "Generating…" : "Generate videos"}
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/studio/${plan.id}`}>Open studio</Link>
                      </Button>
                    </div>
                  </div>

                  <details open={plan.isActive} className="mt-4 rounded-lg border bg-muted/20">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring">
                      Full plan details
                    </summary>
                    <div className="border-t bg-background/70 p-4">
                      <PlanDetails data={plan.data} entityNames={entityNames} />
                    </div>
                  </details>

                  {planScenes ? (
                    <div className="mt-4 border-t pt-4">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Scene sequence
                      </p>
                      {planScenes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No scenes were returned for this plan.
                        </p>
                      ) : (
                        <ol className="relative ml-2 space-y-3 border-l border-border pl-5">
                          {planScenes.map((scene) => (
                            <li key={scene.id} className="relative min-w-0">
                              <span
                                className="absolute -left-[1.55rem] top-1 size-2 rounded-full bg-primary"
                                aria-hidden="true"
                              />
                              <p className="text-sm font-medium">Scene {scene.order + 1}</p>
                              <p className="break-words text-sm text-muted-foreground">
                                {scene.data.purpose} · {scene.shots.length} shots
                              </p>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  ) : null}

                  {planProgress ? (
                    <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Keyframes</p>
                        <p className="mt-1 font-mono text-sm">
                          {planProgress.shotsWithKeyframe}/{planProgress.totalShots}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Videos</p>
                        <p className="mt-1 font-mono text-sm">
                          {planProgress.shotsWithVideo}/{planProgress.totalShots}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Production status</p>
                        <div className="mt-1">
                          <StatusBadge status={planProgress.status} />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <span className="sr-only" aria-live="polite">
          {busyAction ? "Episode plan action in progress" : ""}
        </span>
      </div>
    </SectionPanel>
  );
}
