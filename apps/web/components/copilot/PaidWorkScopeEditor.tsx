"use client";

import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ai-series/ui";
import { CircleDollarSign, RefreshCw } from "lucide-react";
import { useId } from "react";
import type { CopilotQuote } from "@/lib/copilot-loader";

export type PaidOperationSelector = {
  clientRef: string;
  jobType: string;
};

export function PaidWorkScopeEditor({
  operations,
  selectedClientRef,
  quote,
  disabled,
  busy,
  onSelectorChange,
  onRequestQuote,
  onReviewQuote,
}: {
  operations: PaidOperationSelector[];
  selectedClientRef: string;
  quote?: CopilotQuote;
  disabled?: boolean;
  busy?: boolean;
  onSelectorChange: (clientRef: string) => void;
  onRequestQuote: () => void;
  onReviewQuote: () => void;
}) {
  const id = useId();
  const selected = operations.find((operation) => operation.clientRef === selectedClientRef);
  if (!selected) return null;

  return (
    <section className="mb-3 rounded-lg border bg-muted/20 p-3" aria-label="Paid-work quote">
      <h3 className="text-xs font-semibold">Paid-work quote</h3>
      <p className="mt-1 text-[0.6875rem] leading-relaxed text-muted-foreground">
        Select an approved paid operation. Provider, model, units, targets, dependency and price are
        resolved by the server and shown only after it returns the quote.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_minmax(0,2fr)]">
        <div className="space-y-1">
          <Label htmlFor={id} className="text-xs">
            Approved operation
          </Label>
          <Select value={selectedClientRef} disabled={disabled} onValueChange={onSelectorChange}>
            <SelectTrigger id={id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {operations.map((operation) => (
                <SelectItem key={operation.clientRef} value={operation.clientRef}>
                  {operation.jobType} · {operation.clientRef}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-md border bg-background px-3 py-2 text-xs">
          <dt className="text-muted-foreground">Requested job</dt>
          <dd className="break-words text-right">{selected.jobType}</dd>
          <dt className="text-muted-foreground">Proposal reference</dt>
          <dd className="break-words text-right font-mono">{selected.clientRef}</dd>
        </dl>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onRequestQuote}
          disabled={disabled || busy}
        >
          {quote ? <RefreshCw aria-hidden="true" /> : <CircleDollarSign aria-hidden="true" />}
          {busy ? "Requesting quote…" : quote ? "Request fresh quote" : "Request cost quote"}
        </Button>
        {quote ? (
          <Button
            type="button"
            onClick={onReviewQuote}
            disabled={disabled || busy || quote.expired}
          >
            Review current quote
          </Button>
        ) : null}
      </div>
    </section>
  );
}
