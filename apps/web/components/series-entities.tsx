"use client";

import { useEffect, useState } from "react";
import { Button } from "@ai-series/ui";

type Entity = { id: string; type: string; name: string };
type Version = { id: string; version: number; isActive: boolean; source: string; name: string };
type Sheet = { id: string; status: string; asset: { url: string } | null };

export function SeriesEntities({ seriesId }: { seriesId: string }) {
  const [type, setType] = useState("character");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [name, setName] = useState("");
  const [dataJson, setDataJson] = useState("{}");
  const [versions, setVersions] = useState<Record<string, Version[]>>({});
  const [sheets, setSheets] = useState<Record<string, Sheet[]>>({});
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
    const res = await fetch(`/api/entities/${entityId}/generate`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Generation failed");
      return;
    }
    setError(null);
    open(entityId);
  }

  async function activate(versionId: string) {
    await fetch(`/api/entities/versions/${versionId}/activate`, { method: "POST" });
    load();
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
            <div className="flex items-center justify-between">
              <button onClick={() => open(entity.id)} className="font-medium hover:underline">
                {entity.name}
              </button>
              <Button size="sm" variant="outline" onClick={() => generate(entity.id)}>
                Generate (AI)
              </Button>
              <Button size="sm" variant="outline" onClick={() => generateSheet(entity.id)}>
                Generate sheet
              </Button>
            </div>
            {(versions[entity.id] ?? []).map((v) => (
              <div key={v.id} className="ml-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  v{v.version} {v.isActive ? "(active)" : ""} · {v.source}
                </span>
                {!v.isActive && (
                  <button onClick={() => activate(v.id)} className="underline">
                    activate
                  </button>
                )}
              </div>
            ))}
            {(sheets[entity.id] ?? []).map((sheet) => (
              <div key={sheet.id} className="ml-2 mt-1 flex items-center gap-2 text-xs">
                {sheet.asset && (
                  <img src={sheet.asset.url} alt="sheet" className="h-10 w-10 rounded object-cover" />
                )}
                <span className="text-muted-foreground">{sheet.status}</span>
                <button onClick={() => sheetStatus(sheet.id, "approved", entity.id)} className="underline">
                  approve
                </button>
                <button onClick={() => sheetStatus(sheet.id, "rejected", entity.id)} className="underline">
                  reject
                </button>
                <button onClick={() => promote(sheet.id, entity.id)} className="underline">
                  promote
                </button>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
