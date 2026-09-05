"use client";

import { useEffect, useState } from "react";
import { Button } from "@ai-series/ui";
import { PlanQa } from "@/components/plan-qa";

type Shot = { id: string; order: number; status: string; data: Record<string, unknown> };
type Scene = { id: string; order: number; data: { purpose?: string }; shots: Shot[] };

export default function EpisodeStudioPage({ params }: { params: Promise<{ planId: string }> }) {
  const [planId, setPlanId] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [preview, setPreview] = useState<{ keyframeAsset: { url: string } | null; videoAsset: { url: string } | null } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    params.then((p) => setPlanId(p.planId));
  }, [params]);

  useEffect(() => {
    if (!planId) return;
    fetch(`/api/plans/${planId}/scenes`)
      .then((r) => r.json())
      .then((d) => setScenes(d.scenes as Scene[]));
  }, [planId]);

  async function selectShot(shot: Shot) {
    setSelectedShot(shot);
    setImagePrompt(String(shot.data.imagePrompt ?? ""));
    setVideoPrompt(String(shot.data.videoPrompt ?? ""));
    const res = await fetch(`/api/shots/${shot.id}/preview`);
    if (res.ok) setPreview(await res.json());
  }

  async function saveShot() {
    if (!selectedShot) return;
    setBusy(true);
    await fetch(`/api/shots/${selectedShot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { ...selectedShot.data, imagePrompt, videoPrompt },
      }),
    });
    setBusy(false);
    setScenes((prev) =>
      prev.map((sc) => ({
        ...sc,
        shots: sc.shots.map((s) =>
          s.id === selectedShot.id ? { ...s, data: { ...s.data, imagePrompt, videoPrompt } } : s,
        ),
      })),
    );
  }

  async function regenerate(kind: string) {
    if (!selectedShot) return;
    setBusy(true);
    await fetch(`/api/shots/${selectedShot.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    setBusy(false);
    selectShot(selectedShot);
  }

  async function generateVoice() {
    if (!selectedShot) return;
    const text = String(selectedShot.data.imagePrompt ?? "narrated line");
    await fetch(`/api/shots/${selectedShot.id}/voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  }

  async function exportPlan() {
    const res = await fetch(`/api/plans/${planId}/export`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      window.open(`/api/assets/${data.assetId}/content`, "_blank");
    }
  }

  return (
    <div className="flex h-full gap-4">
      <div className="w-64 shrink-0 overflow-y-auto rounded-lg border p-3">
        <h3 className="text-sm font-semibold">Scenes</h3>
        <ul className="mt-2 flex flex-col gap-1">
          {scenes.map((scene) => (
            <li key={scene.id}>
              <p className="text-xs text-muted-foreground">
                Scene {scene.order + 1}: {String(scene.data.purpose ?? "")}
              </p>
              <ul className="ml-3 flex flex-col gap-1">
                {scene.shots.map((shot) => (
                  <li key={shot.id}>
                    <button
                      onClick={() => selectShot(shot)}
                      className="w-full rounded-md border px-2 py-1 text-left text-xs hover:bg-accent"
                    >
                      Shot {shot.order + 1} · {shot.status}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-1 items-center justify-center rounded-lg border p-4">
        {preview?.keyframeAsset ? (
          <img src={preview.keyframeAsset.url} alt="keyframe" className="max-h-full rounded-lg object-contain" />
        ) : preview?.videoAsset ? (
          <video src={preview.videoAsset.url} controls className="max-h-full rounded-lg" />
        ) : (
          <p className="text-sm text-muted-foreground">Select a shot to preview.</p>
        )}
      </div>

      <div className="flex w-80 shrink-0 flex-col gap-2 overflow-y-auto rounded-lg border p-3">
        <h3 className="text-sm font-semibold">Inspector</h3>
        {!selectedShot && <p className="text-xs text-muted-foreground">No shot selected.</p>}
        {selectedShot && (
          <>
            <label className="text-xs text-muted-foreground">
              Image prompt
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border bg-background px-2 py-1 font-mono text-xs"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Video prompt
              <textarea
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border bg-background px-2 py-1 font-mono text-xs"
              />
            </label>
            <Button onClick={saveShot} disabled={busy}>
              Save
            </Button>
            <Button variant="outline" onClick={() => regenerate("keyframe")} disabled={busy}>
              Regenerate keyframe
            </Button>
            <Button variant="outline" onClick={() => regenerate("video")} disabled={busy}>
              Regenerate video
            </Button>
            <Button variant="outline" onClick={generateVoice}>
              Generate voice
            </Button>
            <Button variant="outline" onClick={exportPlan}>
              Export episode
            </Button>
          </>
        )}
        <div className="mt-2 border-t pt-2">
          <PlanQa planId={planId} />
        </div>
      </div>
    </div>
  );
}
