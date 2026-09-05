"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@ai-series/ui";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/series/${seriesId}/decisions`)
      .then((r) => r.json())
      .then((d) => {
        setDecisions(d.decisions as Decision[]);
        for (const decision of d.decisions as Decision[]) {
          fetch(`/api/decisions/${decision.id}`)
            .then((r) => r.json())
            .then((detail) => setCandidates((prev) => ({ ...prev, [decision.id]: detail.candidates ?? [] })));
        }
      });
  }, [seriesId]);

  useEffect(() => {
    load();
  }, [load]);

  async function propose() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/series/${seriesId}/decisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episodeNumber: episode }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to propose decision");
      return;
    }
    load();
  }

  async function approve(decisionId: string, candidateId?: string) {
    await fetch(`/api/decisions/${decisionId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(candidateId ? { candidateId } : {}),
    });
    load();
  }

  async function reject(decisionId: string) {
    await fetch(`/api/decisions/${decisionId}/reject`, { method: "POST" });
    load();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold text-muted-foreground">Audience decisions</h4>
        <input
          type="number"
          min={1}
          value={episode}
          onChange={(e) => setEpisode(Number(e.target.value))}
          className="w-16 rounded-md border bg-background px-2 py-1 text-sm"
          aria-label="Episode number"
        />
        <Button size="sm" variant="outline" onClick={propose} disabled={busy}>
          Propose decision
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {decisions.length === 0 && (
        <p className="text-xs text-muted-foreground">No decisions yet.</p>
      )}
      <ul className="flex flex-col gap-2">
        {decisions.map((d) => (
          <li key={d.id} className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                Ep {d.episodeNumber} · {d.title ?? "Decision"}
              </span>
              <span className="text-muted-foreground">
                {d.status} · conf {(d.confidence * 100).toFixed(0)}%
              </span>
            </div>
            {d.rationale && <p className="mt-1 text-muted-foreground">{d.rationale}</p>}
            <ul className="mt-2 flex flex-col gap-1">
              {(candidates[d.id] ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between">
                  <span>
                    {c.isWinner ? "★ " : ""}
                    {c.label} <span className="text-muted-foreground">({c.intent})</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {c.signalCount} · {c.score.toFixed(2)}
                    </span>
                    {d.status === "proposed" && (
                      <Button size="sm" variant="outline" onClick={() => approve(d.id, c.id)}>
                        Choose
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {d.status === "proposed" && (
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => approve(d.id)}>
                  Approve winner
                </Button>
                <Button size="sm" variant="outline" onClick={() => reject(d.id)}>
                  Reject
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
