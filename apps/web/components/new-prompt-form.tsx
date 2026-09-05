"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FilePlus2, LoaderCircle } from "lucide-react";
import { Button, Input, Label, Textarea } from "@ai-series/ui";
import { InlineNotice, SectionPanel } from "@/components/ui";
import { studioMutation } from "@/lib/studio-mutation";

type Feedback =
  | { kind: "error"; title: string; detail: string }
  | { kind: "success"; title: string; detail: string }
  | null;

async function getResponseError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }
  } catch {
    // The response did not provide a JSON error body.
  }

  return `The request failed with status ${response.status}.`;
}

export function NewPromptForm({ purposes }: { purposes: readonly string[] }) {
  const router = useRouter();
  const [purpose, setPurpose] = useState<string>(purposes[0] ?? "test.image");
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating) return;

    setIsCreating(true);
    setFeedback(null);

    try {
      const response = await studioMutation("prompts.create", "/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, name, template }),
      });

      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }

      setName("");
      setTemplate("");
      setFeedback({
        kind: "success",
        title: "Template created",
        detail: "The new prompt is now available in the library.",
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        kind: "error",
        title: "Template could not be created",
        detail: error instanceof Error ? error.message : "Check the fields and try again.",
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <SectionPanel
      title="New template"
      description="Start with a production purpose and the exact reusable instruction."
      className="xl:sticky xl:top-6"
    >
      <form onSubmit={create} className="space-y-5">
        {feedback ? (
          <InlineNotice
            title={feedback.title}
            variant={feedback.kind === "error" ? "destructive" : "success"}
          >
            {feedback.detail}
          </InlineNotice>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="new-prompt-purpose">Purpose</Label>
          <select
            id="new-prompt-purpose"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-[color,box-shadow,border-color] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
          >
            {purposes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Purpose determines where this template can be selected.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-prompt-name">Name</Label>
          <Input
            id="new-prompt-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Cinematic shot draft"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-prompt-template">Template</Label>
          <Textarea
            id="new-prompt-template"
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
            placeholder="Describe the instruction and use {{variable}} placeholders where needed."
            className="min-h-36 font-mono text-xs leading-relaxed"
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full sm:w-auto xl:w-full"
          disabled={isCreating || !name.trim() || !template.trim()}
        >
          {isCreating ? (
            <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <FilePlus2 aria-hidden="true" />
          )}
          {isCreating ? "Creating template…" : "Create template"}
        </Button>
      </form>
    </SectionPanel>
  );
}
