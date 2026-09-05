"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GitBranch, Star } from "lucide-react";
import { Button, Input, Label } from "@ai-series/ui";
import {
  EmptyState,
  InlineNotice,
  LoadingSkeleton,
  SectionPanel,
  StatusBadge,
} from "@/components/ui";
import { studioMutation } from "@/lib/studio-mutation";

type Candidate = {
  id: string;
  label: string;
  intent: string;
  signalCount: number;
  score: number;
  isWinner: boolean;
};

type Decision = {
  id: string;
  episodeNumber: number;
  status: string;
  title: string | null;
  summary: string | null;
  rationale: string | null;
  confidence: number;
  winningCandidateId: string | null;
};

export function SeriesDecisions({ seriesId }: { seriesId: string }) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({});
  const [episode, setEpisode] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRequestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++loadRequestRef.current;
    setLoading(true);
    try {
      const response = await fetch(`/api/series/${seriesId}/decisions`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load decisions");
      const nextDecisions = data.decisions as Decision[];
      if (request !== loadRequestRef.current) return;
      setDecisions(nextDecisions);

      const details = await Promise.all(
        nextDecisions.map(async (decision) => {
          const detailResponse = await fetch(`/api/decisions/${decision.id}`);
          const detail = await detailResponse.json();
          if (!detailResponse.ok)
            throw new Error(detail.error ?? "Failed to load decision candidates");
          return [decision.id, detail.candidates ?? []] as const;
        }),
      );
      if (request === loadRequestRef.current) {
        setCandidates(Object.fromEntries(details));
        setError(null);
      }
    } catch (loadError) {
      if (request === loadRequestRef.current) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load decisions");
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

  async function propose() {
    setBusyAction("propose");
    setError(null);
    try {
      const res = await studioMutation("decisions.create", `/api/series/${seriesId}/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeNumber: episode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to propose decision");
      await load();
    } catch (proposalError) {
      setError(
        proposalError instanceof Error ? proposalError.message : "Failed to propose decision",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function approve(decisionId: string, candidateId?: string) {
    setBusyAction(`approve:${candidateId ?? decisionId}`);
    setError(null);
    try {
      const response = await studioMutation(
        "decisions.approve",
        `/api/decisions/${decisionId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(candidateId ? { candidateId } : {}),
        },
      );
      if (!response.ok) throw new Error("Failed to approve decision");
      await load();
    } catch (approvalError) {
      setError(
        approvalError instanceof Error ? approvalError.message : "Failed to approve decision",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function reject(decisionId: string) {
    setBusyAction(`reject:${decisionId}`);
    setError(null);
    try {
      const response = await studioMutation(
        "decisions.reject",
        `/api/decisions/${decisionId}/reject`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Failed to reject decision");
      await load();
    } catch (rejectionError) {
      setError(
        rejectionError instanceof Error ? rejectionError.message : "Failed to reject decision",
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <SectionPanel
      title="Audience decisions"
      description="Review audience signals, compare candidates and select the direction that becomes canonical."
    >
      <div className="space-y-5" aria-busy={busyAction !== null}>
        <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full space-y-2 sm:max-w-40">
            <Label htmlFor="decision-episode-number">Episode number</Label>
            <Input
              id="decision-episode-number"
              type="number"
              min={1}
              value={episode}
              onChange={(event) => setEpisode(Number(event.target.value))}
              disabled={busyAction !== null}
            />
          </div>
          <Button
            type="button"
            onClick={propose}
            disabled={busyAction !== null}
            className="w-full sm:w-auto"
          >
            {busyAction === "propose" ? "Proposing…" : "Propose decision"}
          </Button>
        </div>

        {error ? (
          <InlineNotice title="Decision action failed" variant="destructive">
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
        ) : error ? null : decisions.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="No audience decisions yet"
            description="Propose a decision when an episode has enough audience context to compare possible directions."
            compact
          />
        ) : (
          <ul className="space-y-4" aria-label="Audience decisions">
            {decisions.map((decision) => (
              <li key={decision.id} className="min-w-0 rounded-xl border bg-card p-4 shadow-xs">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Episode {decision.episodeNumber}
                    </p>
                    <h5 className="mt-1 break-words font-medium">{decision.title ?? "Decision"}</h5>
                    {decision.summary ? (
                      <p className="mt-1 break-words text-sm text-muted-foreground">
                        {decision.summary}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <StatusBadge status={decision.status} />
                    <span className="font-mono text-xs text-muted-foreground">
                      {(decision.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>

                {decision.rationale ? (
                  <p className="mt-3 rounded-lg bg-muted/35 p-3 text-sm leading-relaxed text-muted-foreground">
                    {decision.rationale}
                  </p>
                ) : null}

                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Candidates
                  </p>
                  {(candidates[decision.id] ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No candidates are available for this decision.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {(candidates[decision.id] ?? []).map((candidate) => (
                        <li
                          key={candidate.id}
                          className="flex min-w-0 flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {candidate.isWinner ? (
                                <Star
                                  className="size-4 shrink-0 fill-primary text-primary"
                                  aria-label="Current winner"
                                />
                              ) : null}
                              <span className="break-words text-sm font-medium">
                                {candidate.label}
                              </span>
                            </div>
                            <p className="mt-1 break-words text-xs text-muted-foreground">
                              {candidate.intent}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                            <span className="font-mono text-xs text-muted-foreground">
                              {candidate.signalCount} signals · {candidate.score.toFixed(2)}
                            </span>
                            {decision.status === "proposed" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => approve(decision.id, candidate.id)}
                                disabled={busyAction !== null}
                              >
                                {busyAction === `approve:${candidate.id}` ? "Choosing…" : "Choose"}
                              </Button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {decision.status === "proposed" ? (
                  <div className="mt-4 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => reject(decision.id)}
                      disabled={busyAction !== null}
                    >
                      {busyAction === `reject:${decision.id}` ? "Rejecting…" : "Reject"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => approve(decision.id)}
                      disabled={busyAction !== null}
                    >
                      {busyAction === `approve:${decision.id}` ? "Approving…" : "Approve winner"}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <span className="sr-only" aria-live="polite">
          {busyAction ? "Audience decision action in progress" : ""}
        </span>
      </div>
    </SectionPanel>
  );
}
