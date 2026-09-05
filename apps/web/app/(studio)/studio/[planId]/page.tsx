"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Label, Textarea, cn } from "@ai-series/ui";
import {
  Clapperboard,
  Download,
  Film,
  ImageIcon,
  LoaderCircle,
  Mic2,
  RefreshCw,
  Save,
  ScrollText,
} from "lucide-react";
import {
  EmptyState,
  InlineNotice,
  LoadingSkeleton,
  PageHeader,
  SectionPanel,
  StatusBadge,
} from "@/components/ui";
import { PlanQa } from "@/components/plan-qa";
import { studioMutation } from "@/lib/studio-mutation";

type Shot = { id: string; order: number; status: string; data: Record<string, unknown> };
type Scene = { id: string; order: number; data: { purpose?: string }; shots: Shot[] };
type Preview = {
  keyframeAsset: { url: string } | null;
  videoAsset: { url: string } | null;
  steps?: { id: string; kind: string; status: string }[];
};
type StudioAction = "save" | "keyframe" | "video" | "voice" | "export";
type Feedback = {
  variant: "success" | "destructive";
  title: string;
  detail: string;
  retry?: StudioAction;
};

const GENERATION_POLL_INTERVAL_MS = 1_500;
const GENERATION_TIMEOUT_MS = 120_000;

async function getResponseError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

async function waitForGeneration(
  shotId: string,
  stepId: string,
  kind: "keyframe" | "video",
  isMounted: () => boolean,
) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < GENERATION_TIMEOUT_MS) {
    if (!isMounted()) throw new DOMException("Page closed", "AbortError");
    const response = await fetch(`/api/shots/${shotId}/preview`);
    if (!response.ok) {
      throw new Error(await getResponseError(response, "Generation status could not be loaded."));
    }
    const body = (await response.json()) as Preview;
    const step = body.steps?.find((candidate) => candidate.id === stepId);
    if (step?.status === "succeeded") return body;
    if (step?.status === "failed" || step?.status === "cancelled") {
      throw new Error(`The ${kind} generation ${step.status}.`);
    }
    await new Promise((resolve) => window.setTimeout(resolve, GENERATION_POLL_INTERVAL_MS));
  }
  throw new Error(
    `The ${kind} is still processing after two minutes. Retry the status check before submitting another generation.`,
  );
}

export default function EpisodeStudioPage({ params }: { params: Promise<{ planId: string }> }) {
  const [planId, setPlanId] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [scenesLoading, setScenesLoading] = useState(true);
  const [scenesError, setScenesError] = useState<string | null>(null);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busyActions, setBusyActions] = useState<StudioAction[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const previewRequest = useRef(0);
  const selectedShotRef = useRef<Shot | null>(null);
  const busyActionsRef = useRef(new Set<StudioAction>());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      previewRequest.current += 1;
    };
  }, []);

  useEffect(() => {
    let current = true;
    void params.then((value) => {
      if (current) setPlanId(value.planId);
    });
    return () => {
      current = false;
    };
  }, [params]);

  const loadScenes = useCallback(
    async (signal?: AbortSignal) => {
      if (!planId) return;
      setScenesLoading(true);
      setScenesError(null);
      try {
        const response = await fetch(`/api/plans/${planId}/scenes`, { signal });
        if (!response.ok) {
          throw new Error(await getResponseError(response, "Scenes could not be loaded."));
        }
        const body = (await response.json()) as { scenes?: Scene[] };
        if (!Array.isArray(body.scenes)) throw new Error("The scenes response was not valid.");
        setScenes(body.scenes);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setScenesError(error instanceof Error ? error.message : "Scenes could not be loaded.");
      } finally {
        if (!signal?.aborted) setScenesLoading(false);
      }
    },
    [planId],
  );

  useEffect(() => {
    if (!planId) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => void loadScenes(controller.signal), 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadScenes, planId]);

  const loadPreview = useCallback(async (shotId: string) => {
    if (selectedShotRef.current?.id !== shotId) return;
    const request = ++previewRequest.current;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);
    try {
      const response = await fetch(`/api/shots/${shotId}/preview`);
      if (!response.ok) {
        throw new Error(await getResponseError(response, "The preview could not be loaded."));
      }
      const body = (await response.json()) as Preview;
      if (request === previewRequest.current && selectedShotRef.current?.id === shotId) {
        setPreview(body);
      }
    } catch (error) {
      if (request === previewRequest.current && selectedShotRef.current?.id === shotId) {
        setPreviewError(
          error instanceof Error ? error.message : "The preview could not be loaded.",
        );
      }
    } finally {
      if (request === previewRequest.current && selectedShotRef.current?.id === shotId) {
        setPreviewLoading(false);
      }
    }
  }, []);

  function selectShot(shot: Shot) {
    selectedShotRef.current = shot;
    setSelectedShot(shot);
    setImagePrompt(String(shot.data.imagePrompt ?? ""));
    setVideoPrompt(String(shot.data.videoPrompt ?? ""));
    setFeedback(null);
    void loadPreview(shot.id);
  }

  function setActionBusy(action: StudioAction, busy: boolean) {
    if (busy) busyActionsRef.current.add(action);
    else busyActionsRef.current.delete(action);
    if (mountedRef.current) setBusyActions([...busyActionsRef.current]);
  }

  function isActionInFlight(action: StudioAction) {
    return busyActionsRef.current.has(action);
  }

  function isShotMutationBusy() {
    return (["save", "keyframe", "video", "voice"] as const).some((action) =>
      isActionInFlight(action),
    );
  }

  async function saveShot() {
    if (!selectedShot || isShotMutationBusy()) return;
    const shot = selectedShot;
    setActionBusy("save", true);
    setFeedback(null);
    try {
      const response = await studioMutation("studio.saveShot", `/api/shots/${shot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { ...shot.data, imagePrompt, videoPrompt } }),
      });
      if (!response.ok)
        throw new Error(await getResponseError(response, "The shot could not be saved."));

      const updatedData = { ...shot.data, imagePrompt, videoPrompt };
      setScenes((current) =>
        current.map((scene) => ({
          ...scene,
          shots: scene.shots.map((item) =>
            item.id === shot.id ? { ...item, data: updatedData } : item,
          ),
        })),
      );
      setSelectedShot((current) => {
        if (current?.id !== shot.id) return current;
        const updatedShot = { ...current, data: updatedData };
        selectedShotRef.current = updatedShot;
        return updatedShot;
      });
      if (mountedRef.current && selectedShotRef.current?.id === shot.id) {
        setFeedback({
          variant: "success",
          title: "Shot saved",
          detail: "The image and video prompts are now part of this shot.",
        });
      }
    } catch (error) {
      if (mountedRef.current && selectedShotRef.current?.id === shot.id) {
        setFeedback({
          variant: "destructive",
          title: "Shot was not saved",
          detail: error instanceof Error ? error.message : "The shot could not be saved.",
          retry: "save",
        });
      }
    } finally {
      setActionBusy("save", false);
    }
  }

  async function regenerate(kind: "keyframe" | "video") {
    if (!selectedShot || isShotMutationBusy()) return;
    const shot = selectedShot;
    const promptsAreDirty =
      imagePrompt !== String(shot.data.imagePrompt ?? "") ||
      videoPrompt !== String(shot.data.videoPrompt ?? "");
    if (promptsAreDirty) {
      setFeedback({
        variant: "destructive",
        title: "Save prompt changes first",
        detail: "Generation uses the persisted shot prompts. Save this shot, then regenerate.",
        retry: "save",
      });
      return;
    }
    setActionBusy(kind, true);
    setFeedback(null);
    try {
      const response = await studioMutation("studio.regenerate", `/api/shots/${shot.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!response.ok) {
        throw new Error(await getResponseError(response, `The ${kind} could not be regenerated.`));
      }
      const result = (await response.json()) as { stepId: string };
      const nextPreview = await waitForGeneration(
        shot.id,
        result.stepId,
        kind,
        () => mountedRef.current,
      );
      if (mountedRef.current && selectedShotRef.current?.id === shot.id) {
        previewRequest.current += 1;
        setPreview(nextPreview);
        setPreviewError(null);
        setPreviewLoading(false);
        setFeedback({
          variant: "success",
          title: kind === "keyframe" ? "Keyframe generated" : "Video generated",
          detail: "The latest preview is ready for review.",
        });
      }
    } catch (error) {
      if (mountedRef.current && selectedShotRef.current?.id === shot.id) {
        setFeedback({
          variant: "destructive",
          title: kind === "keyframe" ? "Keyframe generation failed" : "Video generation failed",
          detail: error instanceof Error ? error.message : `The ${kind} could not be regenerated.`,
          retry: kind,
        });
      }
    } finally {
      setActionBusy(kind, false);
    }
  }

  async function generateVoice() {
    if (!selectedShot || isShotMutationBusy()) return;
    const shot = selectedShot;
    const text = String(shot.data.imagePrompt ?? "narrated line");
    setActionBusy("voice", true);
    setFeedback(null);
    try {
      const response = await studioMutation("studio.voice", `/api/shots/${shot.id}/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok)
        throw new Error(
          await getResponseError(response, "The voice track could not be generated."),
        );
      if (mountedRef.current && selectedShotRef.current?.id === shot.id) {
        setFeedback({
          variant: "success",
          title: "Voice track generated",
          detail: "The new voice track is available for this shot.",
        });
      }
    } catch (error) {
      if (mountedRef.current && selectedShotRef.current?.id === shot.id) {
        setFeedback({
          variant: "destructive",
          title: "Voice generation failed",
          detail:
            error instanceof Error ? error.message : "The voice track could not be generated.",
          retry: "voice",
        });
      }
    } finally {
      setActionBusy("voice", false);
    }
  }

  async function exportPlan() {
    if (!planId || isActionInFlight("export")) return;
    setActionBusy("export", true);
    setFeedback(null);
    try {
      const response = await studioMutation("studio.export", `/api/plans/${planId}/export`, {
        method: "POST",
      });
      if (!response.ok)
        throw new Error(await getResponseError(response, "The episode could not be exported."));
      const body = (await response.json()) as { assetId: string };
      window.open(`/api/assets/${body.assetId}/content`, "_blank");
      setFeedback({
        variant: "success",
        title: "Episode exported",
        detail: "The finished asset opened in a new tab.",
      });
    } catch (error) {
      setFeedback({
        variant: "destructive",
        title: "Export failed",
        detail: error instanceof Error ? error.message : "The episode could not be exported.",
        retry: "export",
      });
    } finally {
      setActionBusy("export", false);
    }
  }

  function retryAction(action: StudioAction) {
    if (action === "save") void saveShot();
    if (action === "keyframe" || action === "video") void regenerate(action);
    if (action === "voice") void generateVoice();
    if (action === "export") void exportPlan();
  }

  const shotCount = scenes.reduce((total, scene) => total + scene.shots.length, 0);
  const selectedPromptsDirty = Boolean(
    selectedShot &&
    (imagePrompt !== String(selectedShot.data.imagePrompt ?? "") ||
      videoPrompt !== String(selectedShot.data.videoPrompt ?? "")),
  );
  const shotMutationBusy = busyActions.some((action) =>
    (["save", "keyframe", "video", "voice"] as StudioAction[]).includes(action),
  );
  const isBusy = (action: StudioAction) => busyActions.includes(action);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader
        eyebrow="Episode studio"
        title="Episode production"
        description="Move through the shot sequence, review current media, refine generation prompts and clear quality findings."
        actions={
          <Button onClick={() => void exportPlan()} disabled={!planId || isBusy("export")}>
            {isBusy("export") ? (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Download aria-hidden="true" />
            )}
            {isBusy("export") ? "Exporting…" : "Export episode"}
          </Button>
        }
      />

      {scenesError ? (
        <InlineNotice title="Scenes could not be loaded" variant="destructive">
          <div className="flex flex-wrap items-center gap-3">
            <span>{scenesError}</span>
            <Button size="sm" variant="outline" onClick={() => void loadScenes()}>
              <RefreshCw aria-hidden="true" />
              Retry
            </Button>
          </div>
        </InlineNotice>
      ) : null}

      {feedback ? (
        <InlineNotice title={feedback.title} variant={feedback.variant}>
          <div className="flex flex-wrap items-center gap-3">
            <span>{feedback.detail}</span>
            {feedback.retry ? (
              <Button size="sm" variant="outline" onClick={() => retryAction(feedback.retry!)}>
                <RefreshCw aria-hidden="true" />
                Retry
              </Button>
            ) : null}
          </div>
        </InlineNotice>
      ) : null}

      <div className="grid min-w-0 gap-3 lg:min-h-[calc(100svh-15rem)] lg:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)_minmax(19rem,23rem)]">
        <SectionPanel
          title="Scenes & shots"
          description={
            scenesLoading ? "Loading sequence…" : `${scenes.length} scenes · ${shotCount} shots`
          }
          className="min-w-0 lg:max-h-[calc(100svh-15rem)]"
        >
          <div className="max-h-80 overflow-y-auto pr-1 lg:max-h-[calc(100svh-23rem)]">
            {scenesLoading ? <LoadingSkeleton rows={5} /> : null}
            {!scenesLoading && scenes.length === 0 && !scenesError ? (
              <EmptyState
                icon={Clapperboard}
                title="No scenes yet"
                description="Generate scenes from the approved episode plan before reviewing individual shots."
                compact
              />
            ) : null}
            {!scenesLoading && scenes.length > 0 ? (
              <ol className="space-y-5">
                {scenes.map((scene) => (
                  <li key={scene.id} className="min-w-0">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-medium tabular-nums text-foreground">
                        Scene {scene.order + 1}
                      </p>
                      <p className="mt-1 break-words text-sm leading-snug text-muted-foreground">
                        {scene.data.purpose || "Purpose not specified"}
                      </p>
                    </div>
                    {scene.shots.length > 0 ? (
                      <ol className="mt-3 space-y-1.5">
                        {scene.shots.map((shot) => {
                          const selected = selectedShot?.id === shot.id;
                          return (
                            <li key={shot.id}>
                              <button
                                type="button"
                                onClick={() => selectShot(shot)}
                                aria-pressed={selected}
                                className={cn(
                                  "flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-transparent px-3 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                                  selected && "border-border bg-muted",
                                )}
                              >
                                <span className="min-w-0 truncate text-sm font-medium">
                                  Shot {shot.order + 1}
                                </span>
                                <StatusBadge status={shot.status} />
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <p className="mt-3 border-l-2 border-border px-3 py-1 text-xs text-muted-foreground">
                        This scene has no shots.
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </SectionPanel>

        <SectionPanel
          title="Preview"
          description={
            selectedShot
              ? `Shot ${selectedShot.order + 1} · current generated media`
              : "Select a shot to review its media"
          }
          className="min-w-0 lg:max-h-[calc(100svh-15rem)]"
        >
          <div className="flex min-h-72 min-w-0 items-center justify-center overflow-hidden border bg-muted/15 p-3 sm:min-h-96 lg:min-h-[calc(100svh-23rem)]">
            {!selectedShot ? (
              <EmptyState
                icon={Film}
                title="No shot selected"
                description="Choose a shot from the production sequence to load its keyframe and video."
                className="w-full border-0 bg-transparent"
              />
            ) : null}
            {selectedShot && previewLoading ? <LoadingSkeleton rows={4} /> : null}
            {selectedShot && previewError && !previewLoading ? (
              <EmptyState
                icon={RefreshCw}
                title="Preview unavailable"
                description={previewError}
                action={
                  <Button variant="outline" onClick={() => void loadPreview(selectedShot.id)}>
                    <RefreshCw aria-hidden="true" />
                    Retry preview
                  </Button>
                }
              />
            ) : null}
            {selectedShot &&
            !previewLoading &&
            !previewError &&
            preview &&
            (preview.keyframeAsset || preview.videoAsset) ? (
              <div
                className={cn(
                  "grid w-full gap-3",
                  preview.keyframeAsset && preview.videoAsset && "xl:grid-cols-2",
                )}
              >
                {preview.videoAsset ? (
                  <figure className="min-w-0 overflow-hidden rounded-md border bg-black">
                    <video
                      src={preview.videoAsset.url}
                      controls
                      className="max-h-[65svh] w-full object-contain"
                      aria-label={`Video preview for shot ${selectedShot.order + 1}`}
                    />
                    <figcaption className="border-t border-white/10 bg-black px-3 py-2 font-mono text-xs text-white/75">
                      Video
                    </figcaption>
                  </figure>
                ) : null}
                {preview.keyframeAsset ? (
                  <figure className="min-w-0 overflow-hidden rounded-md border bg-black">
                    <img
                      src={preview.keyframeAsset.url}
                      alt={`Keyframe for shot ${selectedShot.order + 1}`}
                      className="max-h-[65svh] w-full object-contain"
                    />
                    <figcaption className="border-t border-white/10 bg-black px-3 py-2 font-mono text-xs text-white/75">
                      Keyframe
                    </figcaption>
                  </figure>
                ) : null}
              </div>
            ) : null}
            {selectedShot &&
            !previewLoading &&
            !previewError &&
            (!preview || (!preview.keyframeAsset && !preview.videoAsset)) ? (
              <EmptyState
                icon={ImageIcon}
                title="No preview generated"
                description="This shot is ready for a keyframe or video generation from the inspector."
                className="w-full border-0 bg-transparent"
              />
            ) : null}
          </div>
        </SectionPanel>

        <div className="min-w-0 space-y-4 lg:max-h-[calc(100svh-15rem)] lg:overflow-y-auto lg:pr-1">
          <SectionPanel
            title="Shot inspector"
            description={
              selectedShot
                ? `Shot ${selectedShot.order + 1} settings`
                : "Select a shot to edit its prompts"
            }
          >
            {!selectedShot ? (
              <EmptyState
                icon={ScrollText}
                title="No shot selected"
                description="Prompt controls appear here after you choose a shot."
                compact
              />
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3 border-b pb-3">
                  <span className="text-sm font-medium">Shot {selectedShot.order + 1}</span>
                  <StatusBadge status={selectedShot.status} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image-prompt">Image prompt</Label>
                  <Textarea
                    id="image-prompt"
                    value={imagePrompt}
                    onChange={(event) => setImagePrompt(event.target.value)}
                    rows={5}
                    className="resize-y font-mono text-xs leading-relaxed"
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Defines the visual composition used for the keyframe.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video-prompt">Video prompt</Label>
                  <Textarea
                    id="video-prompt"
                    value={videoPrompt}
                    onChange={(event) => setVideoPrompt(event.target.value)}
                    rows={5}
                    className="resize-y font-mono text-xs leading-relaxed"
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Describes motion and timing for the generated video.
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={() => void saveShot()}
                  disabled={shotMutationBusy}
                >
                  {isBusy("save") ? (
                    <LoaderCircle
                      className="animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <Save aria-hidden="true" />
                  )}
                  {isBusy("save") ? "Saving…" : "Save shot"}
                </Button>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <Button
                    variant="outline"
                    onClick={() => void regenerate("keyframe")}
                    disabled={shotMutationBusy || selectedPromptsDirty}
                  >
                    {isBusy("keyframe") ? (
                      <LoaderCircle
                        className="animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    ) : (
                      <ImageIcon aria-hidden="true" />
                    )}
                    {isBusy("keyframe") ? "Generating…" : "Regenerate keyframe"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void regenerate("video")}
                    disabled={shotMutationBusy || selectedPromptsDirty}
                  >
                    {isBusy("video") ? (
                      <LoaderCircle
                        className="animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    ) : (
                      <Film aria-hidden="true" />
                    )}
                    {isBusy("video") ? "Generating…" : "Regenerate video"}
                  </Button>
                </div>

                {selectedPromptsDirty ? (
                  <p className="text-xs leading-relaxed text-warning" role="status">
                    Save prompt changes before regenerating media.
                  </p>
                ) : null}

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => void generateVoice()}
                  disabled={shotMutationBusy}
                >
                  {isBusy("voice") ? (
                    <LoaderCircle
                      className="animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <Mic2 aria-hidden="true" />
                  )}
                  {isBusy("voice") ? "Generating voice…" : "Generate voice"}
                </Button>
              </div>
            )}
          </SectionPanel>

          <div className="border-t pt-5">
            <PlanQa planId={planId} />
          </div>
        </div>
      </div>
    </div>
  );
}
