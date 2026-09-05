import { Badge } from "@ai-series/ui";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FileWarning,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import type { CopilotWorkflowState } from "@/lib/copilot-loader";

const presentation: Record<
  CopilotWorkflowState,
  { label: string; variant: "muted" | "warning" | "success" | "destructive"; icon: typeof Clock3 }
> = {
  collecting_context: { label: "Collecting context", variant: "muted", icon: CircleDashed },
  preparing_draft: { label: "Preparing draft", variant: "warning", icon: LoaderCircle },
  ready_for_review: { label: "Ready for review", variant: "success", icon: ShieldCheck },
  awaiting_approval: { label: "Awaiting approval", variant: "warning", icon: Clock3 },
  awaiting_application: {
    label: "Approved · ready to apply",
    variant: "success",
    icon: ShieldCheck,
  },
  applying: { label: "Applying", variant: "warning", icon: LoaderCircle },
  applied: { label: "Applied", variant: "success", icon: CheckCircle2 },
  needs_information: { label: "Needs information", variant: "warning", icon: FileWarning },
  continuity_conflict: {
    label: "Continuity conflict",
    variant: "destructive",
    icon: AlertTriangle,
  },
  stale_draft: { label: "Stale draft", variant: "destructive", icon: FileWarning },
  recoverable_error: { label: "Recoverable error", variant: "destructive", icon: AlertTriangle },
  rejected: { label: "Rejected", variant: "destructive", icon: FileWarning },
  discarded: { label: "Discarded", variant: "muted", icon: FileWarning },
};

export function WorkflowStatus({
  state,
  cause,
  nextAction,
}: {
  state: CopilotWorkflowState;
  cause?: string;
  nextAction?: string;
}) {
  const item = presentation[state];
  const Icon = item.icon;
  const isBusy = state === "preparing_draft" || state === "applying";

  return (
    <div
      className="flex min-w-0 flex-col gap-2 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon
          className={`size-4 shrink-0 ${isBusy ? "animate-spin motion-reduce:animate-none" : ""}`}
          aria-hidden="true"
        />
        <Badge variant={item.variant}>{item.label}</Badge>
        {cause ? <span className="truncate text-xs text-muted-foreground">{cause}</span> : null}
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Next:</span>{" "}
        {nextAction ?? "Continue the conversation."}
      </p>
    </div>
  );
}
