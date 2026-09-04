"use client";

import { useEffect, useState } from "react";
import { Button } from "@ai-series/ui";

type Entity = { id: string; type: string; name: string };
type Version = { id: string; version: number; isActive: boolean; source: string; name: string };

export function SeriesEntities({ seriesId }: { seriesId: string }) {
  const [type, setType] = useState("character");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [name, setName] = useState("");
  const [dataJson, setDataJson] = useState("{}");
  const [versions, setVersions] = useState<Record<string, Version[]>>({});
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
          </li>
        ))}
      </ul>
    </div>
  );
}
