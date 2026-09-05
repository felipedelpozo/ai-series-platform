"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { Badge } from "@ai-series/ui";
import { Bot, Link2, UserRound } from "lucide-react";
import type { CopilotMessage } from "@/lib/copilot-loader";

const classificationLabel: Record<CopilotMessage["classification"], string> = {
  query: "Query",
  proposal: "Proposal",
  canonical_mutation: "Canonical change",
  paid_job: "Paid work",
  mixed: "Mixed request",
};

export const ConversationHistory = forwardRef<HTMLOListElement, { messages: CopilotMessage[] }>(
  function ConversationHistory({ messages }, ref) {
    if (messages.length === 0) {
      return (
        <div className="grid min-h-52 place-items-center rounded-xl border border-dashed bg-muted/20 p-6 text-center">
          <div className="max-w-sm">
            <Bot className="mx-auto size-6 text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">Start with the creative intent</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Ask a question or describe the Series, Bible, characters, locations, props or episode
              you want to prepare. No chat message can approve or apply canonical changes.
            </p>
          </div>
        </div>
      );
    }

    return (
      <ol
        ref={ref}
        className="space-y-4"
        aria-label="Conversation messages"
        aria-live="polite"
        aria-relevant="additions text"
        role="log"
        tabIndex={-1}
      >
        {[...messages]
          .sort((a, b) => a.sequence - b.sequence)
          .map((message) => {
            const isUser = message.role === "user";
            const Icon = isUser ? UserRound : Bot;
            return (
              <li key={message.id} className={isUser ? "pl-8" : "pr-8"}>
                <article
                  className={`rounded-xl border px-4 py-3 ${
                    isUser ? "border-primary/25 bg-primary/7" : "bg-background"
                  }`}
                  aria-label={`${isUser ? "You" : "Copilot"}, ${classificationLabel[message.classification]}`}
                >
                  <header className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                    <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="text-xs font-semibold">
                      {isUser ? "You" : "Creative copilot"}
                    </span>
                    <Badge variant={message.classification === "query" ? "muted" : "warning"}>
                      {classificationLabel[message.classification]}
                    </Badge>
                    <time
                      className="ml-auto text-[0.6875rem] text-muted-foreground"
                      dateTime={message.createdAt}
                    >
                      {formatTime(message.createdAt)}
                    </time>
                  </header>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {message.content}
                  </p>
                  {message.references?.length ? (
                    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Grounded references">
                      {message.references.map((reference) => (
                        <li key={`${message.id}-${reference.href}`}>
                          <Link
                            href={reference.href}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Link2 className="size-3.5" aria-hidden="true" />
                            {reference.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              </li>
            );
          })}
      </ol>
    );
  },
);

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
}
