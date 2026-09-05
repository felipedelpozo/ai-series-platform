"use client";

import { useEffect, useId, useRef } from "react";
import { Button, Textarea } from "@ai-series/ui";
import { History, LoaderCircle, Send, Sparkles } from "lucide-react";
import type {
  CopilotConversationSummary,
  CopilotMessage,
  CopilotQuote,
  CopilotRole,
} from "@/lib/copilot-loader";
import { ConversationHistory } from "./ConversationHistory";

export function ConversationPane({
  messages,
  conversations,
  selectedConversationId,
  draft,
  role,
  busy,
  inferenceQuote,
  onDraftChange,
  onSend,
  onSelectConversation,
  onOpenInferenceQuote,
}: {
  messages: CopilotMessage[];
  conversations: CopilotConversationSummary[];
  selectedConversationId?: string;
  draft: string;
  role: CopilotRole;
  busy?: boolean;
  inferenceQuote?: CopilotQuote;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onSelectConversation: (id: string) => void;
  onOpenInferenceQuote: () => void;
}) {
  const id = useId();
  const titleId = `${id}-conversation-title`;
  const messageId = `${id}-message`;
  const authorityId = `${id}-authority`;
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const previousBusy = useRef(Boolean(busy));

  useEffect(() => {
    if (previousBusy.current && !busy) composerRef.current?.focus();
    previousBusy.current = Boolean(busy);
  }, [busy]);

  return (
    <section aria-labelledby={titleId} className="flex min-h-0 min-w-0 flex-col bg-card">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-sm font-semibold">
            Conversation
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {role === "viewer"
              ? "Authorized read-only answers"
              : "Questions and creative direction"}
          </p>
        </div>
        {conversations.length ? (
          <div className="relative min-w-0">
            <History
              className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <select
              aria-label="Previous conversations"
              value={selectedConversationId ?? ""}
              onChange={(event) => onSelectConversation(event.target.value)}
              className="h-10 max-w-48 appearance-none truncate rounded-md border bg-background pl-8 pr-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {conversations.map((conversation) => (
                <option key={conversation.id} value={conversation.id}>
                  {conversation.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4" data-copilot-scroll="conversation">
        <ConversationHistory messages={messages} />
      </div>

      {inferenceQuote ? (
        <div className="border-t bg-warning/5 px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed">
              Real inference requires a separate cost confirmation of up to{" "}
              <strong>
                {inferenceQuote.amount} {inferenceQuote.currency}
              </strong>
              .
            </p>
            <Button type="button" size="sm" variant="outline" onClick={onOpenInferenceQuote}>
              Review inference quote
            </Button>
          </div>
        </div>
      ) : null}

      <form
        className="border-t bg-background p-4"
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <label htmlFor={messageId} className="sr-only">
          Message to creative copilot
        </label>
        <Textarea
          ref={composerRef}
          id={messageId}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          rows={3}
          maxLength={12_000}
          placeholder={
            role === "viewer"
              ? "Ask about the authorized production context…"
              : "Describe an idea, ask a question or request a draft…"
          }
          disabled={busy}
          aria-describedby={authorityId}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              onSend();
            }
          }}
        />
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p id={authorityId} className="text-[0.6875rem] leading-relaxed text-muted-foreground">
            Chat text never approves, applies or starts paid work. Ctrl/⌘ + Enter sends.
          </p>
          <Button
            type="submit"
            disabled={busy || draft.trim().length === 0}
            className="min-h-11 sm:min-h-10"
          >
            {busy ? (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : role === "viewer" ? (
              <Send aria-hidden="true" />
            ) : (
              <Sparkles aria-hidden="true" />
            )}
            {busy ? "Sending…" : role === "viewer" ? "Ask" : "Send"}
          </Button>
        </div>
      </form>
    </section>
  );
}
