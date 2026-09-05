"use client";

import { useId } from "react";
import { Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@ai-series/ui";
import {
  AlertTriangle,
  Check,
  FileCheck2,
  FileClock,
  FileDiff,
  LoaderCircle,
  RotateCcw,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import type {
  CopilotQuote,
  CopilotReceipt,
  CopilotRevision,
  CopilotRole,
  CopilotWorkflowState,
} from "@/lib/copilot-loader";
import { InlineNotice } from "@/components/ui";
import { AppliedResourceLink } from "./AppliedResourceLink";
import { ProposalDiff } from "./ProposalDiff";
import { ProposalEditor } from "./ProposalEditor";
import { PaidWorkScopeEditor, type PaidOperationSelector } from "./PaidWorkScopeEditor";

export function ProposalReviewPane({
  revision,
  revisions = [],
  receipt,
  state,
  role,
  busyAction,
  onSaveRevision,
  onValidate,
  onDecision,
  onApply,
  paidOperations,
  selectedPaidClientRef,
  paidQuote,
  onPaidSelectorChange,
  onRequestCost,
  onReviewCost,
  onRetry,
}: {
  revision?: CopilotRevision;
  revisions?: CopilotRevision[];
  receipt?: CopilotReceipt;
  state: CopilotWorkflowState;
  role: CopilotRole;
  busyAction?: string;
  onSaveRevision: (payload: unknown) => void;
  onValidate: () => void;
  onDecision: (decision: "approve" | "reject" | "discard") => void;
  onApply: () => void;
  paidOperations: PaidOperationSelector[];
  selectedPaidClientRef?: string;
  paidQuote?: CopilotQuote;
  onPaidSelectorChange: (clientRef: string) => void;
  onRequestCost: () => void;
  onReviewCost: () => void;
  onRetry: () => void;
}) {
  const id = useId();
  const titleId = `${id}-review-title`;
  const readOnly = role === "viewer";
  const locked = state === "applying" || Boolean(busyAction);
  const valid =
    revision?.validationStatus === "valid" || revision?.validationStatus === "valid_with_warnings";
  const canApprove = Boolean(revision && valid && revision.diff.length > 0 && !revision.decision);
  const canApply = Boolean(revision?.approvalId || revision?.decision === "approved");

  return (
    <section aria-labelledby={titleId} className="flex min-h-0 min-w-0 flex-col bg-card">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-sm font-semibold">
            Draft & canonical review
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {revision
              ? `Revision ${revision.revisionNumber} · ${shortFingerprint(revision.fingerprint)}`
              : "No proposal is active"}
          </p>
        </div>
        {revision ? <ValidationBadge status={revision.validationStatus} /> : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4" data-copilot-scroll="review">
        {!revision && !receipt ? (
          <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-muted/20 p-6 text-center">
            <div className="max-w-sm">
              <FileDiff className="mx-auto size-6 text-primary" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">The review surface is ready</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Queries stay in the conversation. A requested change appears here as a structured,
                editable revision with validation and a complete diff before approval is available.
              </p>
            </div>
          </div>
        ) : null}

        {state === "continuity_conflict" && revision ? (
          <InlineNotice title="Continuity conflict" variant="destructive">
            Resolve every blocking finding or use an existing canonical exception policy before
            approval.
          </InlineNotice>
        ) : null}
        {state === "stale_draft" ? (
          <InlineNotice title="The canonical base changed" variant="warning">
            This revision cannot reuse its approval. Recalculate it against the current canon.
          </InlineNotice>
        ) : null}
        {state === "recoverable_error" ? (
          <InlineNotice title="The last operation needs attention" variant="destructive">
            The request did not confirm a new canonical result. Reconcile the persisted state before
            retrying.
          </InlineNotice>
        ) : null}

        {receipt ? <Receipt receipt={receipt} /> : null}

        {revision ? (
          <Tabs defaultValue="draft" className="mt-4 min-w-0">
            <TabsList aria-label="Proposal review sections">
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="diff">
                Diff <span className="ml-1 font-mono text-[0.625rem]">{revision.diff.length}</span>
              </TabsTrigger>
              <TabsTrigger value="findings">
                Findings{" "}
                <span className="ml-1 font-mono text-[0.625rem]">{revision.findings.length}</span>
              </TabsTrigger>
              <TabsTrigger value="revisions">History</TabsTrigger>
            </TabsList>

            <TabsContent value="draft">
              <ProposalEditor
                key={revision.id}
                revision={revision}
                disabled={readOnly || locked || isTerminal(state)}
                busy={busyAction === "revision"}
                onSave={onSaveRevision}
              />
            </TabsContent>
            <TabsContent value="diff">
              <ProposalDiff items={revision.diff} />
            </TabsContent>
            <TabsContent value="findings">
              <FindingList revision={revision} />
            </TabsContent>
            <TabsContent value="revisions">
              <RevisionHistory revisions={revisions.length ? revisions : [revision]} />
            </TabsContent>
          </Tabs>
        ) : null}
      </div>

      {revision && !readOnly && !isTerminal(state) ? (
        <footer className="border-t bg-background px-4 py-3">
          {selectedPaidClientRef && canApply ? (
            <PaidWorkScopeEditor
              operations={paidOperations}
              selectedClientRef={selectedPaidClientRef}
              quote={paidQuote}
              disabled={locked}
              busy={busyAction === "paid-quote"}
              onSelectorChange={onPaidSelectorChange}
              onRequestQuote={onRequestCost}
              onReviewQuote={onReviewCost}
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-2" aria-label="Proposal actions">
            {state === "stale_draft" || state === "recoverable_error" ? (
              <Button type="button" variant="outline" onClick={onRetry} disabled={locked}>
                <RotateCcw aria-hidden="true" />
                {state === "stale_draft" ? "Create revision on current canon" : "Reconcile status"}
              </Button>
            ) : null}
            {!valid ? (
              <Button type="button" variant="outline" onClick={onValidate} disabled={locked}>
                {busyAction === "validate" ? (
                  <LoaderCircle
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <ShieldAlert aria-hidden="true" />
                )}
                {busyAction === "validate" ? "Validating…" : "Validate revision"}
              </Button>
            ) : null}
            {canApprove ? (
              <Button type="button" onClick={() => onDecision("approve")} disabled={locked}>
                <Check aria-hidden="true" />
                {busyAction === "approve"
                  ? "Approving…"
                  : `Approve revision ${revision.revisionNumber}`}
              </Button>
            ) : null}
            {!revision.decision ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onDecision("reject")}
                  disabled={locked}
                >
                  <X aria-hidden="true" /> Reject
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onDecision("discard")}
                  disabled={locked}
                >
                  <Trash2 aria-hidden="true" /> Discard
                </Button>
              </>
            ) : null}
            {canApply ? (
              <Button type="button" onClick={onApply} disabled={locked}>
                {busyAction === "apply" ? (
                  <LoaderCircle
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <FileCheck2 aria-hidden="true" />
                )}
                {busyAction === "apply" ? "Applying…" : "Apply approved revision"}
              </Button>
            ) : null}
          </div>
          <p className="mt-2 text-[0.6875rem] leading-relaxed text-muted-foreground">
            Approval is one-use and bound to this user, workspace, revision and fingerprint. Paid
            work always needs a separate cost confirmation.
          </p>
        </footer>
      ) : null}

      {readOnly && revision ? (
        <footer className="border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          Viewer mode can inspect this history but cannot edit, approve, apply or confirm spend.
        </footer>
      ) : null}
    </section>
  );
}

function ValidationBadge({ status }: { status: CopilotRevision["validationStatus"] }) {
  const variant =
    status === "valid"
      ? "success"
      : status === "valid_with_warnings"
        ? "warning"
        : status === "invalid" || status === "stale"
          ? "destructive"
          : "muted";
  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}

function FindingList({ revision }: { revision: CopilotRevision }) {
  if (!revision.findings.length) {
    return (
      <div className="grid min-h-52 place-items-center rounded-xl border border-dashed bg-muted/20 p-6 text-center">
        <div>
          <FileCheck2 className="mx-auto size-6 text-success" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold">No validation findings</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Validate again after any revision edit.
          </p>
        </div>
      </div>
    );
  }
  return (
    <ol className="space-y-3" aria-label="Validation findings">
      {revision.findings.map((finding) => (
        <li key={finding.id} className="rounded-xl border bg-background p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`mt-0.5 size-4 shrink-0 ${finding.severity === "blocking" ? "text-destructive" : "text-warning"}`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={finding.severity === "blocking" ? "destructive" : "warning"}>
                  {finding.severity}
                </Badge>
                {finding.target ? (
                  <span className="text-xs text-muted-foreground">{finding.target}</span>
                ) : null}
                {finding.fieldPath ? (
                  <code className="text-[0.6875rem]">{finding.fieldPath}</code>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-relaxed">{finding.message}</p>
              {finding.remediation ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Suggested correction: {finding.remediation}
                </p>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function RevisionHistory({ revisions }: { revisions: CopilotRevision[] }) {
  return (
    <ol className="space-y-2" aria-label="Proposal revision history">
      {[...revisions]
        .sort((a, b) => b.revisionNumber - a.revisionNumber)
        .map((revision) => (
          <li
            key={revision.id}
            className="flex min-w-0 items-center gap-3 rounded-lg border bg-background p-3"
          >
            <FileClock className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Revision {revision.revisionNumber}</p>
              <p className="truncate font-mono text-[0.6875rem] text-muted-foreground">
                {shortFingerprint(revision.fingerprint)}
              </p>
            </div>
            <ValidationBadge status={revision.validationStatus} />
          </li>
        ))}
    </ol>
  );
}

function Receipt({ receipt }: { receipt: CopilotReceipt }) {
  const id = useId();
  const titleId = `${id}-receipt-title`;
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-xl border border-success/35 bg-success/5 p-4"
      tabIndex={-1}
    >
      <div className="flex items-start gap-3">
        <FileCheck2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="text-sm font-semibold">
            Canonical application receipt
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Receipt {receipt.id} · {formatDate(receipt.committedAt)}
          </p>
          {receipt.correlationId ? (
            <p className="mt-1 break-all font-mono text-[0.625rem] text-muted-foreground">
              Correlation {receipt.correlationId}
            </p>
          ) : null}
          {receipt.links.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {receipt.links.map((link) => (
                <AppliedResourceLink key={`${link.kind}-${link.href}`} {...link} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function shortFingerprint(value: string) {
  return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : "fingerprint pending";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "time unavailable" : date.toLocaleString();
}

function isTerminal(state: CopilotWorkflowState) {
  return state === "applied" || state === "rejected" || state === "discarded";
}
