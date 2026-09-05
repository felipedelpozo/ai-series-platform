"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ai-series/ui";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  EmptyState,
  InlineNotice,
  LoadingSkeleton,
  PageHeader,
  SectionPanel,
  StatusBadge,
} from "@/components/ui";
import { studioMutation } from "@/lib/studio-mutation";

interface Health {
  total: number;
  active: number;
  stuck: number;
  succeeded: number;
  failed: number;
  cancelled?: number;
  successRate: number;
  errorRate: number;
  retryRate: number;
}

interface DurationStats {
  attemptsWithDuration?: number;
  avgDurationMs: number;
  maxDurationMs: number;
}

interface ProviderCost {
  provider: string;
  model: string;
  total: number;
  count: number;
  errors: number;
}

interface SeriesCost {
  seriesId: string;
  total: number;
}

interface OverviewResponse {
  health: Health;
  durations: DurationStats;
  costByProviderModel: ProviderCost[];
  costBySeries: SeriesCost[];
  orphanCount: number;
}

interface FailedJob {
  id: string;
  kind: string;
  model: string | null;
  error: string | null;
}

interface JobAttempt {
  attemptNumber: number;
  status: string;
  providerRequestId: string | null;
  error: string | null;
}

interface FailedJobTrace {
  job: FailedJob;
  attempts: JobAttempt[];
}

interface FailuresResponse {
  trace: FailedJobTrace[];
}

interface BudgetResponse {
  totalCost: number;
  limitUsd: number;
  over: boolean;
}

type OperationsSection = "overview" | "failures" | "budget";
type JobAction = "reprocess" | "cleanup";

const sectionLabels: Record<OperationsSection, string> = {
  overview: "health and cost",
  failures: "failed jobs",
  budget: "budget",
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

function formatPercent(value: number): string {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1_000) return `${milliseconds} ms`;
  if (milliseconds < 60_000) return `${(milliseconds / 1_000).toFixed(1)} s`;
  return `${(milliseconds / 60_000).toFixed(1)} min`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

async function requestJson<T>(url: string, signal: AbortSignal, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal });
  const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;

  if (!response.ok) {
    const message =
      typeof payload?.error === "string" ? payload.error : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export default function OperationsPage() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [trace, setTrace] = useState<FailedJobTrace[] | null>(null);
  const [budget, setBudget] = useState<BudgetResponse | null>(null);
  const [loadErrors, setLoadErrors] = useState<Partial<Record<OperationsSection, string>>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingActions, setPendingActions] = useState<Record<string, JobAction>>({});
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [announcement, setAnnouncement] = useState("");
  const loadControllerRef = useRef<AbortController | null>(null);
  const actionControllersRef = useRef(new Map<string, AbortController>());
  const isMountedRef = useRef(false);

  const load = useCallback(async (successAnnouncement = "Operations data refreshed.") => {
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;
    setIsRefreshing(true);
    setLoadErrors({});

    const [overviewResult, failuresResult, budgetResult] = await Promise.allSettled([
      requestJson<OverviewResponse>("/api/ops/overview", controller.signal),
      requestJson<FailuresResponse>("/api/ops/failures", controller.signal),
      requestJson<BudgetResponse>("/api/ops/budget?limitUsd=10", controller.signal),
    ]);

    if (controller.signal.aborted || loadControllerRef.current !== controller) return;

    const nextErrors: Partial<Record<OperationsSection, string>> = {};
    if (overviewResult.status === "fulfilled") setOverview(overviewResult.value);
    else nextErrors.overview = getErrorMessage(overviewResult.reason);

    if (failuresResult.status === "fulfilled") setTrace(failuresResult.value.trace);
    else nextErrors.failures = getErrorMessage(failuresResult.reason);

    if (budgetResult.status === "fulfilled") setBudget(budgetResult.value);
    else nextErrors.budget = getErrorMessage(budgetResult.reason);

    setLoadErrors(nextErrors);
    setIsRefreshing(false);
    const failedSections = Object.keys(nextErrors) as OperationsSection[];
    setAnnouncement(
      failedSections.length > 0
        ? `Refresh incomplete. Could not load ${failedSections.map((section) => sectionLabels[section]).join(", ")}.`
        : successAnnouncement,
    );
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const actionControllers = actionControllersRef.current;
    const initialLoad = window.setTimeout(() => void load("Operations data loaded."), 0);
    return () => {
      window.clearTimeout(initialLoad);
      isMountedRef.current = false;
      loadControllerRef.current?.abort();
      actionControllers.forEach((controller) => controller.abort());
      actionControllers.clear();
    };
  }, [load]);

  async function runJobAction(action: JobAction, jobId: string) {
    if (actionControllersRef.current.has(jobId)) return;

    const controller = new AbortController();
    actionControllersRef.current.set(jobId, controller);
    setPendingActions((current) => ({ ...current, [jobId]: action }));
    setActionErrors((current) => {
      const next = { ...current };
      delete next[jobId];
      return next;
    });

    try {
      const response = await studioMutation(
        `ops.${action}` as "ops.reprocess" | "ops.cleanup",
        `/api/ops/jobs/${jobId}/${action}`,
        { method: "POST", signal: controller.signal },
      );
      const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
      if (!response.ok) {
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : `Request failed (${response.status})`,
        );
      }
      if (!isMountedRef.current || controller.signal.aborted) return;
      await load(action === "reprocess" ? "Job queued for reprocessing." : "Job cleaned up.");
    } catch (error) {
      if (controller.signal.aborted || !isMountedRef.current) return;
      const message = getErrorMessage(error);
      setActionErrors((current) => ({ ...current, [jobId]: message }));
      setAnnouncement(`${action === "reprocess" ? "Reprocess" : "Cleanup"} failed: ${message}`);
    } finally {
      actionControllersRef.current.delete(jobId);
      if (isMountedRef.current) {
        setPendingActions((current) => {
          const next = { ...current };
          delete next[jobId];
          return next;
        });
      }
    }
  }

  const health = overview?.health ?? null;
  const durations = overview?.durations ?? null;
  const budgetUsage =
    budget && budget.limitUsd > 0 ? Math.min((budget.totalCost / budget.limitUsd) * 100, 100) : 0;
  const hasLoadErrors = Object.keys(loadErrors).length > 0;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader
        eyebrow="Production control"
        title="Operations"
        description="Monitor production health, budget exposure, failures, and the traces needed to recover safely."
        actions={
          <Button
            variant="outline"
            onClick={() => void load()}
            disabled={isRefreshing}
            aria-busy={isRefreshing}
          >
            <RefreshCw
              className={isRefreshing ? "animate-spin motion-reduce:animate-none" : ""}
              aria-hidden="true"
            />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </Button>
        }
      />

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {hasLoadErrors ? (
        <InlineNotice title="Some operational data could not be refreshed" variant="destructive">
          <div className="flex flex-col items-start gap-3">
            <ul className="list-disc space-y-1 pl-4">
              {(Object.entries(loadErrors) as [OperationsSection, string][]).map(
                ([section, message]) => (
                  <li key={section} className="break-words">
                    <span className="font-medium capitalize">{sectionLabels[section]}:</span>{" "}
                    {message}
                  </li>
                ),
              )}
            </ul>
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={isRefreshing}>
              Try refresh again
            </Button>
          </div>
        </InlineNotice>
      ) : null}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
        <SectionPanel
          title="Job health"
          description="Live workload, terminal outcomes, retries, and processing latency."
          actions={
            health ? (
              <StatusBadge
                status={
                  health.stuck > 0 || health.failed > 0
                    ? "failed"
                    : health.active > 0
                      ? "running"
                      : "ready"
                }
              />
            ) : undefined
          }
        >
          {!health && isRefreshing ? <LoadingSkeleton rows={2} /> : null}
          {!health && !isRefreshing && loadErrors.overview ? (
            <InlineNotice title="Health data is unavailable" variant="destructive">
              Refresh to retry the health and cost overview.
            </InlineNotice>
          ) : null}
          {health?.total === 0 ? (
            <EmptyState
              compact
              icon={Activity}
              title="No production jobs yet"
              description="Health metrics will appear after the first production job is queued."
            />
          ) : null}
          {health && health.total > 0 ? (
            <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(11rem,0.7fr)_minmax(0,1.3fr)] lg:items-center">
              <div className="border-b pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5">
                <p className="text-sm font-medium text-muted-foreground">Success rate</p>
                <p className="mt-2 font-mono text-4xl font-semibold tracking-tight tabular-nums">
                  {formatPercent(health.successRate)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {health.succeeded} of {health.succeeded + health.failed} terminal jobs succeeded.
                </p>
              </div>
              <dl className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
                {[
                  ["Active", health.active],
                  ["Stuck", health.stuck],
                  ["Succeeded", health.succeeded],
                  ["Failed", health.failed],
                  ["Cancelled", health.cancelled ?? 0],
                  ["Total jobs", health.total],
                  ["Error rate", formatPercent(health.errorRate)],
                  ["Retry rate", formatPercent(health.retryRate)],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 font-mono text-base font-semibold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              {durations ? (
                <div className="flex min-w-0 flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-sm text-muted-foreground lg:col-span-2">
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="size-4" aria-hidden="true" /> Average attempt{" "}
                    {formatDuration(durations.avgDurationMs)}
                  </span>
                  <span>Maximum {formatDuration(durations.maxDurationMs)}</span>
                  {typeof durations.attemptsWithDuration === "number" ? (
                    <span>{durations.attemptsWithDuration} measured attempts</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </SectionPanel>

        <SectionPanel
          title="Budget"
          description="Actual recorded cost against the current USD 10 limit."
          actions={budget ? <StatusBadge status={budget.over ? "blocked" : "ready"} /> : undefined}
        >
          {!budget && isRefreshing ? <LoadingSkeleton rows={2} /> : null}
          {!budget && !isRefreshing && loadErrors.budget ? (
            <InlineNotice title="Budget data is unavailable" variant="destructive">
              Refresh to retry the budget check.
            </InlineNotice>
          ) : null}
          {budget ? (
            <div className="space-y-5">
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
                    {usd.format(budget.totalCost)}
                  </p>
                  <p className="text-sm text-muted-foreground">of {usd.format(budget.limitUsd)}</p>
                </div>
                <div
                  className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label="Budget used"
                  aria-valuemin={0}
                  aria-valuemax={budget.limitUsd}
                  aria-valuenow={Math.min(budget.totalCost, budget.limitUsd)}
                >
                  <div
                    className={`h-full rounded-full ${budget.over ? "bg-destructive" : "bg-primary"}`}
                    style={{ width: `${budgetUsage}%` }}
                  />
                </div>
              </div>
              {budget.over ? (
                <InlineNotice title="Budget limit exceeded" variant="destructive">
                  Recorded costs are {usd.format(budget.totalCost - budget.limitUsd)} over the
                  limit. Review cost attribution before starting more paid work.
                </InlineNotice>
              ) : budget.totalCost === 0 ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  No actual production cost has been recorded yet.
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {usd.format(Math.max(budget.limitUsd - budget.totalCost, 0))} remains before the
                  current limit.
                </p>
              )}
            </div>
          ) : null}
        </SectionPanel>
      </div>

      <SectionPanel
        title="Failed jobs"
        description="Newest failures first, with provider trace and recovery controls kept beside each job."
        actions={
          trace && trace.length > 0 ? (
            <StatusBadge status="failed" />
          ) : trace ? (
            <StatusBadge status="ready" />
          ) : undefined
        }
      >
        {!trace && isRefreshing ? <LoadingSkeleton rows={3} /> : null}
        {!trace && !isRefreshing && loadErrors.failures ? (
          <InlineNotice title="Failure traces are unavailable" variant="destructive">
            Refresh to retry the failed-job trace request.
          </InlineNotice>
        ) : null}
        {trace?.length === 0 ? (
          <EmptyState
            compact
            icon={CheckCircle2}
            title="No failed jobs"
            description="The failure queue is clear. New failures will appear here with their attempt history."
          />
        ) : null}
        {trace && trace.length > 0 ? (
          <ol className="space-y-4">
            {trace.map(({ job, attempts }) => {
              const pendingAction = pendingActions[job.id];
              const isReprocessing = pendingAction === "reprocess";
              const isCleaning = pendingAction === "cleanup";

              return (
                <li key={job.id} className="min-w-0 rounded-lg border bg-card p-4 sm:p-5">
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <StatusBadge status="failed" />
                        <h3 className="font-semibold">{job.kind}</h3>
                        <span className="text-sm text-muted-foreground">
                          {job.model ?? "Unknown model"}
                        </span>
                      </div>
                      <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                        Job {job.id}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => void runJobAction("reprocess", job.id)}
                        disabled={Boolean(pendingAction)}
                        aria-busy={isReprocessing}
                      >
                        <RotateCcw
                          className={
                            isReprocessing ? "animate-spin motion-reduce:animate-none" : ""
                          }
                          aria-hidden="true"
                        />
                        {isReprocessing ? "Reprocessing…" : "Reprocess"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={Boolean(pendingAction)}
                            aria-busy={isCleaning}
                          >
                            <Trash2 aria-hidden="true" />
                            {isCleaning ? "Cleaning up…" : "Cleanup"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Clean up this job?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This requests cleanup for job {job.id}. The operation cannot be undone
                              and may be rejected if the job is no longer eligible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep job</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void runJobAction("cleanup", job.id)}>
                              Clean up job
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="mt-4 border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-sm">
                    <p className="flex items-start gap-2 break-words text-destructive">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <span>{job.error ?? "No error message was recorded for this job."}</span>
                    </p>
                  </div>

                  {actionErrors[job.id] ? (
                    <div className="mt-3">
                      <InlineNotice title="Job action failed" variant="destructive">
                        {actionErrors[job.id]}
                      </InlineNotice>
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <h4 className="text-sm font-medium">Attempt trace</h4>
                    {attempts.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        No attempts were recorded.
                      </p>
                    ) : (
                      <ol className="mt-2 divide-y border-y">
                        {attempts.map((attempt) => (
                          <li
                            key={attempt.attemptNumber}
                            className="grid min-w-0 gap-2 px-3 py-3 text-sm sm:grid-cols-[auto_auto_minmax(0,1fr)] sm:items-start"
                          >
                            <span className="font-medium">Attempt {attempt.attemptNumber}</span>
                            <StatusBadge status={attempt.status} />
                            <div className="min-w-0 text-muted-foreground sm:text-right">
                              <p className="break-all font-mono text-xs">
                                {attempt.providerRequestId ?? "No provider request ID"}
                              </p>
                              {attempt.error ? (
                                <p className="mt-1 break-words text-destructive">{attempt.error}</p>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : null}
      </SectionPanel>

      <SectionPanel
        title="Cost attribution"
        description="Actual cost records grouped by provider/model and by series."
      >
        {!overview && isRefreshing ? <LoadingSkeleton rows={3} /> : null}
        {!overview && !isRefreshing && loadErrors.overview ? (
          <InlineNotice title="Cost attribution is unavailable" variant="destructive">
            Refresh to retry the health and cost overview.
          </InlineNotice>
        ) : null}
        {overview ? (
          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <div className="min-w-0">
              <h3 className="mb-3 text-sm font-semibold">Provider and model</h3>
              {overview.costByProviderModel.length === 0 ? (
                <EmptyState
                  compact
                  icon={CircleDollarSign}
                  title="No provider costs"
                  description="Actual provider cost records will appear after a billed operation completes."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider / model</TableHead>
                      <TableHead className="text-right">Operations</TableHead>
                      <TableHead className="text-right">Errors</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.costByProviderModel.map((row) => (
                      <TableRow key={`${row.provider}:${row.model}`}>
                        <TableCell className="max-w-64 break-words font-medium">
                          {row.provider} / {row.model}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${row.errors > 0 ? "text-destructive" : "text-muted-foreground"}`}
                        >
                          {row.errors}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {usd.format(row.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="min-w-0">
              <h3 className="mb-3 text-sm font-semibold">Series</h3>
              {overview.costBySeries.length === 0 ? (
                <EmptyState
                  compact
                  icon={CircleDollarSign}
                  title="No series costs"
                  description="Costs will be attributed here when an operation is linked to a series."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Series ID</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.costBySeries.map((row) => (
                      <TableRow key={row.seriesId}>
                        <TableCell className="max-w-80 break-all font-mono text-xs">
                          {row.seriesId}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {usd.format(row.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        ) : null}
      </SectionPanel>

      <SectionPanel
        title="Output integrity"
        description="Outputs without a matching generation record require investigation."
      >
        {!overview && isRefreshing ? <LoadingSkeleton rows={1} /> : null}
        {overview ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-3xl font-semibold tabular-nums">
                {overview.orphanCount}
              </p>
              <p className="text-sm text-muted-foreground">orphan outputs detected</p>
            </div>
            <StatusBadge status={overview.orphanCount > 0 ? "blocked" : "ready"} />
          </div>
        ) : null}
      </SectionPanel>
    </div>
  );
}
