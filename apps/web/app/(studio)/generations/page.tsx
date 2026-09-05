"use client";

import { useEffect, useState } from "react";
import { GenerationLab } from "@/components/generation-lab";

type Job = {
  id: string;
  kind: string;
  status: string;
  model: string | null;
  attemptCount: number;
  maxAttempts: number;
  error: string | null;
};

type Attempt = {
  id: string;
  attemptNumber: number;
  status: string;
  providerRequestId: string | null;
  error: string | null;
};

type Event = { id: string; type: string; createdAt: string };

export default function GenerationsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState<{ attempts: Attempt[]; events: Event[] } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (kind) params.set("kind", kind);
    if (status) params.set("status", status);
    fetch(`/api/generations?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs as Job[]));
  }, [kind, status]);

  async function open(id: string) {
    const res = await fetch(`/api/generations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setDetail({ attempts: data.attempts, events: data.events });
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Generations</h2>
        <div className="flex gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="">All types</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="">All statuses</option>
            {["queued", "running", "succeeded", "failed", "cancelled"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <GenerationLab />

      <div className="grid grid-cols-[1fr_360px] gap-4">
        <ul className="flex flex-col gap-1">
          {jobs.length === 0 && (
            <li className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No jobs yet.
            </li>
          )}
          {jobs.map((job) => (
            <li key={job.id}>
              <button
                onClick={() => open(job.id)}
                className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span>
                  {job.kind} · {job.model ?? "—"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {job.status} · {job.attemptCount}/{job.maxAttempts}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border p-4 text-sm">
          {!detail && (
            <p className="text-sm text-muted-foreground">Select a job to view attempts.</p>
          )}
          {detail && (
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Attempts</h3>
              {detail.attempts.length === 0 && <p className="text-xs">None yet.</p>}
              <ul className="flex flex-col gap-1">
                {detail.attempts.map((a) => (
                  <li key={a.id} className="rounded-md bg-muted px-2 py-1 text-xs">
                    #{a.attemptNumber} {a.status}
                    {a.providerRequestId ? ` · ${a.providerRequestId.slice(0, 8)}` : ""}
                    {a.error ? ` · ${a.error}` : ""}
                  </li>
                ))}
              </ul>
              <h3 className="mt-2 font-semibold">Events</h3>
              <ul className="flex flex-col gap-1">
                {detail.events.map((e) => (
                  <li key={e.id} className="text-xs text-muted-foreground">
                    {e.type}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
