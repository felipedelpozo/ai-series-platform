"use client";

import { useEffect, useState } from "react";
import { Button } from "@ai-series/ui";
import { SeriesEntities } from "@/components/series-entities";

type Series = { id: string; name: string; slug: string; status: string };
type Bible = {
  id: string;
  version: number;
  isActive: boolean;
  title: string | null;
  premise: string | null;
  genre: string | null;
  tone: string | null;
  audience: string | null;
  source: string;
};

export default function SeriesPage() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Series | null>(null);
  const [bibles, setBibles] = useState<Bible[]>([]);
  const [bibleJson, setBibleJson] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadSeries() {
    fetch("/api/series")
      .then((r) => r.json())
      .then((d) => setSeriesList(d.series as Series[]));
  }

  useEffect(() => {
    loadSeries();
  }, []);

  async function create() {
    const res = await fetch("/api/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setError("Failed to create series");
      return;
    }
    setName("");
    loadSeries();
  }

  async function open(id: string) {
    const res = await fetch(`/api/series/${id}`);
    const data = await res.json();
    setSelected(data.series);
    setBibles(data.bibles);
  }

  async function generate() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/series/${selected.id}/generate-bible`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Generation failed");
      return;
    }
    open(selected.id);
  }

  async function saveBible() {
    if (!selected) return;
    let body;
    try {
      body = JSON.parse(bibleJson);
    } catch {
      setError("Invalid bible JSON");
      return;
    }
    const res = await fetch(`/api/series/${selected.id}/bible`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save bible");
      return;
    }
    setError(null);
    open(selected.id);
  }

  async function activate(bibleId: string) {
    await fetch(`/api/series/bibles/${bibleId}/activate`, { method: "POST" });
    if (selected) open(selected.id);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <h2 className="text-2xl font-semibold">Series</h2>

      <div className="grid grid-cols-[320px_1fr] gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Series name"
              className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
            />
            <Button onClick={create}>Create</Button>
          </div>
          <ul className="flex flex-col gap-1">
            {seriesList.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => open(s.id)}
                  className="w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  {s.name} <span className="text-xs text-muted-foreground">({s.status})</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border p-4">
          {!selected && (
            <p className="text-sm text-muted-foreground">Select or create a series.</p>
          )}
          {selected && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{selected.name}</h3>
                <Button onClick={generate} disabled={busy}>
                  Generate bible (AI)
                </Button>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground">Bible revisions</h4>
                <ul className="mt-1 flex flex-col gap-1">
                  {bibles.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between rounded-md bg-muted px-2 py-1 text-xs"
                    >
                      <span>
                        v{b.version} {b.isActive ? "(active)" : ""} · {b.title ?? "untitled"} ·{" "}
                        {b.source}
                      </span>
                      {!b.isActive && (
                        <Button size="sm" variant="outline" onClick={() => activate(b.id)}>
                          Activate
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-muted-foreground">
                  New revision (JSON)
                </h4>
                <textarea
                  value={bibleJson}
                  onChange={(e) => setBibleJson(e.target.value)}
                  rows={8}
                  className="rounded-md border bg-background px-2 py-1 font-mono text-xs"
                  placeholder='{"title":"...","premise":"...","genre":"...","tone":"...","audience":"...","format":"...","language":"es","episodeDuration":"60s","narrativeRules":[],"visualStyle":"...","canon":[],"prohibitions":[],"description":"..."}'
                />
                <Button variant="outline" onClick={saveBible}>
                  Save revision
                </Button>
              </div>

              <div className="mt-2 border-t pt-2">
                <SeriesEntities seriesId={selected.id} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
