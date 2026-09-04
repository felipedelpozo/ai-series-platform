"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@ai-series/ui";

type Health = {
  total: number;
  active: number;
  stuck: number;
  succeeded: number;
  failed: number;
  successRate: number;
  errorRate: number;
  retryRate: number;
};

type TraceJob = {
  id: string;
  kind: string;
  model: string | null;
  error: string | null;
  attempts: { attemptNumber: number; status: string; providerRequestId: string | null; error: string | null }[];
};

export default function OperationsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [durations, setDurations] = useState<{ avgDurationMs: number; maxDurationMs: number } | null>(null);
  const [byProviderModel, setByProviderModel] = useState<{ provider: string; model: string; total: number; count: number; errors: number }[]>([]);
  const [bySeries, setBySeries] = useState<{ seriesId: string; total: number }[]>([]);
  const [orphanCount, setOrphanCount] = useState(0);
  const [trace, setTrace] = useState<TraceJob[]>([]);
  const [budget, setBudget] = useState<{ totalCost: number; limitUsd: number; over: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/ops/overview")
      .then((r) => r.json())
      .then((d) => {
        setHealth(d.health);
        setDurations(d.durations);
        setByProviderModel(d.costByProviderModel);
        setBySeries(d.costBySeries);
        setOrphanCount(d.orphanCount);
      })
      .catch((e) => setError(String(e)));
    fetch("/api/ops/failures")
      .then((r) => r.json())
      .then((d) => setTrace(d.trace as TraceJob[]));
    fetch("/api/ops/budget?limitUsd=10")
      .then((r) => r.json())
      .then((d) => setBudget(d));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function reprocess(jobId: string) {
    await fetch(`/api/ops/jobs/${jobId}/reprocess`, { method: "POST" });
    load();
  }

  async function cleanup(jobId: string) {
    await fetch(`/api/ops/jobs/${jobId}/cleanup`, { method: "POST" });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Operations</h2>
        <Button variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {health && (
        <section className="rounded-lg border p-4">
          <h3 className="font-semibold">Job health</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {health.total} total · {health.active} active · {health.stuck} stuck ·{" "}
            {health.succeeded} succeeded · {health.failed} failed
          </p>
          <p className="text-sm text-muted-foreground">
            success {((health.successRate ?? 0) * 100).toFixed(0)}% · error{" "}
            {((health.errorRate ?? 0) * 100).toFixed(0)}% · retry{" "}
            {((health.retryRate ?? 0) * 100).toFixed(0)}%
            {durations ? ` · avg ${durations.avgDurationMs}ms · max ${durations.maxDurationMs}ms` : ""}
          </p>
        </section>
      )}

      {budget && (
        <section className="rounded-lg border p-4">
          <h3 className="font-semibold">Budget</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            ${budget.totalCost.toFixed(2)} / ${budget.limitUsd.toFixed(2)}{" "}
            {budget.over ? <span className="text-destructive">(over budget)</span> : "(within budget)"}
          </p>
        </section>
      )}

      <section className="rounded-lg border p-4">
        <h3 className="font-semibold">Cost by provider / model</h3>
        <ul className="mt-2 flex flex-col gap-1">
          {byProviderModel.length === 0 && <li className="text-sm text-muted-foreground">No cost records yet.</li>}
          {byProviderModel.map((row) => (
            <li key={`${row.provider}:${row.model}`} className="flex justify-between text-sm">
              <span>
                {row.provider} / {row.model} ({row.count} ops{row.errors ? `, ${row.errors} errors` : ""})
              </span>
              <span>${row.total.toFixed(3)}</span>
            </li>
          ))}
        </ul>
        <h4 className="mt-3 text-sm font-semibold text-muted-foreground">Cost by series</h4>
        <ul className="mt-1 flex flex-col gap-1">
          {bySeries.length === 0 && <li className="text-sm text-muted-foreground">None.</li>}
          {bySeries.map((row) => (
            <li key={row.seriesId} className="flex justify-between text-sm">
              <span className="truncate">{row.seriesId}</span>
              <span>${row.total.toFixed(3)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="font-semibold">Orphan outputs</h3>
        <p className="mt-1 text-sm text-muted-foreground">{orphanCount} detected</p>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="font-semibold">Failed jobs</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {trace.length === 0 && <li className="text-sm text-muted-foreground">No failed jobs.</li>}
          {trace.map((item) => (
            <li key={item.id} className="rounded-md bg-muted px-3 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span>
                  {item.kind} · {item.model ?? "unknown"}
                </span>
                <span className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => reprocess(item.id)}>
                    Reprocess
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => cleanup(item.id)}>
                    Cleanup
                  </Button>
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{item.error ?? "no error"}</p>
              {item.attempts.map((a) => (
                <p key={a.attemptNumber} className="text-muted-foreground">
                  attempt {a.attemptNumber} · {a.status} · {a.providerRequestId ?? "no request id"}
                </p>
              ))}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
