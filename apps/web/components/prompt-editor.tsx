"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, ArrowLeft, Check, Copy, Eye, FileClock, LoaderCircle, Save } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Input,
  Label,
  Textarea,
} from "@ai-series/ui";
import { EmptyState, InlineNotice, PageHeader, SectionPanel, StatusBadge } from "@/components/ui";
import { studioMutation } from "@/lib/studio-mutation";

interface PromptVariable {
  name: string;
  required: boolean;
  default?: string;
}

interface PromptEditorProps {
  template: {
    id: string;
    name: string;
    description: string | null;
    purpose: string;
    status: string;
  };
  versions: {
    id: string;
    version: number;
    template: string;
    variables: PromptVariable[];
    isActive: boolean;
  }[];
}

interface PreviewResult {
  rendered: string;
  missing: string[];
}

type Feedback =
  | { kind: "error"; title: string; detail: string }
  | { kind: "success"; title: string; detail: string }
  | null;

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

function parseDeclaredVariables(value: string): ParseResult<PromptVariable[]> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return { ok: false, error: "Variables must be a JSON array." };
    }

    const isValid = parsed.every(
      (variable) =>
        typeof variable === "object" &&
        variable !== null &&
        "name" in variable &&
        typeof variable.name === "string" &&
        variable.name.trim().length > 0 &&
        "required" in variable &&
        typeof variable.required === "boolean" &&
        (!("default" in variable) ||
          variable.default === undefined ||
          typeof variable.default === "string"),
    );

    if (!isValid) {
      return {
        ok: false,
        error:
          'Each variable needs a non-empty "name", a boolean "required", and an optional string "default".',
      };
    }

    return { ok: true, value: parsed as PromptVariable[] };
  } catch {
    return {
      ok: false,
      error: "Variables contain invalid JSON. Check commas, quotes, and brackets.",
    };
  }
}

function parsePreviewVariables(value: string): ParseResult<Record<string, string>> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: "Preview variables must be a JSON object." };
    }

    if (!Object.values(parsed).every((item) => typeof item === "string")) {
      return { ok: false, error: "Every preview variable value must be a string." };
    }

    return { ok: true, value: parsed as Record<string, string> };
  } catch {
    return { ok: false, error: "Preview variables contain invalid JSON." };
  }
}

function isPreviewResult(value: unknown): value is PreviewResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "rendered" in value &&
    typeof value.rendered === "string" &&
    "missing" in value &&
    Array.isArray(value.missing) &&
    value.missing.every((item) => typeof item === "string")
  );
}

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

export function PromptEditor({ template, versions }: PromptEditorProps) {
  const router = useRouter();
  const active = versions.find((version) => version.isActive) ?? versions[0];

  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [text, setText] = useState(active?.template ?? "");
  const [variablesJson, setVariablesJson] = useState(
    JSON.stringify(active?.variables ?? [], null, 2),
  );
  const [previewVars, setPreviewVars] = useState("{}");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [variablesError, setVariablesError] = useState<string | null>(null);
  const [previewVariablesError, setPreviewVariablesError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [activatingVersionId, setActivatingVersionId] = useState<string | null>(null);

  async function save() {
    if (isSaving) return;

    const parsedVariables = parseDeclaredVariables(variablesJson);
    if (!parsedVariables.ok) {
      setVariablesError(parsedVariables.error);
      setFeedback({
        kind: "error",
        title: "Template was not saved",
        detail: "Correct the variables JSON and try again. Your edits are still here.",
      });
      return;
    }

    setVariablesError(null);
    setFeedback(null);
    setIsSaving(true);

    try {
      const response = await studioMutation("prompts.save", `/api/prompts/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          template: text,
          variables: parsedVariables.value,
        }),
      });

      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }

      setFeedback({
        kind: "success",
        title: "New version saved",
        detail: "Your edits are now the active prompt version.",
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        kind: "error",
        title: "Template was not saved",
        detail: error instanceof Error ? error.message : "Try saving again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function runPreview() {
    if (isPreviewing) return;

    const parsedVariables = parseDeclaredVariables(variablesJson);
    const parsedPreviewVariables = parsePreviewVariables(previewVars);
    setVariablesError(parsedVariables.ok ? null : parsedVariables.error);
    setPreviewVariablesError(parsedPreviewVariables.ok ? null : parsedPreviewVariables.error);

    if (!parsedVariables.ok || !parsedPreviewVariables.ok) {
      setFeedback({
        kind: "error",
        title: "Preview could not be rendered",
        detail: "Correct the highlighted JSON field and try again.",
      });
      return;
    }

    setFeedback(null);
    setPreview(null);
    setIsPreviewing(true);

    try {
      const response = await studioMutation("prompts.preview", "/api/prompts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: text,
          variables: parsedPreviewVariables.value,
          declared: parsedVariables.value,
        }),
      });

      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }

      const result: unknown = await response.json();
      if (!isPreviewResult(result)) {
        throw new Error("The preview response was not in the expected format.");
      }

      setPreview(result);
      setFeedback({
        kind: "success",
        title: "Preview rendered",
        detail:
          result.missing.length > 0
            ? "The rendered text is available, but required values are still missing."
            : "The rendered prompt is ready to review.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        title: "Preview could not be rendered",
        detail: error instanceof Error ? error.message : "Try rendering the preview again.",
      });
    } finally {
      setIsPreviewing(false);
    }
  }

  async function activate(versionId: string) {
    if (activatingVersionId) return;

    setFeedback(null);
    setActivatingVersionId(versionId);

    try {
      const response = await studioMutation(
        "prompts.activate",
        `/api/prompts/${template.id}/versions/${versionId}/activate`,
        { method: "POST" },
      );
      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }

      setFeedback({
        kind: "success",
        title: "Version activated",
        detail: "Future uses of this template will use the selected version.",
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        kind: "error",
        title: "Version could not be activated",
        detail: error instanceof Error ? error.message : "Try activating the version again.",
      });
    } finally {
      setActivatingVersionId(null);
    }
  }

  async function archive() {
    if (isArchiving) return;

    setFeedback(null);
    setIsArchiving(true);

    try {
      const response = await studioMutation(
        "prompts.archive",
        `/api/prompts/${template.id}/archive`,
        { method: "POST" },
      );
      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }

      setFeedback({
        kind: "success",
        title: "Template archived",
        detail: "The template remains available for historical traceability.",
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        kind: "error",
        title: "Template could not be archived",
        detail: error instanceof Error ? error.message : "Try archiving the template again.",
      });
    } finally {
      setIsArchiving(false);
    }
  }

  async function clone() {
    if (isCloning) return;

    setFeedback(null);
    setIsCloning(true);

    try {
      const response = await studioMutation("prompts.clone", `/api/prompts/${template.id}/clone`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }

      setFeedback({
        kind: "success",
        title: "Template cloned",
        detail: "A copy is now available in the prompt library.",
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        kind: "error",
        title: "Template could not be cloned",
        detail: error instanceof Error ? error.message : "Try cloning the template again.",
      });
    } finally {
      setIsCloning(false);
    }
  }

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        eyebrow="Prompt editor"
        title={template.name}
        description="Edit the reusable instruction, verify its variables, and save changes as an immutable version."
        actions={
          <>
            <Button asChild variant="ghost">
              <Link href="/prompts">
                <ArrowLeft aria-hidden="true" />
                Library
              </Link>
            </Button>
            <Button variant="outline" onClick={clone} disabled={isCloning}>
              {isCloning ? (
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Copy aria-hidden="true" />
              )}
              {isCloning ? "Cloning…" : "Clone"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={isArchiving || template.status === "archived"}
                >
                  {isArchiving ? (
                    <LoaderCircle
                      className="animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <Archive aria-hidden="true" />
                  )}
                  {template.status === "archived"
                    ? "Archived"
                    : isArchiving
                      ? "Archiving…"
                      : "Archive"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive this prompt template?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This template will no longer be active for new work. Its versions remain in the
                    registry so existing generations keep their history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep template</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void archive()} disabled={isArchiving}>
                    Archive template
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={template.status} />
        <Badge variant="outline" className="max-w-full truncate">
          {template.purpose}
        </Badge>
        {active ? <Badge variant="muted">Active version · v{active.version}</Badge> : null}
      </div>

      {feedback ? (
        <InlineNotice
          title={feedback.title}
          variant={feedback.kind === "error" ? "destructive" : "success"}
        >
          {feedback.detail}
        </InlineNotice>
      ) : null}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] xl:items-start">
        <SectionPanel
          title="Template source"
          description="Saving creates a new active version. Earlier versions remain unchanged."
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="prompt-name">Name</Label>
              <Input
                id="prompt-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt-description">Description</Label>
              <Textarea
                id="prompt-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Explain when this template should be used."
                className="min-h-24"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt-template">Template</Label>
              <Textarea
                id="prompt-template"
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="min-h-64 font-mono text-xs leading-relaxed"
                aria-describedby="prompt-template-help"
                required
              />
              <p
                id="prompt-template-help"
                className="text-xs leading-relaxed text-muted-foreground"
              >
                Reference declared values with double braces, for example {"{{subject}}"}.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt-variables">Declared variables (JSON)</Label>
              <Textarea
                id="prompt-variables"
                value={variablesJson}
                onChange={(event) => {
                  setVariablesJson(event.target.value);
                  if (variablesError) setVariablesError(null);
                }}
                className="min-h-44 font-mono text-xs leading-relaxed"
                aria-invalid={Boolean(variablesError)}
                aria-describedby={
                  variablesError ? "prompt-variables-error" : "prompt-variables-help"
                }
              />
              {variablesError ? (
                <p id="prompt-variables-error" className="text-xs leading-relaxed text-destructive">
                  {variablesError}
                </p>
              ) : (
                <p
                  id="prompt-variables-help"
                  className="text-xs leading-relaxed text-muted-foreground"
                >
                  Use an array of objects with name, required, and an optional default string.
                </p>
              )}
            </div>

            <Button
              onClick={save}
              disabled={isSaving || !name.trim() || !text.trim()}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Save aria-hidden="true" />
              )}
              {isSaving ? "Saving version…" : "Save new version"}
            </Button>
          </div>
        </SectionPanel>

        <div className="min-w-0 space-y-6">
          <SectionPanel
            title="Preview"
            description="Render the current unsaved template with representative values."
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt-preview-variables">Preview variables (JSON)</Label>
                <Textarea
                  id="prompt-preview-variables"
                  value={previewVars}
                  onChange={(event) => {
                    setPreviewVars(event.target.value);
                    if (previewVariablesError) setPreviewVariablesError(null);
                  }}
                  className="min-h-32 font-mono text-xs leading-relaxed"
                  aria-invalid={Boolean(previewVariablesError)}
                  aria-describedby={
                    previewVariablesError
                      ? "prompt-preview-variables-error"
                      : "prompt-preview-variables-help"
                  }
                />
                {previewVariablesError ? (
                  <p
                    id="prompt-preview-variables-error"
                    className="text-xs leading-relaxed text-destructive"
                  >
                    {previewVariablesError}
                  </p>
                ) : (
                  <p
                    id="prompt-preview-variables-help"
                    className="text-xs leading-relaxed text-muted-foreground"
                  >
                    Supply a JSON object whose values are strings.
                  </p>
                )}
              </div>

              <Button variant="outline" onClick={runPreview} disabled={isPreviewing}>
                {isPreviewing ? (
                  <LoaderCircle
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <Eye aria-hidden="true" />
                )}
                {isPreviewing ? "Rendering preview…" : "Render preview"}
              </Button>

              {preview ? (
                <div className="space-y-3 border-t pt-4">
                  {preview.missing.length > 0 ? (
                    <InlineNotice title="Required values are missing" variant="warning">
                      {preview.missing.join(", ")}
                    </InlineNotice>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-success">
                      <Check aria-hidden="true" className="size-4" />
                      All required values were supplied.
                    </div>
                  )}
                  <pre className="max-h-96 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/25 p-4 font-mono text-xs leading-relaxed">
                    {preview.rendered}
                  </pre>
                </div>
              ) : (
                <EmptyState
                  icon={Eye}
                  title="No preview rendered"
                  description="Add representative values, then render to inspect the exact prompt text."
                  compact
                />
              )}
            </div>
          </SectionPanel>

          <SectionPanel
            title="Version history"
            description={`${versions.length} immutable version${versions.length === 1 ? "" : "s"}`}
          >
            {versions.length === 0 ? (
              <EmptyState
                icon={FileClock}
                title="No versions available"
                description="Save the template source to create the first version."
                compact
              />
            ) : (
              <ol className="space-y-2" aria-label="Prompt version history">
                {versions.map((version) => {
                  const isActivating = activatingVersionId === version.id;
                  return (
                    <li
                      key={version.id}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-md border bg-background p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Version {version.version}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {version.variables.length} declared variable
                          {version.variables.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      {version.isActive ? (
                        <Badge variant="success">
                          <Check aria-hidden="true" />
                          Active
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void activate(version.id)}
                          disabled={isActivating}
                        >
                          {isActivating ? (
                            <LoaderCircle
                              className="animate-spin motion-reduce:animate-none"
                              aria-hidden="true"
                            />
                          ) : null}
                          {isActivating ? "Activating…" : "Activate"}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </SectionPanel>
        </div>
      </div>
    </div>
  );
}
