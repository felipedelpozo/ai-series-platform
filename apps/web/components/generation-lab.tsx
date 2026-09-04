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
};
type Asset = { id: string; url: string; mime: string };

export function GenerationLab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
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
        const filtered = (d.templates as Template[]).filter(
          (t) => t.purpose === "test.image" || t.purpose === "image.generate",
        );
        setTemplates(filtered);
      })
      .catch(() => setError("Failed to load templates"));
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
      body: JSON.stringify({ templateId, variables: values, params }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to start generation");
      setBusy(false);
      return;
    }
    setGeneration({
      id: data.id,
      status: "queued",
      requestId: data.requestId,
      error: null,
      model: "",
    });
    setBusy(false);
    poll(data.id);
  }

  function poll(id: string) {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(async () => {
      const res = await fetch(`/api/generations/${id}`);
      const data = await res.json();
      const gen = data.generation as Generation;
      setGeneration(gen);
      if (gen.status === "succeeded") {
        setAsset(data.asset as Asset);
        if (timerRef.current) clearInterval(timerRef.current);
      } else if (gen.status === "failed") {
        setError(gen.error ?? "Generation failed");
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 2000);
  }

  return (
    <div className="grid grid-cols-[340px_1fr] gap-4">
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Generate image</h3>
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
        {asset && (
          <img
            src={asset.url}
            alt="Generated"
            className="mt-3 max-h-[480px] rounded-lg border object-contain"
          />
        )}
        {!generation && !asset && (
          <p className="mt-2 text-sm text-muted-foreground">
            Select a template and generate a real image.
          </p>
        )}
      </div>
    </div>
  );
}
