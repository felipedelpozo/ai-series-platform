"use client";

import { useEffect, useState } from "react";
import { Button } from "@ai-series/ui";

type Entity = { id: string; type: string; name: string };
type Version = {
  id: string;
  version: number;
  isActive: boolean;
  source: string;
  name: string;
  data: Record<string, unknown>;
};
type Sheet = { id: string; status: string; asset: { url: string } | null };

function fieldLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

function EntityField({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{fieldLabel(label)}</dt>
      <dd className="mt-0.5 text-sm">
        {Array.isArray(value) ? (
          value.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5">
              {value.map((item, index) => (
                <li key={`${index}-${String(item)}`}>{String(item)}</li>
              ))}
            </ul>
          ) : (
            "—"
          )
        ) : typeof value === "object" && value !== null ? (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-2 font-mono text-xs">
            {JSON.stringify(value, null, 2)}
          </pre>
        ) : (
          String(value ?? "—")
        )}
      </dd>
    </div>
  );
}

function EntityVersionData({ data }: { data: Record<string, unknown> }) {
  const fields = Object.entries(data);
  if (fields.length === 0) {
    return <p className="text-xs text-muted-foreground">No details in this version.</p>;
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {fields.map(([key, value]) => (
        <EntityField key={key} label={key} value={value} />
      ))}
    </dl>
  );
}

export function SeriesEntities({ seriesId }: { seriesId: string }) {
  const [type, setType] = useState("character");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [name, setName] = useState("");
  const [dataJson, setDataJson] = useState("{}");
  const [versions, setVersions] = useState<Record<string, Version[]>>({});
  const [sheets, setSheets] = useState<Record<string, Sheet[]>>({});
  const [entityDetails, setEntityDetails] = useState<Record<string, string>>({});
  const [generatingEntityId, setGeneratingEntityId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/entities?seriesId=${seriesId}&type=${type}`)
      .then((r) => r.json())
      .then((d) => setEntities(d.entities as Entity[]));
  }

  useEffect(() => {
    load();
  }, [seriesId, type]);

  async function create() {
    let data;
    try {
      data = JSON.parse(dataJson);
    } catch {
      setError("Invalid data JSON");
      return;
    }
    const res = await fetch("/api/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId, type, name, data }),
    });
    if (!res.ok) {
      setError("Failed to create entity");
      return;
    }
    setError(null);
    setName("");
    setDataJson("{}");
    load();
  }

  async function open(entityId: string) {
    const res = await fetch(`/api/entities/${entityId}`);
    const data = await res.json();
    setVersions((prev) => ({ ...prev, [entityId]: data.versions }));
    const sheetRes = await fetch(`/api/entities/${entityId}/sheets`);
    const sheetData = await sheetRes.json();
    setSheets((prev) => ({ ...prev, [entityId]: sheetData.sheets }));
  }

  async function generate(entityId: string) {
    setGeneratingEntityId(entityId);
    setError(null);
    try {
      const res = await fetch(`/api/entities/${entityId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details: entityDetails[entityId] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }
      await open(entityId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Generation failed");
    } finally {
      setGeneratingEntityId(null);
    }
  }

  async function activate(versionId: string, entityId: string) {
    await fetch(`/api/entities/versions/${versionId}/activate`, { method: "POST" });
    open(entityId);
  }

  async function generateSheet(entityId: string) {
    const res = await fetch(`/api/entities/${entityId}/sheets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Sheet generation failed");
      return;
    }
    setError(null);
    open(entityId);
  }

  async function sheetStatus(sheetId: string, status: string, entityId: string) {
    await fetch(`/api/sheets/${sheetId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    open(entityId);
  }

  async function promote(sheetId: string, entityId: string) {
    await fetch(`/api/sheets/${sheetId}/promote`, { method: "POST" });
    open(entityId);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border bg-background px-2 py-1 text-sm"
        >
          <option value="character">Characters</option>
          <option value="location">Locations</option>
          <option value="prop">Props</option>
        </select>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
        />
        <Button size="sm" onClick={create}>
          Create
        </Button>
      </div>
      <label className="text-xs text-muted-foreground">
        Data (JSON)
        <textarea
          value={dataJson}
          onChange={(e) => setDataJson(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border bg-background px-2 py-1 font-mono text-xs"
        />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <ul className="flex flex-col gap-1">
        {entities.map((entity) => (
          <li key={entity.id} className="rounded-md border px-2 py-1 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button onClick={() => open(entity.id)} className="font-medium hover:underline">
                {entity.name}
              </button>
              <Button size="sm" variant="outline" onClick={() => generateSheet(entity.id)}>
                Generate sheet
              </Button>
            </div>
            <div className="mt-2 flex flex-col gap-2 rounded-md bg-muted/30 p-3">
              <label htmlFor={`entity-details-${entity.id}`} className="text-xs font-medium">
                Details for AI <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id={`entity-details-${entity.id}`}
                value={entityDetails[entity.id] ?? ""}
                onChange={(event) =>
                  setEntityDetails((current) => ({
                    ...current,
                    [entity.id]: event.target.value,
                  }))
                }
                rows={3}
                maxLength={4000}
                placeholder={`Describe the ${entity.type}'s role, appearance, personality, environment, visual references, state or any constraints the AI should follow.`}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Used for this generation and recorded in its prompt snapshot.
                </p>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {(entityDetails[entity.id] ?? "").length}/4000
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="self-start"
                disabled={generatingEntityId !== null}
                onClick={() => generate(entity.id)}
              >
                {generatingEntityId === entity.id ? "Generating…" : "Generate with AI"}
              </Button>
            </div>
            {(versions[entity.id] ?? []).map((v) => (
              <details key={v.id} open={v.isActive} className="mt-2 rounded-md border bg-muted/20">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium hover:bg-muted">
                  v{v.version} {v.isActive ? "(active)" : ""} · {v.source}
                </summary>
                <div className="flex flex-col gap-3 border-t bg-background p-3">
                  <EntityVersionData data={v.data} />
                  {!v.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="self-start"
                      onClick={() => activate(v.id, entity.id)}
                    >
                      Activate
                    </Button>
                  )}
                </div>
              </details>
            ))}
            {(sheets[entity.id] ?? []).map((sheet) => (
              <div key={sheet.id} className="mt-2 flex flex-col gap-2 rounded-md border bg-muted/20 p-2">
                {sheet.asset && (
                  <button
                    type="button"
                    onClick={() => window.open(sheet.asset!.url, "_blank")}
                    title="Open full-size sheet"
                    className="group relative w-full overflow-hidden rounded-md border bg-background"
                  >
                    <img
                      src={sheet.asset.url}
                      alt={`${entity.name} reference sheet`}
                      className="max-h-64 w-full object-contain"
                    />
                    <span className="absolute bottom-2 right-2 rounded-md bg-background/80 px-2 py-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      Open full size
                    </span>
                  </button>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{sheet.status}</span>
                  <button
                    onClick={() => sheetStatus(sheet.id, "approved", entity.id)}
                    className="underline"
                  >
                    approve
                  </button>
                  <button
                    onClick={() => sheetStatus(sheet.id, "rejected", entity.id)}
                    className="underline"
                  >
                    reject
                  </button>
                  <button onClick={() => promote(sheet.id, entity.id)} className="underline">
                    promote
                  </button>
                </div>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
