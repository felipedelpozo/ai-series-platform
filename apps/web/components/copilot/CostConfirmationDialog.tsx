"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from "@ai-series/ui";
import { CircleDollarSign, Clock3 } from "lucide-react";
import type { CopilotQuote } from "@/lib/copilot-loader";

export function CostConfirmationDialog({
  quote,
  open,
  busy,
  purpose = "paid work",
  onOpenChange,
  onConfirm,
}: {
  quote?: CopilotQuote;
  open: boolean;
  busy?: boolean;
  purpose?: "copilot inference" | "paid work";
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  if (!quote) return null;
  const expiry = quote.expiresAt ? new Date(quote.expiresAt) : null;
  const expired = quote.expired === true;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <span className="mb-2 grid size-10 place-items-center rounded-full border bg-muted text-primary">
            <CircleDollarSign className="size-5" aria-hidden="true" />
          </span>
          <AlertDialogTitle>Confirm {purpose} cost</AlertDialogTitle>
          <AlertDialogDescription>
            This confirmation is separate from editorial approval and is valid only for the exact
            scope and quote shown below.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <dl className="grid grid-cols-[minmax(7rem,auto)_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-lg border bg-muted/20 p-4 text-sm">
          <dt className="text-muted-foreground">Maximum</dt>
          <dd className="text-right font-mono font-semibold">
            {quote.amount} {quote.currency}
          </dd>
          <dt className="text-muted-foreground">Provider</dt>
          <dd className="break-words text-right">
            {quote.provider}
            {quote.model ? ` · ${quote.model}` : ""}
          </dd>
          <dt className="text-muted-foreground">Scope</dt>
          <dd className="break-words text-right">
            {quote.scope.purpose} · {quote.scope.kind}
          </dd>
          <dt className="text-muted-foreground">Targets</dt>
          <dd className="break-words text-right">
            {quote.scope.targetRefs.length ? quote.scope.targetRefs.join(", ") : "No targets"}
          </dd>
          <dt className="text-muted-foreground">Dependency</dt>
          <dd className="break-words text-right">
            {quote.scope.executionDependency === "independent"
              ? "Independent"
              : "Requires canonical application receipt"}
          </dd>
          <dt className="text-muted-foreground">Units</dt>
          <dd className="break-words text-right">{quote.units}</dd>
          <dt className="text-muted-foreground">Available quota</dt>
          <dd className="break-words text-right">{quote.availableQuota}</dd>
          <dt className="flex items-center gap-1 text-muted-foreground">
            <Clock3 className="size-3.5" aria-hidden="true" /> Valid until
          </dt>
          <dd className="break-words text-right">
            {expiry && !Number.isNaN(expiry.valueOf()) ? expiry.toLocaleString() : "Not reported"}
          </dd>
        </dl>

        {expired ? (
          <p role="status" className="text-sm font-medium text-destructive">
            This quote has expired. Request a current quote before continuing.
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button type="button" disabled={busy || expired} onClick={onConfirm}>
              {busy
                ? "Confirming…"
                : `${purpose === "copilot inference" ? "Confirm and generate" : "Confirm and start"} · up to ${quote.amount} ${quote.currency}`}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
