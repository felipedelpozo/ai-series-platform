"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@ai-series/ui";
import { MessageSquarePlus, RefreshCw } from "lucide-react";
import { InlineNotice, LoadingSkeleton, PageHeader } from "@/components/ui";
import {
  CopilotRequestError,
  conversationValue,
  copilotRequest,
  loadConversation,
  loadCopilotBootstrap,
  loadCopilotEpisodeResources,
  loadCopilotSeriesContextOptions,
  quoteValue,
  type CopilotBootstrap,
  type CopilotContext,
  type CopilotConversation,
  type CopilotEpisodeOption,
  type CopilotQuote,
  type CopilotResourceOption,
} from "@/lib/copilot-loader";
import { ContextSelector } from "./ContextSelector";
import { ConversationPane } from "./ConversationPane";
import { CostConfirmationDialog } from "./CostConfirmationDialog";
import { ProposalReviewPane } from "./ProposalReviewPane";
import { WorkflowStatus } from "./WorkflowStatus";

type DialogKind = "inference" | "paid" | null;

export function CopilotWorkspace() {
  const storedContext = useRef(readContextSelection()).current;
  const [bootstrap, setBootstrap] = useState<CopilotBootstrap>();
  const [conversation, setConversation] = useState<CopilotConversation>();
  const [draft, setDraft] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(storedContext?.workspaceId ?? "");
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | undefined>(
    storedContext?.seriesId,
  );
  const [selectedEpisodePlanId, setSelectedEpisodePlanId] = useState<string | undefined>(
    storedContext?.episodePlanId,
  );
  const [selectedResource, setSelectedResource] = useState<CopilotResourceOption | undefined>(
    storedContext?.resource,
  );
  const [episodes, setEpisodes] = useState<CopilotEpisodeOption[]>([]);
  const [resources, setResources] = useState<CopilotResourceOption[]>([]);
  const [loadingContextOptions, setLoadingContextOptions] = useState(false);
  const [paidSelection, setPaidSelection] = useState<{
    revisionId: string;
    clientRef: string;
    quote?: CopilotQuote;
  }>();
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string>();
  const [error, setError] = useState<string>();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const activeRequest = useRef(0);
  const busyRef = useRef<string | undefined>(undefined);
  const contextRequest = useRef(0);

  const refreshBootstrap = useCallback(async () => {
    const request = ++activeRequest.current;
    setLoading(true);
    setError(undefined);
    try {
      const next = await loadCopilotBootstrap();
      if (request !== activeRequest.current) return;
      setBootstrap(next);
      const firstWorkspace = next.workspaces[0];
      setSelectedWorkspaceId((current) =>
        next.workspaces.some((item) => item.id === current) ? current : firstWorkspace?.id || "",
      );
      const firstConversation = next.conversations[0];
      if (firstConversation) {
        const detail = await loadConversation(firstConversation.id, firstConversation);
        if (request === activeRequest.current) setConversation(detail);
      }
    } catch (caught) {
      if (request === activeRequest.current) setError(errorMessage(caught));
    } finally {
      if (request === activeRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshBootstrap(), 0);
    return () => {
      window.clearTimeout(timer);
      activeRequest.current += 1;
    };
  }, [refreshBootstrap]);

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    window.sessionStorage.setItem(
      CONTEXT_STORAGE_KEY,
      JSON.stringify({
        workspaceId: selectedWorkspaceId,
        seriesId: selectedSeriesId,
        episodePlanId: selectedEpisodePlanId,
        resource: selectedResource,
      }),
    );
  }, [selectedEpisodePlanId, selectedResource, selectedSeriesId, selectedWorkspaceId]);

  const selectedWorkspace =
    bootstrap?.workspaces.find((item) => item.id === selectedWorkspaceId) ??
    bootstrap?.workspaces[0];
  const selectedSeries = bootstrap?.series.find((item) => item.id === selectedSeriesId);
  const context = useMemo<CopilotContext>(() => {
    if (conversation) {
      const workspace = bootstrap?.workspaces.find(
        (item) => item.id === conversation.context.workspaceId,
      );
      const series = bootstrap?.series.find((item) => item.id === conversation.context.seriesId);
      return {
        ...conversation.context,
        workspaceName: workspace?.name ?? conversation.context.workspaceName,
        role: workspace?.role ?? conversation.context.role,
        seriesName: series?.name ?? conversation.context.seriesName,
      };
    }
    return {
      workspaceId: selectedWorkspace?.id ?? "",
      workspaceName: selectedWorkspace?.name ?? "Workspace unavailable",
      role: selectedWorkspace?.role ?? "viewer",
      seriesId: selectedSeries?.id,
      seriesName: selectedSeries?.name,
      episodePlanId: selectedEpisodePlanId,
      episodeNumber: episodes.find((item) => item.id === selectedEpisodePlanId)?.episodeNumber,
      resource: selectedResource
        ? { type: selectedResource.type, id: selectedResource.id, label: selectedResource.label }
        : undefined,
      fingerprint: "new-conversation",
    };
  }, [
    bootstrap?.series,
    bootstrap?.workspaces,
    conversation,
    episodes,
    selectedEpisodePlanId,
    selectedResource,
    selectedSeries,
    selectedWorkspace,
  ]);
  const role = context.role;
  const hasConversation = Boolean(conversation);

  useEffect(() => {
    const seriesId = context.seriesId;
    const episodePlanId = context.episodePlanId;
    const request = ++contextRequest.current;
    if (!seriesId) {
      return;
    }
    void Promise.resolve()
      .then(() => {
        if (request === contextRequest.current) setLoadingContextOptions(true);
        return Promise.all([
          loadCopilotSeriesContextOptions(seriesId),
          episodePlanId
            ? loadCopilotEpisodeResources(seriesId, episodePlanId)
            : Promise.resolve([]),
        ]);
      })
      .then(([options, episodeResources]) => {
        if (request !== contextRequest.current) return;
        const nextResources = [...options.resources, ...episodeResources];
        setEpisodes(options.episodes);
        setResources(nextResources);
        if (!hasConversation) {
          setSelectedEpisodePlanId((current) =>
            current && options.episodes.some((item) => item.id === current) ? current : undefined,
          );
          setSelectedResource((current) =>
            current &&
            nextResources.some((item) => item.id === current.id && item.type === current.type)
              ? current
              : undefined,
          );
        }
      })
      .catch((caught) => {
        if (request === contextRequest.current) setError(errorMessage(caught));
      })
      .finally(() => {
        if (request === contextRequest.current) setLoadingContextOptions(false);
      });
  }, [context.episodePlanId, context.seriesId, hasConversation]);

  const revisionId = conversation?.revision?.id;
  const activePaidSelection =
    paidSelection && paidSelection.revisionId === revisionId ? paidSelection : undefined;
  const paidOperations = paidOperationsFromRevision(conversation?.revision);
  const selectedPaidClientRef = activePaidSelection?.clientRef ?? paidOperations[0]?.clientRef;
  const paidQuote = activePaidSelection?.quote;

  async function selectConversation(id: string) {
    if (busyRef.current) return;
    busyRef.current = "conversation";
    setBusyAction("conversation");
    setError(undefined);
    try {
      const summary = bootstrap?.conversations.find((item) => item.id === id);
      setConversation(await loadConversation(id, summary));
      setSelectedSeriesId(summary?.context.seriesId);
      setSelectedWorkspaceId(summary?.context.workspaceId ?? selectedWorkspaceId);
      setSelectedEpisodePlanId(summary?.context.episodePlanId);
      setSelectedResource(
        summary?.context.resource
          ? {
              ...summary.context.resource,
              label: summary.context.resource.label ?? summary.context.resource.type,
              seriesId: summary.context.seriesId ?? "",
              episodePlanId: summary.context.episodePlanId,
            }
          : undefined,
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      busyRef.current = undefined;
      setBusyAction(undefined);
    }
  }

  function startNewConversation() {
    if (conversation) {
      setSelectedWorkspaceId(conversation.context.workspaceId);
      setSelectedSeriesId(conversation.context.seriesId);
      setSelectedEpisodePlanId(conversation.context.episodePlanId);
      setSelectedResource(resourceOptionFromContext(conversation.context));
    }
    setConversation(undefined);
    setDraft("");
    setError(undefined);
    setDialog(null);
  }

  function changeWorkspace(workspaceId: string) {
    if (conversation) {
      setError(
        "A conversation belongs to one workspace. Start a new conversation before changing workspace.",
      );
      return;
    }
    setSelectedWorkspaceId(workspaceId);
    setSelectedSeriesId(undefined);
    setSelectedEpisodePlanId(undefined);
    setSelectedResource(undefined);
    setError(undefined);
  }

  function changeSeries(seriesId: string | undefined) {
    if (!canChangeConversationContext()) return;
    if (conversation) {
      void persistConversationContext({ seriesId });
      return;
    }
    setSelectedSeriesId(seriesId);
    setSelectedEpisodePlanId(undefined);
    setSelectedResource(undefined);
    setError(undefined);
  }

  function changeEpisode(episodePlanId: string | undefined) {
    if (!canChangeConversationContext()) return;
    if (conversation) {
      void persistConversationContext({
        seriesId: conversation.context.seriesId,
        episodePlanId,
      });
      return;
    }
    setSelectedEpisodePlanId(episodePlanId);
    setSelectedResource(undefined);
    setError(undefined);
  }

  function changeResource(resource: CopilotResourceOption | undefined) {
    if (!canChangeConversationContext()) return;
    if (conversation) {
      void persistConversationContext({
        seriesId: conversation.context.seriesId,
        episodePlanId: resource?.episodePlanId ?? conversation.context.episodePlanId,
        resource: resource ? { type: resource.type, id: resource.id } : undefined,
      });
      return;
    }
    setSelectedResource(resource);
    if (resource?.episodePlanId) setSelectedEpisodePlanId(resource.episodePlanId);
    setError(undefined);
  }

  function canChangeConversationContext() {
    if (conversation?.revision && !isTerminal(conversation.status)) {
      setError(
        "The active proposal keeps its original context. Apply, reject or discard it before changing Series, Episode or resource.",
      );
      return false;
    }
    return true;
  }

  async function persistConversationContext(selection: {
    seriesId?: string;
    episodePlanId?: string;
    resource?: { type: string; id: string };
  }) {
    if (!conversation || busyRef.current) return;
    busyRef.current = "context";
    setBusyAction("context");
    setError(undefined);
    try {
      const payload = await copilotRequest(
        `/api/copilot/conversations/${encodeURIComponent(conversation.id)}/context`,
        { method: "POST", body: JSON.stringify(selection) },
      );
      const projected = conversationValue(payload, conversation);
      setConversation(projected);
      setSelectedWorkspaceId(projected.context.workspaceId);
      setSelectedSeriesId(projected.context.seriesId);
      setSelectedEpisodePlanId(projected.context.episodePlanId);
      setSelectedResource(resourceOptionFromContext(projected.context));
      await refreshConversationList();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      busyRef.current = undefined;
      setBusyAction(undefined);
    }
  }

  async function ensureConversation() {
    if (conversation) return conversation;
    if (!selectedWorkspace?.id)
      throw new Error("Sign in and select an authorized workspace first.");
    if (
      selectedSeries &&
      selectedSeries.workspaceId &&
      selectedSeries.workspaceId !== selectedWorkspace.id
    ) {
      throw new Error("Select a Series authorized for the current workspace.");
    }
    if (loadingContextOptions)
      throw new Error("Wait for the authorized context to finish loading.");
    if (selectedEpisodePlanId && !episodes.some((item) => item.id === selectedEpisodePlanId)) {
      throw new Error("Select an authorized Episode from the available context.");
    }
    if (
      selectedResource &&
      !resources.some(
        (item) => item.id === selectedResource.id && item.type === selectedResource.type,
      )
    ) {
      throw new Error("Select an authorized resource from the available context.");
    }
    const payload = await copilotRequest("/api/copilot/conversations", {
      method: "POST",
      body: JSON.stringify({
        mode: selectedWorkspace.role === "viewer" ? "query" : "actionable",
        context: {
          ...(selectedSeriesId ? { seriesId: selectedSeriesId } : {}),
          ...(selectedEpisodePlanId ? { episodePlanId: selectedEpisodePlanId } : {}),
          ...(selectedResource
            ? { resource: { type: selectedResource.type, id: selectedResource.id } }
            : {}),
        },
      }),
    });
    const created = conversationValue(payload, { context });
    setConversation(created);
    return created;
  }

  async function sendMessage() {
    const content = draft.trim();
    if (!content || busyRef.current) return;
    busyRef.current = "message";
    setBusyAction("message");
    setError(undefined);
    try {
      const target = await ensureConversation();
      const payload = await copilotRequest(
        `/api/copilot/conversations/${encodeURIComponent(target.id)}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            clientMessageId: crypto.randomUUID(),
            content,
            visibleContextFingerprint: target.context.fingerprint,
          }),
        },
      );
      setDraft("");
      const projected = conversationValue(payload, target);
      setConversation(projected);
      await reconcile(projected.id, projected);
      await refreshConversationList();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      busyRef.current = undefined;
      setBusyAction(undefined);
    }
  }

  async function saveRevision(payload: unknown) {
    const revision = conversation?.revision;
    if (!revision) return;
    await command("revision", async () => {
      await copilotRequest(
        `/api/copilot/proposals/${encodeURIComponent(revision.proposalId)}/revisions`,
        {
          method: "POST",
          body: JSON.stringify({
            clientRevisionId: crypto.randomUUID(),
            basedOnRevisionId: revision.id,
            payload,
          }),
        },
      );
    });
  }

  async function validateRevision() {
    const revision = conversation?.revision;
    if (!revision) return;
    await command("validate", async () => {
      await copilotRequest(
        `/api/copilot/proposals/${encodeURIComponent(revision.proposalId)}/validate`,
        {
          method: "POST",
          body: JSON.stringify({ revisionId: revision.id, fingerprint: revision.fingerprint }),
        },
      );
    });
  }

  async function decide(decision: "approve" | "reject" | "discard") {
    const revision = conversation?.revision;
    if (!revision?.validationRunId && decision === "approve") return;
    await command(decision, async () => {
      await copilotRequest(
        `/api/copilot/proposals/${encodeURIComponent(revision!.proposalId)}/decision`,
        {
          method: "POST",
          body: JSON.stringify({
            revisionId: revision!.id,
            fingerprint: revision!.fingerprint,
            validationRunId: revision!.validationRunId,
            decision,
          }),
        },
      );
    });
  }

  async function applyRevision() {
    const revision = conversation?.revision;
    if (!revision?.approvalId) return;
    await command("apply", async () => {
      await copilotRequest(
        `/api/copilot/proposals/${encodeURIComponent(revision.proposalId)}/apply`,
        {
          method: "POST",
          body: JSON.stringify({
            approvalId: revision.approvalId,
            idempotencyKey: crypto.randomUUID(),
          }),
        },
      );
    });
  }

  async function confirmDialogQuote() {
    if (dialog === "inference") await confirmInference();
    if (dialog === "paid") await confirmPaidWork();
  }

  async function confirmInference() {
    const quote = conversation?.inferenceQuote;
    const messageId = conversation?.pendingMessageId;
    if (!conversation || !quote || !messageId) return;
    await command("inference-cost", async () => {
      const confirmation = await copilotRequest(
        `/api/copilot/conversations/${encodeURIComponent(conversation.id)}/messages/${encodeURIComponent(messageId)}/cost/confirm`,
        {
          method: "POST",
          body: JSON.stringify({ quoteId: quote.id, quoteFingerprint: quote.fingerprint }),
        },
      );
      const confirmationId = idFrom(confirmation, "confirmationId", "confirmation");
      await copilotRequest(
        `/api/copilot/conversations/${encodeURIComponent(conversation.id)}/messages/${encodeURIComponent(messageId)}/generate`,
        {
          method: "POST",
          body: JSON.stringify({ confirmationId, idempotencyKey: crypto.randomUUID() }),
        },
      );
      setDialog(null);
    });
  }

  async function confirmPaidWork() {
    const revision = conversation?.revision;
    const quote = paidQuote;
    if (!revision || !quote) return;
    await command("paid-cost", async () => {
      const confirmation = await copilotRequest(
        `/api/copilot/proposals/${encodeURIComponent(revision.proposalId)}/cost/confirm`,
        {
          method: "POST",
          body: JSON.stringify({ quoteId: quote.id, quoteFingerprint: quote.fingerprint }),
        },
      );
      const confirmationId = idFrom(confirmation, "confirmationId", "confirmation");
      await copilotRequest(
        `/api/copilot/proposals/${encodeURIComponent(revision.proposalId)}/cost/start`,
        {
          method: "POST",
          body: JSON.stringify({ confirmationId, idempotencyKey: crypto.randomUUID() }),
        },
      );
      setDialog(null);
    });
  }

  async function requestPaidQuote() {
    const revision = conversation?.revision;
    if (!revision || !selectedPaidClientRef) return;
    await command("paid-quote", async () => {
      const response = await copilotRequest(
        `/api/copilot/proposals/${encodeURIComponent(revision.proposalId)}/cost/quote`,
        {
          method: "POST",
          body: JSON.stringify({
            revisionId: revision.id,
            fingerprint: revision.fingerprint,
            scope: { clientRef: selectedPaidClientRef },
          }),
        },
      );
      const source =
        response && typeof response === "object" ? (response as Record<string, unknown>) : {};
      const nextQuote = quoteValue(source.quote ?? response);
      if (!nextQuote) throw new Error("The server did not return a cost quote.");
      setPaidSelection({
        revisionId: revision.id,
        clientRef: selectedPaidClientRef,
        quote: nextQuote,
      });
      setDialog("paid");
    });
  }

  function changePaidSelector(clientRef: string) {
    if (!revisionId) return;
    if (!paidOperations.some((operation) => operation.clientRef === clientRef)) return;
    setPaidSelection({ revisionId, clientRef });
    if (dialog === "paid") setDialog(null);
  }

  async function command(action: string, operation: () => Promise<void>) {
    if (!conversation || busyRef.current) return;
    busyRef.current = action;
    setBusyAction(action);
    setError(undefined);
    try {
      await operation();
      await reconcile(conversation.id, conversation);
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof CopilotRequestError && [409, 422, 503].includes(caught.status)) {
        const projected = conversationValue(caught.payload, conversation);
        setConversation(projected);
        await reconcile(conversation.id, projected).catch(() => undefined);
      }
    } finally {
      busyRef.current = undefined;
      setBusyAction(undefined);
    }
  }

  async function reconcile(id: string, fallback: Partial<CopilotConversation>) {
    const current = await loadConversation(id, fallback);
    setConversation(current);
  }

  async function refreshConversationList() {
    const payload = await copilotRequest("/api/copilot/conversations");
    const source =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    if (!Array.isArray(source.conversations)) return;
    const conversations = source.conversations.map((item) => {
      const normalized = conversationValue(item, { context });
      return {
        id: normalized.id,
        title: normalized.title,
        status: normalized.status,
        context: normalized.context,
        updatedAt: normalized.updatedAt,
      };
    });
    setBootstrap((current) => (current ? { ...current, conversations } : current));
  }

  const quote: CopilotQuote | undefined =
    dialog === "inference" ? conversation?.inferenceQuote : paidQuote;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Creative copilot"
          title="Preparing your production desk"
          description="Loading authorized conversations and canonical context."
        />
        <LoadingSkeleton rows={7} />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader
        eyebrow="Creative copilot"
        title="Create against the canon"
        description="Ask, draft and review in one place. Canon changes only after exact validation, explicit approval and a transactional apply."
        actions={
          <Button type="button" variant="outline" onClick={startNewConversation}>
            <MessageSquarePlus aria-hidden="true" /> New conversation
          </Button>
        }
        className="pb-4"
      />

      {error ? (
        <InlineNotice title="Copilot needs attention" variant="destructive">
          <span className="flex flex-wrap items-center gap-3">
            <span>{error}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void refreshBootstrap()}
            >
              <RefreshCw aria-hidden="true" /> Refresh
            </Button>
            <Link
              href="/accounts"
              className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              Open accounts
            </Link>
          </span>
        </InlineNotice>
      ) : null}

      <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
        <ContextSelector
          context={context}
          role={role}
          workspaces={bootstrap?.workspaces ?? []}
          series={(bootstrap?.series ?? []).filter(
            (item) => !item.workspaceId || item.workspaceId === context.workspaceId,
          )}
          episodes={withCurrentEpisode(episodes, conversation ? context : undefined)}
          resources={withCurrentResource(resources, conversation ? context : undefined)}
          disabled={Boolean(busyAction)}
          loadingOptions={loadingContextOptions}
          onWorkspaceChange={changeWorkspace}
          onSeriesChange={changeSeries}
          onEpisodeChange={changeEpisode}
          onResourceChange={changeResource}
        />
        <WorkflowStatus
          state={conversation?.status ?? "collecting_context"}
          cause={conversation?.stateCause}
          nextAction={conversation?.nextAction}
        />

        <div className="hidden min-h-[38rem] min-w-0 lg:grid lg:h-[calc(100svh-17rem)] lg:max-h-[58rem] lg:grid-cols-[minmax(18rem,0.85fr)_minmax(22rem,1.15fr)] lg:divide-x">
          <ConversationPane
            messages={conversation?.messages ?? []}
            conversations={bootstrap?.conversations ?? []}
            selectedConversationId={conversation?.id}
            draft={draft}
            role={role}
            busy={busyAction === "message" || busyAction === "conversation"}
            inferenceQuote={conversation?.inferenceQuote}
            onDraftChange={setDraft}
            onSend={() => void sendMessage()}
            onSelectConversation={(id) => void selectConversation(id)}
            onOpenInferenceQuote={() => setDialog("inference")}
          />
          <ProposalReviewPane
            revision={conversation?.revision}
            revisions={conversation?.revisions}
            receipt={conversation?.receipt}
            state={conversation?.status ?? "collecting_context"}
            role={role}
            busyAction={busyAction}
            onSaveRevision={(payload) => void saveRevision(payload)}
            onValidate={() => void validateRevision()}
            onDecision={(decision) => void decide(decision)}
            onApply={() => void applyRevision()}
            paidOperations={paidOperations}
            selectedPaidClientRef={selectedPaidClientRef}
            paidQuote={paidQuote}
            onPaidSelectorChange={changePaidSelector}
            onRequestCost={() => void requestPaidQuote()}
            onReviewCost={() => setDialog("paid")}
            onRetry={() =>
              conversation?.status === "stale_draft" && conversation.revision
                ? void saveRevision(conversation.revision.payload)
                : void reconcile(conversation!.id, conversation!)
            }
          />
        </div>

        <Tabs defaultValue="chat" className="gap-0 lg:hidden">
          <TabsList aria-label="Copilot views" className="mx-4 mt-4 w-auto">
            <TabsTrigger value="chat" className="flex-1">
              Chat
            </TabsTrigger>
            <TabsTrigger value="draft" className="flex-1">
              Draft
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="chat"
            forceMount
            className="min-h-[32rem] data-[state=inactive]:hidden"
          >
            <ConversationPane
              messages={conversation?.messages ?? []}
              conversations={bootstrap?.conversations ?? []}
              selectedConversationId={conversation?.id}
              draft={draft}
              role={role}
              busy={busyAction === "message" || busyAction === "conversation"}
              inferenceQuote={conversation?.inferenceQuote}
              onDraftChange={setDraft}
              onSend={() => void sendMessage()}
              onSelectConversation={(id) => void selectConversation(id)}
              onOpenInferenceQuote={() => setDialog("inference")}
            />
          </TabsContent>
          <TabsContent
            value="draft"
            forceMount
            className="min-h-[32rem] data-[state=inactive]:hidden"
          >
            <ProposalReviewPane
              revision={conversation?.revision}
              revisions={conversation?.revisions}
              receipt={conversation?.receipt}
              state={conversation?.status ?? "collecting_context"}
              role={role}
              busyAction={busyAction}
              onSaveRevision={(payload) => void saveRevision(payload)}
              onValidate={() => void validateRevision()}
              onDecision={(decision) => void decide(decision)}
              onApply={() => void applyRevision()}
              paidOperations={paidOperations}
              selectedPaidClientRef={selectedPaidClientRef}
              paidQuote={paidQuote}
              onPaidSelectorChange={changePaidSelector}
              onRequestCost={() => void requestPaidQuote()}
              onReviewCost={() => setDialog("paid")}
              onRetry={() =>
                conversation?.status === "stale_draft" && conversation.revision
                  ? void saveRevision(conversation.revision.payload)
                  : conversation
                    ? void reconcile(conversation.id, conversation)
                    : undefined
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      <CostConfirmationDialog
        quote={quote}
        open={dialog !== null}
        busy={busyAction === "inference-cost" || busyAction === "paid-cost"}
        purpose={dialog === "inference" ? "copilot inference" : "paid work"}
        onOpenChange={(open) => {
          if (!open && !busyAction) setDialog(null);
        }}
        onConfirm={() => void confirmDialogQuote()}
      />
    </div>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

function idFrom(payload: unknown, directKey: string, objectKey: string) {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  if (typeof source[directKey] === "string") return source[directKey];
  const nested =
    source[objectKey] && typeof source[objectKey] === "object"
      ? (source[objectKey] as Record<string, unknown>)
      : {};
  if (typeof nested.id === "string") return nested.id;
  throw new Error("The server did not return the required confirmation identifier.");
}

function isTerminal(state: CopilotConversation["status"]) {
  return state === "applied" || state === "rejected" || state === "discarded";
}

const CONTEXT_STORAGE_KEY = "ai-series.copilot.context";

function readContextSelection(): {
  workspaceId: string;
  seriesId?: string;
  episodePlanId?: string;
  resource?: CopilotResourceOption;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(CONTEXT_STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (typeof parsed.workspaceId !== "string") return null;
    const resource =
      parsed.resource && typeof parsed.resource === "object"
        ? (parsed.resource as CopilotResourceOption)
        : undefined;
    return {
      workspaceId: parsed.workspaceId,
      seriesId: typeof parsed.seriesId === "string" ? parsed.seriesId : undefined,
      episodePlanId: typeof parsed.episodePlanId === "string" ? parsed.episodePlanId : undefined,
      resource,
    };
  } catch {
    return null;
  }
}

function paidOperationsFromRevision(
  revision?: CopilotConversation["revision"],
): { clientRef: string; jobType: string }[] {
  if (!revision) return [];
  const payload =
    revision.payload && typeof revision.payload === "object"
      ? (revision.payload as Record<string, unknown>)
      : {};
  const operations = Array.isArray(payload.operations) ? payload.operations : [];
  return operations
    .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : {}))
    .flatMap((operation) => {
      if (
        operation.type !== "paid_job.request" ||
        typeof operation.clientRef !== "string" ||
        !operation.clientRef.trim()
      )
        return [];
      return [
        {
          clientRef: operation.clientRef,
          jobType: typeof operation.jobType === "string" ? operation.jobType : "Paid operation",
        },
      ];
    });
}

function withCurrentEpisode(episodes: CopilotEpisodeOption[], context?: CopilotContext) {
  if (!context?.episodePlanId || episodes.some((item) => item.id === context.episodePlanId))
    return episodes;
  return [
    ...episodes,
    {
      id: context.episodePlanId,
      seriesId: context.seriesId ?? "",
      episodeNumber: context.episodeNumber ?? 1,
    },
  ];
}

function withCurrentResource(resources: CopilotResourceOption[], context?: CopilotContext) {
  if (
    !context?.resource ||
    resources.some(
      (item) => item.id === context.resource?.id && item.type === context.resource?.type,
    )
  )
    return resources;
  return [
    ...resources,
    {
      id: context.resource.id,
      type: context.resource.type,
      label: context.resource.label ?? context.resource.type,
      seriesId: context.seriesId ?? "",
      episodePlanId: context.episodePlanId,
    },
  ];
}

function resourceOptionFromContext(context: CopilotContext): CopilotResourceOption | undefined {
  if (!context.resource) return undefined;
  return {
    id: context.resource.id,
    type: context.resource.type,
    label: context.resource.label ?? context.resource.type,
    seriesId: context.seriesId ?? "",
    episodePlanId: context.episodePlanId,
  };
}
