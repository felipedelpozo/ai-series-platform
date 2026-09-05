"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@ai-series/ui";
import {
  EmptyState,
  InlineNotice,
  LoadingSkeleton,
  SectionPanel,
  StatusBadge,
} from "@/components/ui";
import { studioMutation } from "@/lib/studio-mutation";

type Template = { id: string; name: string; purpose: string };
type Variable = { name: string; required: boolean; default?: string };
type Version = { id: string; template: string; variables: Variable[]; isActive: boolean };
type Generation = {
  id: string;
  status: string;
  requestId: string | null;
  error: string | null;
  model: string;
  kind: string;
};
type Asset = { id: string; url: string; mime: string; kind: string };

const ACTIVE_GENERATION_STATUSES = new Set(["queued", "running", "processing", "generating"]);

async function responseError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function GenerationLab({ onJobChange }: { onJobChange?: () => void }) {
  const [mode, setMode] = useState<"image" | "video">("image");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [imageAssets, setImageAssets] = useState<Asset[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [sourceAssetId, setSourceAssetId] = useState("none");
  const [version, setVersion] = useState<Version | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [paramsJson, setParamsJson] = useState("{}");
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [templateDetailLoading, setTemplateDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const templateRequestRef = useRef(0);
  const onJobChangeRef = useRef(onJobChange);
  const submittingRef = useRef(false);
  const attemptRef = useRef<{ signature: string; key: string } | null>(null);

  useEffect(() => {
    onJobChangeRef.current = onJobChange;
  }, [onJobChange]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const imagePurposes = new Set(["test.image", "image.generate"]);
    const videoPurposes = new Set(["test.video", "video.generate"]);

    const start = setTimeout(() => {
      setTemplatesLoading(true);
      setTemplatesError(null);
      fetch("/api/prompts", { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(await responseError(response, "Could not load prompt templates."));
          }
          return response.json() as Promise<{ templates?: Template[] }>;
        })
        .then((data) => {
          if (!mountedRef.current) return;
          const available = Array.isArray(data.templates) ? data.templates : [];
          setTemplates(
            available.filter((template) =>
              mode === "image"
                ? imagePurposes.has(template.purpose)
                : videoPurposes.has(template.purpose),
            ),
          );
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          if (mountedRef.current) {
            setTemplatesError(
              error instanceof Error ? error.message : "Could not load prompt templates.",
            );
          }
        })
        .finally(() => {
          if (mountedRef.current && !controller.signal.aborted) setTemplatesLoading(false);
        });
    }, 0);

    return () => {
      clearTimeout(start);
      controller.abort();
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "video") return;
    const controller = new AbortController();
    const start = setTimeout(() => {
      setAssetsLoading(true);
      setAssetsError(null);

      fetch("/api/assets?kind=image", { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(await responseError(response, "Could not load source images."));
          }
          return response.json() as Promise<{ assets?: Asset[] }>;
        })
        .then((data) => {
          if (mountedRef.current) setImageAssets(Array.isArray(data.assets) ? data.assets : []);
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          if (mountedRef.current) {
            setAssetsError(
              error instanceof Error ? error.message : "Could not load source images.",
            );
          }
        })
        .finally(() => {
          if (mountedRef.current && !controller.signal.aborted) setAssetsLoading(false);
        });
    }, 0);

    return () => {
      clearTimeout(start);
      controller.abort();
    };
  }, [mode]);

  function changeMode(nextMode: "image" | "video") {
    if (nextMode === mode) return;
    templateRequestRef.current += 1;
    setMode(nextMode);
    setTemplateId("");
    setSourceAssetId("none");
    setVersion(null);
    setValues({});
    setFormError(null);
  }

  async function selectTemplate(id: string) {
    const requestId = ++templateRequestRef.current;
    setTemplateId(id);
    setVersion(null);
    setValues({});
    setFormError(null);
    if (!id) return;

    setTemplateDetailLoading(true);
    try {
      const response = await fetch(`/api/prompts/${id}`);
      if (!response.ok) {
        throw new Error(await responseError(response, "Could not load this template."));
      }
      const detail = (await response.json()) as { versions?: Version[] };
      const versions = Array.isArray(detail.versions) ? detail.versions : [];
      const active = versions.find((candidate) => candidate.isActive) ?? versions[0];
      if (!active) throw new Error("This template has no version available for generation.");

      if (mountedRef.current && requestId === templateRequestRef.current) {
        setVersion(active);
        setValues(
          Object.fromEntries(
            active.variables.map((variable) => [variable.name, variable.default ?? ""]),
          ),
        );
      }
    } catch (error) {
      if (mountedRef.current && requestId === templateRequestRef.current) {
        setFormError(error instanceof Error ? error.message : "Could not load this template.");
      }
    } finally {
      if (mountedRef.current && requestId === templateRequestRef.current) {
        setTemplateDetailLoading(false);
      }
    }
  }

  function stopPolling() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  async function checkGeneration(id: string) {
    stopPolling();
    setPollError(null);
    try {
      const response = await fetch(`/api/generations/${id}`);
      if (!response.ok) {
        throw new Error(await responseError(response, "Could not refresh generation status."));
      }
      const data = (await response.json()) as {
        job: {
          id: string;
          status: string;
          error: string | null;
          kind: string;
          model: string | null;
          providerRequestId: string | null;
        };
        asset?: Asset | null;
      };
      if (!mountedRef.current) return;

      const nextGeneration: Generation = {
        id: data.job.id,
        status: data.job.status,
        requestId: data.job.providerRequestId,
        error: data.job.error,
        model: data.job.model ?? "",
        kind: data.job.kind,
      };
      setGeneration(nextGeneration);
      onJobChangeRef.current?.();

      if (data.job.status === "succeeded") {
        setAsset(data.asset ?? null);
        setAnnouncement(
          data.asset
            ? `Generation succeeded. ${data.job.kind} preview is ready.`
            : "Generation succeeded, but no preview asset was returned.",
        );
        return;
      }
      if (data.job.status === "failed") {
        setAnnouncement("Generation failed. Review the error and try again.");
        return;
      }
      if (data.job.status === "cancelled") {
        setAnnouncement("Generation was cancelled. You can adjust the inputs and try again.");
        return;
      }

      timerRef.current = setTimeout(() => void checkGeneration(id), 3000);
    } catch (error) {
      if (!mountedRef.current) return;
      setPollError(error instanceof Error ? error.message : "Could not refresh generation status.");
      setAnnouncement("Generation status could not be refreshed. Retry the status check.");
    }
  }

  async function generate() {
    if (
      !templateId ||
      !version ||
      submittingRef.current ||
      ACTIVE_GENERATION_STATUSES.has(generation?.status ?? "")
    )
      return;
    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    setPollError(null);
    setGeneration(null);
    setAsset(null);
    setPreviewError(false);
    setAnnouncement("Starting generation.");

    let params: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(paramsJson) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Generation params must be a JSON object.");
      }
      params = parsed as Record<string, unknown>;
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Generation params are invalid JSON.");
      setSubmitting(false);
      submittingRef.current = false;
      setAnnouncement("Generation was not started. Correct the params JSON and try again.");
      return;
    }

    const requestBody = {
      type: mode,
      templateId,
      variables: values,
      params,
      sourceAssetId: mode === "video" && sourceAssetId !== "none" ? sourceAssetId : undefined,
    };
    const signature = JSON.stringify(requestBody);
    const attempt =
      attemptRef.current?.signature === signature
        ? attemptRef.current
        : { signature, key: crypto.randomUUID() };
    attemptRef.current = attempt;

    try {
      const response = await studioMutation("generations.create", "/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...requestBody, idempotencyKey: attempt.key }),
      });
      if (!response.ok) {
        attemptRef.current = null;
        throw new Error(await responseError(response, "Could not start generation."));
      }
      const data = (await response.json()) as { jobId: string };
      if (!mountedRef.current) return;

      setGeneration({
        id: data.jobId,
        status: "queued",
        requestId: null,
        error: null,
        model: "",
        kind: mode,
      });
      setAnnouncement("Generation queued. Status will update automatically.");
      attemptRef.current = null;
      onJobChangeRef.current?.();
      void checkGeneration(data.jobId);
    } catch (error) {
      if (!mountedRef.current) return;
      setFormError(error instanceof Error ? error.message : "Could not start generation.");
      setAnnouncement("Generation could not be started. Inputs have been retained.");
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  }

  const generationActive = ACTIVE_GENERATION_STATUSES.has(generation?.status ?? "");
  const canGenerate = Boolean(templateId && version) && !submitting && !generationActive;
  const generateLabel = submitting
    ? "Starting generation\u2026"
    : generation?.status === "failed" || generation?.status === "cancelled"
      ? "Try generation again"
      : generationActive
        ? "Generation in progress\u2026"
        : `Generate ${mode}`;

  return (
    <SectionPanel
      title="New generation"
      description="Choose a production template, supply its variables and send one real job to the queue."
    >
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <form
          className="min-w-0 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void generate();
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Output type</legend>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === "image" ? "default" : "outline"}
                aria-pressed={mode === "image"}
                onClick={() => changeMode("image")}
              >
                Image
              </Button>
              <Button
                type="button"
                variant={mode === "video" ? "default" : "outline"}
                aria-pressed={mode === "video"}
                onClick={() => changeMode("video")}
              >
                Video
              </Button>
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="generation-template">Prompt template</Label>
            <Select
              value={templateId || undefined}
              onValueChange={(value) => void selectTemplate(value)}
              disabled={templatesLoading}
            >
              <SelectTrigger id="generation-template" aria-label="Prompt template">
                <SelectValue
                  placeholder={templatesLoading ? "Loading templates\u2026" : "Select a template"}
                />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} · {template.purpose}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!templatesLoading && !templatesError && templates.length === 0 ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                No {mode} generation templates are available. Create and activate a compatible
                prompt template before starting a job.
              </p>
            ) : null}
          </div>

          {templatesError ? (
            <InlineNotice title="Templates are unavailable" variant="destructive">
              {templatesError}
            </InlineNotice>
          ) : null}

          {mode === "video" ? (
            <div className="space-y-2">
              <Label htmlFor="generation-source-image">Source image</Label>
              <Select
                value={sourceAssetId}
                onValueChange={setSourceAssetId}
                disabled={assetsLoading || imageAssets.length === 0}
              >
                <SelectTrigger id="generation-source-image" aria-label="Source image">
                  <SelectValue
                    placeholder={assetsLoading ? "Loading source images\u2026" : "Text to video"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None · text to video</SelectItem>
                  {imageAssets.map((imageAsset) => (
                    <SelectItem key={imageAsset.id} value={imageAsset.id}>
                      Image {imageAsset.id.slice(0, 8)}\u2026
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Optional. Select an existing image to use image-to-video generation.
              </p>
              {assetsError ? (
                <InlineNotice title="Source images are unavailable" variant="warning">
                  {assetsError} You can still use text-to-video.
                </InlineNotice>
              ) : null}
            </div>
          ) : null}

          {templateDetailLoading ? <LoadingSkeleton rows={1} /> : null}

          {version && !templateDetailLoading ? (
            <div className="space-y-4 border-t pt-5">
              <div>
                <h3 className="text-sm font-semibold">Prompt variables</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Required values are marked. Inputs remain here if the request fails.
                </p>
              </div>
              {version.variables.length === 0 ? (
                <p className="rounded-md bg-muted/45 px-3 py-2 text-xs text-muted-foreground">
                  This template does not require variables.
                </p>
              ) : null}
              {version.variables.map((variable) => {
                const inputId = `generation-variable-${variable.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
                return (
                  <div key={variable.name} className="space-y-2">
                    <Label htmlFor={inputId}>
                      {variable.name}
                      {variable.required ? <span aria-hidden="true"> *</span> : null}
                      {variable.required ? <span className="sr-only"> (required)</span> : null}
                    </Label>
                    <Input
                      id={inputId}
                      required={variable.required}
                      value={values[variable.name] ?? ""}
                      onChange={(event) =>
                        setValues((previous) => ({
                          ...previous,
                          [variable.name]: event.target.value,
                        }))
                      }
                    />
                  </div>
                );
              })}
              <div className="space-y-2">
                <Label htmlFor="generation-params">Generation params (JSON)</Label>
                <Textarea
                  id="generation-params"
                  value={paramsJson}
                  onChange={(event) => setParamsJson(event.target.value)}
                  className="min-h-28 font-mono text-xs"
                  aria-describedby="generation-params-help"
                  aria-invalid={Boolean(formError?.toLowerCase().includes("json"))}
                  spellCheck={false}
                />
                <p
                  id="generation-params-help"
                  className="text-xs leading-relaxed text-muted-foreground"
                >
                  Provider-specific options as one JSON object. Use {"{}"} to keep defaults.
                </p>
              </div>
            </div>
          ) : null}

          {formError ? (
            <InlineNotice title="Generation was not started" variant="destructive">
              {formError}
            </InlineNotice>
          ) : null}

          <Button type="submit" className="w-full" disabled={!canGenerate}>
            {generateLabel}
          </Button>
          {generationActive ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              A new request stays locked until this job succeeds, fails or is cancelled.
            </p>
          ) : null}
        </form>

        <div className="min-w-0 rounded-xl border bg-muted/15 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
            <div>
              <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-primary">
                Live output
              </p>
              <h3 className="mt-1 text-base font-semibold">Preview and job status</h3>
            </div>
            {generation ? <StatusBadge status={generation.status} /> : null}
          </div>

          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {announcement}
          </div>

          {pollError ? (
            <div className="mt-4">
              <InlineNotice title="Live status paused" variant="destructive">
                <div className="flex flex-wrap items-center gap-3">
                  <span>{pollError}</span>
                  {generation ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void checkGeneration(generation.id)}
                    >
                      Retry status check
                    </Button>
                  ) : null}
                </div>
              </InlineNotice>
            </div>
          ) : null}

          {!generation && !asset ? (
            <EmptyState
              compact
              className="mt-4 border-0 bg-transparent"
              title={`No ${mode} generated yet`}
              description="Complete the configuration and start a job. Its live state and resulting preview will stay in this panel."
            />
          ) : null}

          {generation ? (
            <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Job</dt>
              <dd className="truncate text-right font-mono text-xs">{generation.id}</dd>
              <dt className="text-muted-foreground">Output</dt>
              <dd className="text-right capitalize">{generation.kind}</dd>
              <dt className="text-muted-foreground">Model</dt>
              <dd className="truncate text-right">{generation.model || "Assigning\u2026"}</dd>
              <dt className="text-muted-foreground">Provider request</dt>
              <dd className="truncate text-right font-mono text-xs">
                {generation.requestId ?? "Waiting\u2026"}
              </dd>
            </dl>
          ) : null}

          {generation?.status === "failed" ? (
            <div className="mt-4">
              <InlineNotice title="Generation failed" variant="destructive">
                {generation.error ?? "The provider did not return an error message."} Your inputs
                are still available; use “Try generation again” when ready.
              </InlineNotice>
            </div>
          ) : null}

          {generation?.status === "cancelled" ? (
            <div className="mt-4">
              <InlineNotice title="Generation cancelled" variant="warning">
                No output was selected. Adjust the current inputs or start the same request again.
              </InlineNotice>
            </div>
          ) : null}

          {generationActive ? (
            <div className="mt-5 overflow-hidden rounded-xl border bg-background">
              <div
                className="aspect-video animate-pulse bg-muted motion-reduce:animate-none"
                aria-hidden="true"
              />
              <div className="border-t p-4">
                <p className="text-sm font-medium capitalize">{generation?.status} generation</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This panel checks the job every three seconds until it reaches a terminal state.
                </p>
              </div>
            </div>
          ) : null}

          {asset && !previewError ? (
            <figure className="mt-5 overflow-hidden rounded-xl border bg-background">
              <div className="grid min-h-64 place-items-center bg-black/95">
                {asset.kind === "image" ? (
                  <img
                    src={asset.url}
                    alt={`Generated image asset ${asset.id}`}
                    className="max-h-[34rem] w-full object-contain"
                    onError={() => setPreviewError(true)}
                  />
                ) : (
                  <video
                    src={asset.url}
                    controls
                    preload="metadata"
                    aria-label={`Generated video asset ${asset.id}`}
                    className="max-h-[34rem] w-full"
                    onError={() => setPreviewError(true)}
                  />
                )}
              </div>
              <figcaption className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t p-3 text-xs text-muted-foreground">
                <span className="capitalize">{asset.kind} preview</span>
                <span className="truncate font-mono">{asset.id}</span>
              </figcaption>
            </figure>
          ) : null}

          {previewError ? (
            <div className="mt-4">
              <InlineNotice title="Preview could not be displayed" variant="warning">
                The generation completed, but this browser could not load the returned media.
              </InlineNotice>
            </div>
          ) : null}

          {generation?.status === "succeeded" && !asset ? (
            <div className="mt-4">
              <InlineNotice title="Generation completed without a preview" variant="warning">
                The job succeeded, but no asset was returned for this result.
              </InlineNotice>
            </div>
          ) : null}
        </div>
      </div>
    </SectionPanel>
  );
}
