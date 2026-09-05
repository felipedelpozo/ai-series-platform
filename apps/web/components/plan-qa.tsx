"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button } from "@ai-series/ui";
import { CheckCircle2, LoaderCircle, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { EmptyState, InlineNotice, LoadingSkeleton, StatusBadge } from "@/components/ui";
import { studioMutation } from "@/lib/studio-mutation";

type Finding = {
  id: string;
  check: string;
  severity: string;
  evidence: string | null;
  repair: string | null;
  status: string;
};

type RunMode = "checks" | "ai";
type ResolutionStatus = "accepted" | "ignored" | "repaired";
type RetryAction =
  | { kind: "load" }
  | { kind: "run"; includeAi: boolean }
  | { kind: "resolve"; id: string; status: ResolutionStatus };

async function getResponseError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

function severityVariant(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized === "critical" || normalized === "high") return "destructive" as const;
  if (normalized === "medium" || normalized === "warning") return "warning" as const;
  return "muted" as const;
}

export function PlanQa({ planId }: { planId: string }) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<RunMode | null>(null);
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<{ message: string; retry: RetryAction } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const requestRevision = useRef(0);
  const runningRef = useRef(false);
  const resolvingIdsRef = useRef(new Set<string>());

  const load = useCallback(async () => {
    if (!planId) return;
    const revision = ++requestRevision.current;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/plans/${planId}/qa`);
      if (!response.ok) {
        throw new Error(await getResponseError(response, "QA findings could not be loaded."));
      }
      const body = (await response.json()) as { findings?: Finding[] };
      if (!Array.isArray(body.findings)) throw new Error("The QA response was not valid.");
      if (revision === requestRevision.current) setFindings(body.findings);
    } catch (loadError) {
      if (revision === requestRevision.current) {
        setError({
          message:
            loadError instanceof Error ? loadError.message : "QA findings could not be loaded.",
          retry: { kind: "load" },
        });
      }
    } finally {
      if (revision === requestRevision.current) setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    if (!planId) return;
    const timeout = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timeout);
      requestRevision.current += 1;
    };
  }, [load, planId]);

  async function run(includeAi: boolean) {
    if (!planId || runningRef.current) return;
    runningRef.current = true;
    const mode: RunMode = includeAi ? "ai" : "checks";
    setRunning(mode);
    setError(null);
    setSuccess(null);
    try {
      const response = await studioMutation("studio.qa", `/api/plans/${planId}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeAi }),
      });
      if (!response.ok)
        throw new Error(await getResponseError(response, "QA could not be completed."));
      setSuccess(
        includeAi ? "Deterministic and AI review completed." : "Deterministic checks completed.",
      );
      await load();
    } catch (runError) {
      setError({
        message: runError instanceof Error ? runError.message : "QA could not be completed.",
        retry: { kind: "run", includeAi },
      });
    } finally {
      runningRef.current = false;
      setRunning(null);
    }
  }

  async function resolve(id: string, status: ResolutionStatus) {
    if (resolvingIdsRef.current.has(id)) return;
    resolvingIdsRef.current.add(id);
    setResolvingIds(new Set(resolvingIdsRef.current));
    setError(null);
    setSuccess(null);
    try {
      const response = await studioMutation("studio.resolveQa", `/api/findings/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error(await getResponseError(response, "The finding could not be updated."));
      }
      setSuccess(`Finding marked ${status}.`);
      await load();
    } catch (resolveError) {
      setError({
        message:
          resolveError instanceof Error
            ? resolveError.message
            : "The finding could not be updated.",
        retry: { kind: "resolve", id, status },
      });
    } finally {
      resolvingIdsRef.current.delete(id);
      setResolvingIds(new Set(resolvingIdsRef.current));
    }
  }

  function retry(action: RetryAction) {
    if (action.kind === "load") void load();
    if (action.kind === "run") void run(action.includeAi);
    if (action.kind === "resolve") void resolve(action.id, action.status);
  }

  const openCount = findings.filter((finding) => finding.status === "open").length;

  return (
    <section aria-labelledby="qa-heading" className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:flex-col xl:flex-row">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 id="qa-heading" className="text-base font-semibold">
              Quality review
            </h2>
            {!loading ? (
              <Badge variant={openCount > 0 ? "warning" : "muted"}>{openCount} open</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Check the plan and record how each production issue was handled.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void run(false)}
            disabled={!planId || running !== null}
          >
            {running === "checks" ? (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <ShieldCheck aria-hidden="true" />
            )}
            {running === "checks" ? "Running…" : "Run checks"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void run(true)}
            disabled={!planId || running !== null}
          >
            {running === "ai" ? (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Sparkles aria-hidden="true" />
            )}
            {running === "ai" ? "Running…" : "Run + AI"}
          </Button>
        </div>
      </div>

      {error ? (
        <InlineNotice title="QA action failed" variant="destructive">
          <div className="flex flex-wrap items-center gap-3">
            <span>{error.message}</span>
            <Button size="sm" variant="outline" onClick={() => retry(error.retry)}>
              <RefreshCw aria-hidden="true" />
              Retry
            </Button>
          </div>
        </InlineNotice>
      ) : null}

      {success ? (
        <InlineNotice title="QA updated" variant="success">
          {success}
        </InlineNotice>
      ) : null}

      {loading && findings.length === 0 ? <LoadingSkeleton rows={3} /> : null}

      {!loading && findings.length === 0 && !error ? (
        <EmptyState
          icon={CheckCircle2}
          title="No findings recorded"
          description="Run deterministic checks, with optional AI review, to inspect this episode plan."
          compact
        />
      ) : null}

      {findings.length > 0 ? (
        <ul className="space-y-2">
          {findings.map((finding) => {
            const resolving = resolvingIds.has(finding.id);
            return (
              <li key={finding.id} className="min-w-0 rounded-lg border bg-muted/20 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 break-words text-sm font-medium">{finding.check}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={severityVariant(finding.severity)}>{finding.severity}</Badge>
                    <StatusBadge status={finding.status} />
                  </div>
                </div>
                {finding.evidence ? (
                  <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Evidence:</span>{" "}
                    {finding.evidence}
                  </p>
                ) : null}
                {finding.repair ? (
                  <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Suggested repair:</span>{" "}
                    {finding.repair}
                  </p>
                ) : null}
                {finding.status === "open" ? (
                  <div
                    className="mt-3 flex flex-wrap gap-1.5"
                    aria-label={`Resolve ${finding.check}`}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void resolve(finding.id, "accepted")}
                      disabled={resolving}
                    >
                      {resolving ? (
                        <LoaderCircle
                          className="animate-spin motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                      ) : null}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void resolve(finding.id, "ignored")}
                      disabled={resolving}
                    >
                      Ignore
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void resolve(finding.id, "repaired")}
                      disabled={resolving}
                    >
                      Mark repaired
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
