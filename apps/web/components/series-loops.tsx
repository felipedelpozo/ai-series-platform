"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GitFork } from "lucide-react";
import { Button, Input, Label } from "@ai-series/ui";
import {
  EmptyState,
  InlineNotice,
  LoadingSkeleton,
  SectionPanel,
  StatusBadge,
} from "@/components/ui";
import { studioMutation } from "@/lib/studio-mutation";

type Loop = {
  id: string;
  fromEpisode: number;
  toEpisode: number;
  status: string;
  branchId: string | null;
  storyStateVersionAfter: number | null;
};

type Branch = { id: string; name: string; baseEpisode: number };
type Decision = { id: string; episodeNumber: number; status: string; title: string | null };

export function SeriesLoops({ seriesId }: { seriesId: string }) {
  const [loops, setLoops] = useState<Loop[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branchName, setBranchName] = useState("Alternative");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRequestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++loadRequestRef.current;
    setLoading(true);
    try {
      const [loopsResponse, decisionsResponse] = await Promise.all([
        fetch(`/api/series/${seriesId}/loops`),
        fetch(`/api/series/${seriesId}/decisions`),
      ]);
      const [loopData, decisionData] = await Promise.all([
        loopsResponse.json(),
        decisionsResponse.json(),
      ]);
      if (!loopsResponse.ok) throw new Error(loopData.error ?? "Failed to load episode loops");
      if (!decisionsResponse.ok)
        throw new Error(decisionData.error ?? "Failed to load approved decisions");
      if (request === loadRequestRef.current) {
        setLoops(loopData.loops as Loop[]);
        setBranches(loopData.branches as Branch[]);
        setDecisions(
          (decisionData.decisions as Decision[]).filter(
            (decision) => decision.status === "approved",
          ),
        );
        setError(null);
      }
    } catch (loadError) {
      if (request === loadRequestRef.current) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load episode loops");
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

  async function apply(decisionId: string) {
    setBusyAction(`apply:${decisionId}`);
    setError(null);
    try {
      const res = await studioMutation("loops.create", `/api/series/${seriesId}/loops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionId, branchId: selectedBranch || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to apply decision");
      await load();
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Failed to apply decision");
    } finally {
      setBusyAction(null);
    }
  }

  async function createBranch() {
    setBusyAction("create-branch");
    setError(null);
    try {
      const res = await studioMutation("loops.branch", `/api/series/${seriesId}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: branchName, baseEpisode: 1 }),
      });
      if (!res.ok) throw new Error("Failed to create branch");
      await load();
    } catch (branchError) {
      setError(branchError instanceof Error ? branchError.message : "Failed to create branch");
    } finally {
      setBusyAction(null);
    }
  }

  async function advance(loopId: string, stage: "plan" | "scenes" | "generate") {
    setBusyAction(`${stage}:${loopId}`);
    setError(null);
    try {
      const actionId = `loops.${stage}` as "loops.plan" | "loops.scenes" | "loops.generate";
      const res = await studioMutation(actionId, `/api/loops/${loopId}/${stage}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed to run ${stage}`);
      await load();
    } catch (advanceError) {
      setError(advanceError instanceof Error ? advanceError.message : `Failed to run ${stage}`);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <SectionPanel
      title="Next-episode loop"
      description="Apply approved audience decisions and advance the resulting episode branch in order."
    >
      <div className="space-y-6" aria-busy={busyAction !== null}>
        <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="branch-name">New branch name</Label>
            <Input
              id="branch-name"
              value={branchName}
              onChange={(event) => setBranchName(event.target.value)}
              disabled={busyAction !== null}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={createBranch}
            disabled={busyAction !== null || branchName.trim().length === 0}
          >
            {busyAction === "create-branch" ? "Creating…" : "New branch"}
          </Button>
        </div>

        {error ? (
          <InlineNotice title="Loop action failed" variant="destructive">
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
        ) : error ? null : (
          <>
            <section aria-labelledby="approved-decisions-heading">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h5 id="approved-decisions-heading" className="text-sm font-medium">
                    Approved decisions
                  </h5>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose where the next canonical change should be applied.
                  </p>
                </div>
                <div className="w-full space-y-2 sm:max-w-56">
                  <Label htmlFor="loop-branch">Apply on branch</Label>
                  <select
                    id="loop-branch"
                    value={selectedBranch}
                    onChange={(event) => setSelectedBranch(event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
                    disabled={busyAction !== null}
                  >
                    <option value="">Canonical</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {decisions.length === 0 ? (
                <EmptyState
                  icon={GitFork}
                  title="No approved decisions"
                  description="Approve an audience decision before applying it to the canonical story or an alternative branch."
                  compact
                />
              ) : (
                <ul className="grid gap-3 lg:grid-cols-2">
                  {decisions.map((decision) => (
                    <li
                      key={decision.id}
                      className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Episode {decision.episodeNumber}
                        </p>
                        <p className="truncate text-sm font-medium">
                          {decision.title ?? "Decision"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyAction !== null}
                        onClick={() => apply(decision.id)}
                      >
                        {busyAction === `apply:${decision.id}` ? "Applying…" : "Apply"}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="decision-timeline-heading">
              <div className="mb-3">
                <h5 id="decision-timeline-heading" className="text-sm font-medium">
                  Decision timeline
                </h5>
                <p className="mt-1 text-xs text-muted-foreground">
                  Each loop advances from its source episode to the next production state.
                </p>
              </div>
              {loops.length === 0 ? (
                <EmptyState
                  icon={GitFork}
                  title="No episode loops yet"
                  description="Apply an approved decision to create the first traceable episode transition."
                  compact
                />
              ) : (
                <ol
                  className="relative ml-2 space-y-4 border-l border-border pl-5"
                  aria-label="Decision timeline"
                >
                  {loops.map((loop) => (
                    <li key={loop.id} className="relative min-w-0 rounded-lg border bg-card p-4">
                      <span
                        className="absolute -left-[1.63rem] top-5 size-2.5 rounded-full border-2 border-background bg-primary"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-medium">
                            Episode {loop.fromEpisode} → {loop.toEpisode}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {loop.branchId ? "Alternative branch" : "Canonical story"}
                            {loop.storyStateVersionAfter
                              ? ` · Story state v${loop.storyStateVersionAfter}`
                              : ""}
                          </p>
                        </div>
                        <StatusBadge status={loop.status} />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyAction !== null}
                          onClick={() => advance(loop.id, "plan")}
                        >
                          {busyAction === `plan:${loop.id}` ? "Planning…" : "Plan"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyAction !== null}
                          onClick={() => advance(loop.id, "scenes")}
                        >
                          {busyAction === `scenes:${loop.id}` ? "Generating…" : "Scenes"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyAction !== null}
                          onClick={() => advance(loop.id, "generate")}
                        >
                          {busyAction === `generate:${loop.id}` ? "Generating…" : "Generate"}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
        <span className="sr-only" aria-live="polite">
          {busyAction ? "Next-episode loop action in progress" : ""}
        </span>
      </div>
    </SectionPanel>
  );
}
