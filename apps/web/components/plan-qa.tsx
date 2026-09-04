"use client";

import { useEffect, useState } from "react";
import { Button } from "@ai-series/ui";

type Finding = {
  id: string;
  check: string;
  severity: string;
  evidence: string | null;
  repair: string | null;
  status: string;
};

export function PlanQa({ planId }: { planId: string }) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch(`/api/plans/${planId}/qa`)
      .then((r) => r.json())
      .then((d) => setFindings(d.findings as Finding[]));
  }

  useEffect(() => {
    load();
  }, [planId]);

  async function run(includeAi: boolean) {
    setBusy(true);
    await fetch(`/api/plans/${planId}/qa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includeAi }),
    });
    setBusy(false);
    load();
  }

  async function resolve(id: string, status: string) {
    await fetch(`/api/findings/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold text-muted-foreground">QA</h4>
        <Button size="sm" variant="outline" onClick={() => run(false)} disabled={busy}>
          Run checks
        </Button>
        <Button size="sm" variant="outline" onClick={() => run(true)} disabled={busy}>
          Run + AI
        </Button>
      </div>
      <ul className="flex flex-col gap-1">
        {findings.map((f) => (
          <li key={f.id} className="rounded-md bg-muted px-2 py-1 text-xs">
            <span className="font-medium">
              [{f.severity}] {f.check}
            </span>{" "}
            <span className="text-muted-foreground">
              {f.evidence} · {f.status}
            </span>
            {f.status === "open" && (
              <span className="ml-2">
                <button onClick={() => resolve(f.id, "accepted")} className="underline">
                  accept
                </button>{" "}
                <button onClick={() => resolve(f.id, "ignored")} className="underline">
                  ignore
                </button>{" "}
                <button onClick={() => resolve(f.id, "repaired")} className="underline">
                  repaired
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
