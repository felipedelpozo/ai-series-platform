"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ai-series/ui";
import { GenerationLab } from "@/components/generation-lab";
import {
  EmptyState,
  InlineNotice,
  LoadingSkeleton,
  PageHeader,
  SectionPanel,
  StatusBadge,
} from "@/components/ui";

type Job = {
  id: string;
  kind: string;
  status: string;
  model: string | null;
  attemptCount: number;
  maxAttempts: number;
  error: string | null;
  providerRequestId: string | null;
  createdAt: string;
  updatedAt: string;
};

type Attempt = {
  id: string;
  attemptNumber: number;
  status: string;
  providerRequestId: string | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
};

type Event = { id: string; type: string; createdAt: string };

type JobDetail = {
  job: Job;
  attempts: Attempt[];
  events: Event[];
};

const JOB_STATUSES = ["queued", "running", "succeeded", "failed", "cancelled"];

function compactId(id: string) {
  return `${id.slice(0, 8)}\u2026`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export default function GenerationsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const listRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const detailControllerRef = useRef<AbortController | null>(null);

  const loadJobs = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = ++listRequestRef.current;
      const params = new URLSearchParams();
      if (kind !== "all") params.set("kind", kind);
      if (status !== "all") params.set("status", status);

      setListLoading(true);
      setListError(null);
      try {
        const response = await fetch(`/api/generations?${params.toString()}`, { signal });
        if (!response.ok) {
          throw new Error(await errorMessage(response, "Could not load generation jobs."));
        }
        const data = (await response.json()) as { jobs?: Job[] };
        if (requestId === listRequestRef.current) {
          setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (requestId === listRequestRef.current) {
          setListError(error instanceof Error ? error.message : "Could not load generation jobs.");
        }
      } finally {
        if (requestId === listRequestRef.current) setListLoading(false);
      }
    },
    [kind, status],
  );

  useEffect(() => {
    const controller = new AbortController();
    const start = setTimeout(() => void loadJobs(controller.signal), 0);
    return () => {
      clearTimeout(start);
      controller.abort();
    };
  }, [loadJobs]);

  useEffect(() => () => detailControllerRef.current?.abort(), []);

  async function open(id: string) {
    const requestId = ++detailRequestRef.current;
    detailControllerRef.current?.abort();
    const controller = new AbortController();
    detailControllerRef.current = controller;
    setSelectedId(id);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const response = await fetch(`/api/generations/${id}`, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(await errorMessage(response, "Could not load this job."));
      }
      const data = (await response.json()) as JobDetail;
      if (requestId === detailRequestRef.current) setDetail(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (requestId === detailRequestRef.current) {
        setDetailError(error instanceof Error ? error.message : "Could not load this job.");
      }
    } finally {
      if (requestId === detailRequestRef.current) setDetailLoading(false);
    }
  }

  const filtered = kind !== "all" || status !== "all";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        eyebrow="Production desk / Generations"
        title="Generation lab"
        description="Start a real image or video job, then follow every attempt and provider event from one production surface."
      />

      <GenerationLab onJobChange={() => void loadJobs()} />

      <SectionPanel
        title="Job history"
        description="Filter the queue, select a job and inspect its immutable execution trail."
      >
        <div className="mb-5 grid gap-4 border-b pb-5 sm:grid-cols-2 lg:max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="generation-kind-filter">Output type</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger id="generation-kind-filter" aria-label="Filter by output type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All output types</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="generation-status-filter">Job status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="generation-status-filter" aria-label="Filter by job status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {JOB_STATUSES.map((jobStatus) => (
                  <SelectItem key={jobStatus} value={jobStatus}>
                    {jobStatus[0].toUpperCase() + jobStatus.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {listError ? (
          <div className="mb-5">
            <InlineNotice title="Generation history is unavailable" variant="destructive">
              <div className="flex flex-wrap items-center gap-3">
                <span>{listError}</span>
                <Button size="sm" variant="outline" onClick={() => void loadJobs()}>
                  Retry
                </Button>
              </div>
            </InlineNotice>
          </div>
        ) : null}

        <p className="sr-only" aria-live="polite">
          {listLoading
            ? "Loading generation jobs"
            : `${jobs.length} generation ${jobs.length === 1 ? "job" : "jobs"} shown`}
        </p>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
          <div className="min-w-0">
            {listLoading && jobs.length === 0 ? <LoadingSkeleton rows={4} /> : null}

            {!listLoading && !listError && jobs.length === 0 ? (
              <EmptyState
                compact
                title={filtered ? "No jobs match these filters" : "No generation jobs yet"}
                description={
                  filtered
                    ? "Change one or both filters to return to the full production history."
                    : "Configure the lab above and start a generation to create the first tracked job."
                }
                action={
                  filtered ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setKind("all");
                        setStatus("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            ) : null}

            {jobs.length > 0 ? (
              <ul className="space-y-2" aria-label="Generation jobs">
                {jobs.map((job) => {
                  const selected = selectedId === job.id;
                  return (
                    <li key={job.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => void open(job.id)}
                        className="group flex min-h-20 w-full min-w-0 flex-col gap-3 rounded-lg border bg-card px-4 py-3 text-left outline-none transition-colors hover:border-foreground/20 hover:bg-muted/35 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 data-[selected=true]:border-primary/50 data-[selected=true]:bg-primary/5 sm:flex-row sm:items-center sm:justify-between"
                        data-selected={selected}
                      >
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium capitalize">{job.kind}</span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {compactId(job.id)}
                            </span>
                          </span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            {job.model ?? "Model assigned when processing"} ·{" "}
                            {formatDate(job.createdAt)}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="font-mono text-xs text-muted-foreground">
                            {job.attemptCount}/{job.maxAttempts} attempts
                          </span>
                          <StatusBadge status={job.status} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <aside
            className="min-w-0 xl:sticky xl:top-4 xl:self-start"
            aria-label="Selected job detail"
          >
            {detailLoading ? <LoadingSkeleton rows={2} /> : null}

            {!detailLoading && detailError ? (
              <InlineNotice title="Job detail is unavailable" variant="destructive">
                <div className="flex flex-wrap items-center gap-3">
                  <span>{detailError}</span>
                  {selectedId ? (
                    <Button size="sm" variant="outline" onClick={() => void open(selectedId)}>
                      Retry
                    </Button>
                  ) : null}
                </div>
              </InlineNotice>
            ) : null}

            {!detailLoading && !detailError && !detail ? (
              <EmptyState
                compact
                title="Select a generation job"
                description="Its attempts, provider reference and state events will appear here."
              />
            ) : null}

            {!detailLoading && detail ? (
              <div className="overflow-hidden rounded-lg border bg-card">
                <div className="border-b bg-muted/20 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Selected job</p>
                      <h3 className="mt-1 truncate text-base font-semibold capitalize">
                        {detail.job.kind} · {compactId(detail.job.id)}
                      </h3>
                    </div>
                    <StatusBadge status={detail.job.status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs">
                    <dt className="text-muted-foreground">Model</dt>
                    <dd className="truncate text-right">{detail.job.model ?? "Not assigned"}</dd>
                    <dt className="text-muted-foreground">Attempts</dt>
                    <dd className="text-right">
                      {detail.job.attemptCount} of {detail.job.maxAttempts}
                    </dd>
                    <dt className="text-muted-foreground">Provider request</dt>
                    <dd className="truncate text-right font-mono">
                      {detail.job.providerRequestId ?? "Not assigned"}
                    </dd>
                    <dt className="text-muted-foreground">Updated</dt>
                    <dd className="text-right">{formatDate(detail.job.updatedAt)}</dd>
                  </dl>
                  {detail.job.error ? (
                    <p className="mt-4 break-words rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                      {detail.job.error}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-6 p-5">
                  <section aria-labelledby="attempts-heading">
                    <h4 id="attempts-heading" className="text-sm font-semibold">
                      Attempts
                    </h4>
                    {detail.attempts.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        No attempt has started. The job is waiting in the queue.
                      </p>
                    ) : (
                      <ol className="mt-3 space-y-0 border-l border-border pl-4">
                        {detail.attempts.map((attempt) => (
                          <li key={attempt.id} className="relative pb-4 last:pb-0">
                            <span
                              className="absolute -left-[1.21rem] top-1.5 size-2 rounded-full border border-background bg-primary"
                              aria-hidden="true"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-medium">
                                Attempt {attempt.attemptNumber}
                              </span>
                              <StatusBadge status={attempt.status} />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {attempt.durationMs != null
                                ? `${attempt.durationMs.toLocaleString()} ms`
                                : attempt.finishedAt
                                  ? `Finished ${formatDate(attempt.finishedAt)}`
                                  : `Started ${formatDate(attempt.startedAt)}`}
                            </p>
                            {attempt.providerRequestId ? (
                              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                                {attempt.providerRequestId}
                              </p>
                            ) : null}
                            {attempt.error ? (
                              <p className="mt-2 break-words text-xs text-destructive">
                                {attempt.error}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>

                  <section aria-labelledby="events-heading">
                    <h4 id="events-heading" className="text-sm font-semibold">
                      State events
                    </h4>
                    {detail.events.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        No state events recorded yet.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {detail.events.map((event) => (
                          <li
                            key={event.id}
                            className="flex min-w-0 items-baseline justify-between gap-4 text-xs"
                          >
                            <span className="truncate font-medium capitalize">
                              {event.type.replaceAll("_", " ")}
                            </span>
                            <time
                              className="shrink-0 text-muted-foreground"
                              dateTime={event.createdAt}
                            >
                              {formatDate(event.createdAt)}
                            </time>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </SectionPanel>
    </div>
  );
}
