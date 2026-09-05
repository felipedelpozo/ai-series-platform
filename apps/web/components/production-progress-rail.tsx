import { Check } from "lucide-react";
import { cn } from "@ai-series/ui";

type StageState = "present" | "missing" | "unavailable";

type Stage = {
  label: string;
  detail: string;
  state: StageState;
};

function resolveStages({
  hasActiveBible,
  entityCount,
  planCount,
}: {
  hasActiveBible: boolean;
  entityCount: number | null;
  planCount: number | null;
}): Stage[] {
  const stages: Stage[] = [
    { label: "Series", detail: "Created", state: "present" },
    {
      label: "Bible",
      detail: hasActiveBible ? "Canon active" : "No active canon",
      state: hasActiveBible ? "present" : "missing",
    },
    {
      label: "Entities",
      detail:
        entityCount === null
          ? "Status unavailable"
          : entityCount > 0
            ? `${entityCount} defined`
            : "None defined",
      state: entityCount === null ? "unavailable" : entityCount > 0 ? "present" : "missing",
    },
    {
      label: "Episode plan",
      detail:
        planCount === null
          ? "Status unavailable"
          : planCount > 0
            ? `${planCount} active`
            : "No active plan",
      state: planCount === null ? "unavailable" : planCount > 0 ? "present" : "missing",
    },
  ];
  return stages;
}

export function ProductionSetupRail({
  hasActiveBible,
  entityCount,
  planCount,
}: {
  hasActiveBible: boolean;
  entityCount: number | null;
  planCount: number | null;
}) {
  const stages = resolveStages({ hasActiveBible, entityCount, planCount });

  return (
    <div className="overflow-x-auto pb-1" aria-label="Series setup">
      <ol className="grid min-w-[36rem] grid-cols-4" aria-label="Canonical setup status">
        {stages.map((stage, index) => {
          const present = stage.state === "present";
          return (
            <li key={stage.label} className="min-w-0">
              <div className="flex items-center">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border text-[0.6875rem] font-medium",
                    present && "border-foreground bg-foreground text-background",
                    stage.state === "missing" &&
                      "border-border bg-background text-muted-foreground",
                    stage.state === "unavailable" &&
                      "border-dashed border-muted-foreground/50 text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {present ? <Check className="size-3.5" /> : index + 1}
                </span>
                {index < stages.length - 1 ? (
                  <span
                    className={cn(
                      "h-px min-w-6 flex-1 bg-border",
                      present && stages[index + 1]?.state === "present" && "bg-foreground",
                    )}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              <div className="mt-2 pr-4">
                <p className="text-xs font-medium text-foreground">{stage.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{stage.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
