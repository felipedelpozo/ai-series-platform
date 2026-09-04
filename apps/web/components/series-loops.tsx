"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@ai-series/ui";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/series/${seriesId}/loops`)
      .then((r) => r.json())
      .then((d) => {
        setLoops(d.loops as Loop[]);
        setBranches(d.branches as Branch[]);
      });
    fetch(`/api/series/${seriesId}/decisions`)
      .then((r) => r.json())
      .then((d) => setDecisions((d.decisions as Decision[]).filter((x) => x.status === "approved")));
  }, [seriesId]);

  useEffect(() => {
    load();
  }, [load]);

  async function apply(decisionId: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/series/${seriesId}/loops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisionId, branchId: selectedBranch || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to apply decision");
      return;
    }
    load();
  }

  async function createBranch() {
    const res = await fetch(`/api/series/${seriesId}/branches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: branchName, baseEpisode: 1 }),
    });
    if (res.ok) load();
  }

  async function advance(loopId: string, stage: "plan" | "scenes" | "generate") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/loops/${loopId}/${stage}`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? `Failed to run ${stage}`);
      return;
    }
    load();
  }

  const approved = decisions;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground">Next-episode loop</h4>
        <div className="flex items-center gap-2">
          <input
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            className="w-28 rounded-md border bg-background px-2 py-1 text-xs"
            aria-label="Branch name"
          />
          <Button size="sm" variant="outline" onClick={createBranch}>
            New branch
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {branches.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Apply on branch:</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="rounded-md border bg-background px-2 py-1"
          >
            <option value="">Canonical</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <h5 className="text-xs font-semibold text-muted-foreground">Approved decisions</h5>
        <ul className="mt-1 flex flex-col gap-1">
          {approved.length === 0 && <li className="text-xs text-muted-foreground">None yet.</li>}
          {approved.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-md bg-muted px-2 py-1 text-xs">
              <span>
                Ep {d.episodeNumber} · {d.title ?? "Decision"}
              </span>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => apply(d.id)}>
                Apply
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h5 className="text-xs font-semibold text-muted-foreground">Decision timeline</h5>
        <ul className="mt-1 flex flex-col gap-1">
          {loops.length === 0 && <li className="text-xs text-muted-foreground">No loops yet.</li>}
          {loops.map((l) => (
            <li key={l.id} className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  Ep {l.fromEpisode} → {l.toEpisode}
                  {l.branchId ? " · branch" : " · canonical"}
                </span>
                <span className="text-muted-foreground">{l.status}</span>
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => advance(l.id, "plan")}>
                  Plan
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => advance(l.id, "scenes")}>
                  Scenes
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => advance(l.id, "generate")}>
                  Generate
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
