"use client";

import { useId, useState } from "react";
import { Button, Label, Textarea } from "@ai-series/ui";
import { Save } from "lucide-react";
import type { CopilotRevision } from "@/lib/copilot-loader";

export function ProposalEditor({
  revision,
  disabled,
  busy,
  onSave,
}: {
  revision: CopilotRevision;
  disabled?: boolean;
  busy?: boolean;
  onSave: (payload: unknown) => void;
}) {
  const id = useId();
  const payloadId = `${id}-proposal-payload`;
  const helpId = `${id}-proposal-payload-help`;
  const errorId = `${id}-proposal-payload-error`;
  const [source, setSource] = useState(() => JSON.stringify(revision.payload, null, 2));
  const [error, setError] = useState<string>();

  function save() {
    try {
      const payload = JSON.parse(source) as unknown;
      setError(undefined);
      onSave(payload);
    } catch {
      setError("The structured draft is not valid JSON. Correct it before creating a revision.");
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={payloadId}>Structured draft · revision {revision.revisionNumber}</Label>
        <p id={helpId} className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Saving never changes canon. It creates a new immutable revision and invalidates any prior
          approval.
        </p>
      </div>
      <Textarea
        id={payloadId}
        value={source}
        onChange={(event) => {
          setSource(event.target.value);
          setError(undefined);
        }}
        rows={16}
        spellCheck={false}
        className="min-h-72 resize-y font-mono text-xs leading-relaxed"
        aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
        aria-invalid={Boolean(error)}
        disabled={disabled || busy}
      />
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {!disabled ? (
        <Button type="button" variant="outline" onClick={save} disabled={busy}>
          <Save aria-hidden="true" />
          {busy ? "Saving revision…" : "Save as new revision"}
        </Button>
      ) : null}
    </div>
  );
}
