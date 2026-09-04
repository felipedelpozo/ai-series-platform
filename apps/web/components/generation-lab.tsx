"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@ai-series/ui";

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

export function GenerationLab() {
  const [mode, setMode] = useState<"image" | "video">("image");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [imageAssets, setImageAssets] = useState<Asset[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [sourceAssetId, setSourceAssetId] = useState<string>("");
  const [version, setVersion] = useState<Version | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [paramsJson, setParamsJson] = useState("{}");
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => r.json())
      .then((d) => {
        const imagePurposes = new Set(["test.image", "image.generate"]);
        const videoPurposes = new Set(["test.video", "video.generate"]);
        setTemplates(
          (d.templates as Template[]).filter((t) =>
            mode === "image" ? imagePurposes.has(t.purpose) : videoPurposes.has(t.purpose),
          ),
        );
      })
      .catch(() => setError("Failed to load templates"));
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode]);

  useEffect(() => {
    if (mode === "video") {
      fetch("/api/assets?kind=image")
        .then((r) => r.json())
        .then((d) => setImageAssets(d.assets as Asset[]))
        .catch(() => undefined);
    }
  }, [mode]);

  async function selectTemplate(id: string) {
    setTemplateId(id);
    setGeneration(null);
    setAsset(null);
    setError(null);
    const res = await fetch(`/api/prompts/${id}`);
    const detail = await res.json();
    const active = detail.versions.find((v: Version) => v.isActive) ?? detail.versions[0];
    setVersion(active);
    const initial: Record<string, string> = {};
    for (const variable of active.variables) {
      initial[variable.name] = variable.default ?? "";
    }
    setValues(initial);
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setGeneration(null);
    setAsset(null);

    let params: Record<string, unknown> = {};
    try {
      params = JSON.parse(paramsJson) as Record<string, unknown>;
    } catch {
      setError("Invalid params JSON");
      setBusy(false);
      return;
    }

    const res = await fetch("/api/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: mode,
        templateId,
        variables: values,
        params,
        sourceAssetId: mode === "video" && sourceAssetId ? sourceAssetId : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to start generation");
      setBusy(false);
      return;
    }
    setGeneration({
      id: data.jobId,
      status: "queued",
      requestId: null,
      error: null,
      model: "",
      kind: mode,
    });
    setBusy(false);
    poll(data.jobId);
  }

  function poll(id: string) {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(async () => {
      const res = await fetch(`/api/generations/${id}`);
      const data = await res.json();
      const job = data.job as {
        id: string;
        status: string;
        error: string | null;
        kind: string;
        model: string | null;
        providerRequestId: string | null;
      };
      const gen: Generation = {
        id: job.id,
        status: job.status,
        requestId: job.providerRequestId,
        error: job.error,
        model: job.model ?? "",
        kind: job.kind,
      };
      setGeneration(gen);
      if (job.status === "succeeded") {
        setAsset(data.asset as Asset);
        if (timerRef.current) clearInterval(timerRef.current);
      } else if (job.status === "failed") {
        setError(job.error ?? "Generation failed");
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 3000);
  }

  return (
    <div className="grid grid-cols-[340px_1fr] gap-4">
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === "image" ? "default" : "outline"}
            onClick={() => setMode("image")}
          >
            Image
          </Button>
          <Button
            size="sm"
            variant={mode === "video" ? "default" : "outline"}
            onClick={() => setMode("video")}
          >
            Video
          </Button>
        </div>

        <label className="text-xs text-muted-foreground">
          Template
          <select
            value={templateId}
            onChange={(event) => selectTemplate(event.target.value)}
            className="mt-1 block w-full rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="">Select a template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.purpose})
              </option>
            ))}
          </select>
        </label>

        {mode === "video" && imageAssets.length > 0 && (
          <label className="text-xs text-muted-foreground">
            Source image (optional, image-to-video)
            <select
              value={sourceAssetId}
              onChange={(event) => setSourceAssetId(event.target.value)}
              className="mt-1 block w-full rounded-md border bg-background px-2 py-1 text-sm"
            >
              <option value="">None (text-to-video)</option>
              {imageAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id.slice(0, 8)}…
                </option>
              ))}
            </select>
          </label>
        )}

        {version && (
          <>
            {version.variables.map((variable) => (
              <label key={variable.name} className="text-xs text-muted-foreground">
                {variable.name}
                {variable.required ? " *" : ""}
                <input
                  value={values[variable.name] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [variable.name]: event.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
            ))}
            <label className="text-xs text-muted-foreground">
              Params (JSON)
              <textarea
                value={paramsJson}
                onChange={(event) => setParamsJson(event.target.value)}
                className="mt-1 block w-full rounded-md border bg-background px-2 py-1 font-mono text-xs"
                rows={3}
              />
            </label>
          </>
        )}

        <Button onClick={generate} disabled={busy || !templateId}>
          Generate
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Result</h3>
        {generation && (
          <div className="mt-2 text-sm">
            <p>
              Status: <span className="font-medium">{generation.status}</span>
            </p>
            {generation.requestId && (
              <p className="text-xs text-muted-foreground">Request: {generation.requestId}</p>
            )}
            {generation.status === "failed" && generation.error && (
              <p className="text-destructive">{generation.error}</p>
            )}
          </div>
        )}
        {asset && asset.kind === "image" && (
          <img
            src={asset.url}
            alt="Generated"
            className="mt-3 max-h-[480px] rounded-lg border object-contain"
          />
        )}
        {asset && asset.kind === "video" && (
          <video src={asset.url} controls className="mt-3 max-h-[480px] rounded-lg border" />
        )}
        {!generation && !asset && (
          <p className="mt-2 text-sm text-muted-foreground">
            Select a template and generate a real {mode}.
          </p>
        )}
      </div>
    </div>
  );
}
