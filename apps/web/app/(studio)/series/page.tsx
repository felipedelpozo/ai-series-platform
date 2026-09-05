"use client";

import { useEffect, useState } from "react";
import { Button } from "@ai-series/ui";
import { SeriesEntities } from "@/components/series-entities";
import { SeriesStoryState } from "@/components/series-story-state";
import { SeriesPlans } from "@/components/series-plans";
import { SeriesDecisions } from "@/components/series-decisions";
import { SeriesLoops } from "@/components/series-loops";
import { SeriesTikTok } from "@/components/series-tiktok";

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
  format: string | null;
  language: string | null;
  episodeDuration: string | null;
  narrativeRules: string[];
  visualStyle: string | null;
  canon: string[];
  prohibitions: string[];
  description: string | null;
  source: string;
};

function bibleRevisionJson(bible: Bible): string {
  return JSON.stringify(
    {
      title: bible.title ?? "",
      premise: bible.premise ?? "",
      genre: bible.genre ?? "",
      tone: bible.tone ?? "",
      audience: bible.audience ?? "",
      format: bible.format ?? "",
      language: bible.language ?? "",
      episodeDuration: bible.episodeDuration ?? "",
      narrativeRules: bible.narrativeRules,
      visualStyle: bible.visualStyle ?? "",
      canon: bible.canon,
      prohibitions: bible.prohibitions,
      description: bible.description ?? "",
    },
    null,
    2,
  );
}

function BibleTextField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm">{value || "—"}</dd>
    </div>
  );
}

function BibleListField({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <h5 className="text-xs font-medium text-muted-foreground">{label}</h5>
      {values.length > 0 ? (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
          {values.map((value, index) => (
            <li key={`${index}-${value}`}>{value}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-0.5 text-sm">—</p>
      )}
    </div>
  );
}

export default function SeriesPage() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Series | null>(null);
  const [bibles, setBibles] = useState<Bible[]>([]);
  const [bibleJson, setBibleJson] = useState("{}");
  const [bibleDetails, setBibleDetails] = useState("");
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

  function selectSeries(id: string) {
    setBibleDetails("");
    open(id);
  }

  async function generate() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/series/${selected.id}/generate-bible`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ details: bibleDetails }),
    });
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
                  onClick={() => selectSeries(s.id)}
                  className="w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  {s.name} <span className="text-xs text-muted-foreground">({s.status})</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border p-4">
          {!selected && <p className="text-sm text-muted-foreground">Select or create a series.</p>}
          {selected && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{selected.name}</h3>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3">
                <label htmlFor="bible-details" className="text-sm font-medium">
                  Series details for AI{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  id="bible-details"
                  value={bibleDetails}
                  onChange={(event) => setBibleDetails(event.target.value)}
                  rows={4}
                  maxLength={4000}
                  placeholder="Describe the premise, genre, tone, target audience, visual references, characters, setting, episode length, narrative rules or any constraints the AI should follow."
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    These details will be included in this generation and recorded in its prompt
                    snapshot.
                  </p>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {bibleDetails.length}/4000
                  </span>
                </div>
                <Button className="self-start" onClick={generate} disabled={busy}>
                  {busy ? "Generating bible…" : "Generate bible (AI)"}
                </Button>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground">Bible revisions</h4>
                <ul className="mt-1 flex flex-col gap-1">
                  {bibles.map((b) => (
                    <li key={b.id}>
                      <details open={b.isActive} className="rounded-md border bg-muted/40">
                        <summary className="cursor-pointer px-3 py-2 text-sm font-medium hover:bg-muted">
                          v{b.version} {b.isActive ? "(active)" : ""} · {b.title ?? "untitled"} ·{" "}
                          {b.source}
                        </summary>

                        <div className="flex flex-col gap-4 border-t bg-background p-4">
                          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <BibleTextField label="Title" value={b.title} />
                            <BibleTextField label="Genre" value={b.genre} />
                            <BibleTextField label="Tone" value={b.tone} />
                            <BibleTextField label="Audience" value={b.audience} />
                            <BibleTextField label="Format" value={b.format} />
                            <BibleTextField label="Language" value={b.language} />
                            <BibleTextField label="Episode duration" value={b.episodeDuration} />
                          </dl>

                          <dl className="grid gap-3">
                            <BibleTextField label="Premise" value={b.premise} />
                            <BibleTextField label="Description" value={b.description} />
                            <BibleTextField label="Visual style" value={b.visualStyle} />
                          </dl>

                          <div className="grid gap-4 lg:grid-cols-3">
                            <BibleListField label="Narrative rules" values={b.narrativeRules} />
                            <BibleListField label="Canon" values={b.canon} />
                            <BibleListField label="Prohibitions" values={b.prohibitions} />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setBibleJson(bibleRevisionJson(b))}
                            >
                              Edit as new revision
                            </Button>
                            {!b.isActive && (
                              <Button size="sm" variant="outline" onClick={() => activate(b.id)}>
                                Activate
                              </Button>
                            )}
                          </div>
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-muted-foreground">New revision (JSON)</h4>
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
              <div className="mt-2 border-t pt-2">
                <SeriesStoryState seriesId={selected.id} />
              </div>
              <div className="mt-2 border-t pt-2">
                <SeriesPlans seriesId={selected.id} />
              </div>
              <div className="mt-2 border-t pt-2">
                <SeriesDecisions seriesId={selected.id} />
              </div>
              <div className="mt-2 border-t pt-2">
                <SeriesLoops seriesId={selected.id} />
              </div>
              <div className="mt-2 border-t pt-2">
                <SeriesTikTok seriesId={selected.id} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
