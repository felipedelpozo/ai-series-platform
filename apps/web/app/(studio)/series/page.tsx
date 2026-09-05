"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@ai-series/ui";
import { BookOpen, LibraryBig } from "lucide-react";
import { ProductionSetupRail } from "@/components/production-progress-rail";
import { SeriesDecisions } from "@/components/series-decisions";
import { SeriesEntities } from "@/components/series-entities";
import { SeriesLoops } from "@/components/series-loops";
import { SeriesPlans } from "@/components/series-plans";
import { SeriesStoryState } from "@/components/series-story-state";
import { SeriesTikTok } from "@/components/series-tiktok";
import {
  EmptyState,
  InlineNotice,
  LoadingSkeleton,
  PageHeader,
  SectionPanel,
  StatusBadge,
} from "@/components/ui";
import { studioMutation } from "@/lib/studio-mutation";

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

type PendingAction = "generate" | "save" | `activate:${string}` | null;

async function readResponseData(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function responseError(data: Record<string, unknown>, fallback: string) {
  return typeof data.error === "string" ? data.error : fallback;
}

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
      <dd className="mt-1 whitespace-pre-wrap text-sm">{value || "—"}</dd>
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
        <p className="mt-1 text-sm">—</p>
      )}
    </div>
  );
}

export default function SeriesPage() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Series | null>(null);
  const [bibles, setBibles] = useState<Bible[]>([]);
  const [entityCount, setEntityCount] = useState<number | null>(null);
  const [planCount, setPlanCount] = useState<number | null>(null);
  const [bibleJson, setBibleJson] = useState("{}");
  const [bibleDetails, setBibleDetails] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailMessage, setDetailMessage] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const selectedIdRef = useRef<string | null>(null);
  const listRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const summaryRequestRef = useRef(0);
  const actionRequestRef = useRef(0);
  const actionBusyRef = useRef<string | null>(null);

  const loadSeries = useCallback(async () => {
    const requestId = ++listRequestRef.current;
    setListLoading(true);
    setListError(null);

    try {
      const response = await fetch("/api/series");
      const data = await readResponseData(response);
      if (!response.ok) throw new Error(responseError(data, "Failed to load series"));
      if (!Array.isArray(data.series)) throw new Error("Series response was not valid");
      if (mountedRef.current && requestId === listRequestRef.current) {
        setSeriesList(data.series as Series[]);
      }
    } catch (error) {
      if (mountedRef.current && requestId === listRequestRef.current) {
        setListError(error instanceof Error ? error.message : "Failed to load series");
      }
    } finally {
      if (mountedRef.current && requestId === listRequestRef.current) setListLoading(false);
    }
  }, []);

  const loadSeriesSummary = useCallback(async (id: string) => {
    const requestId = ++summaryRequestRef.current;
    const [entitiesResult, plansResult] = await Promise.allSettled([
      fetch(`/api/entities?seriesId=${id}`).then((response) =>
        response.ok ? readResponseData(response) : ({} as Record<string, unknown>),
      ),
      fetch(`/api/series/${id}/plans`).then((response) =>
        response.ok ? readResponseData(response) : ({} as Record<string, unknown>),
      ),
    ]);
    if (
      !mountedRef.current ||
      selectedIdRef.current !== id ||
      requestId !== summaryRequestRef.current
    ) {
      return;
    }
    const entitiesData = entitiesResult.status === "fulfilled" ? entitiesResult.value : {};
    const plansData = plansResult.status === "fulfilled" ? plansResult.value : {};
    setEntityCount(Array.isArray(entitiesData.entities) ? entitiesData.entities.length : null);
    setPlanCount(
      Array.isArray(plansData.plans)
        ? plansData.plans.filter(
            (plan) => typeof plan === "object" && plan !== null && plan.isActive === true,
          ).length
        : null,
    );
  }, []);

  const open = useCallback(
    async (id: string, preserveAction = false) => {
      const requestId = ++detailRequestRef.current;
      if (!preserveAction) {
        actionRequestRef.current += 1;
        setPendingAction(null);
      }
      selectedIdRef.current = id;
      setSelectedId(id);
      setSelected(null);
      setBibles([]);
      setEntityCount(null);
      setPlanCount(null);
      setDetailLoading(true);
      setDetailError(null);
      setDetailMessage(null);

      try {
        const response = await fetch(`/api/series/${id}`);
        const data = await readResponseData(response);
        if (!response.ok) throw new Error(responseError(data, "Failed to load series details"));
        if (!data.series || typeof data.series !== "object" || !Array.isArray(data.bibles)) {
          throw new Error("Series detail response was not valid");
        }
        if (mountedRef.current && requestId === detailRequestRef.current) {
          setSelected(data.series as Series);
          setBibles(data.bibles as Bible[]);
          void loadSeriesSummary(id);
        }
      } catch (error) {
        if (mountedRef.current && requestId === detailRequestRef.current) {
          setDetailError(error instanceof Error ? error.message : "Failed to load series details");
        }
      } finally {
        if (mountedRef.current && requestId === detailRequestRef.current) setDetailLoading(false);
      }
    },
    [loadSeriesSummary],
  );

  useEffect(() => {
    mountedRef.current = true;
    const loadTimer = window.setTimeout(() => void loadSeries(), 0);
    return () => {
      window.clearTimeout(loadTimer);
      mountedRef.current = false;
      listRequestRef.current += 1;
      detailRequestRef.current += 1;
      summaryRequestRef.current += 1;
      actionRequestRef.current += 1;
    };
  }, [loadSeries]);

  async function create() {
    setCreateBusy(true);
    setCreateError(null);
    setCreateMessage(null);
    try {
      const response = await studioMutation("series.create", "/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await readResponseData(response);
      if (!response.ok) throw new Error(responseError(data, "Failed to create series"));
      if (!mountedRef.current) return;
      setName("");
      await loadSeries();
      if (mountedRef.current) setCreateMessage("The library is up to date.");
    } catch (error) {
      if (mountedRef.current) {
        setCreateError(error instanceof Error ? error.message : "Failed to create series");
      }
    } finally {
      if (mountedRef.current) setCreateBusy(false);
    }
  }

  async function generate() {
    if (!selected || actionBusyRef.current) return;
    const seriesId = selected.id;
    const requestId = ++actionRequestRef.current;
    actionBusyRef.current = "generate";
    setPendingAction("generate");
    setDetailError(null);
    setDetailMessage(null);
    try {
      const response = await studioMutation(
        "series.generateBible",
        `/api/series/${seriesId}/generate-bible`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ details: bibleDetails }),
        },
      );
      const data = await readResponseData(response);
      if (!response.ok) throw new Error(responseError(data, "Generation failed"));
      if (!mountedRef.current || selectedIdRef.current !== seriesId) return;
      await open(seriesId, true);
      if (mountedRef.current && requestId === actionRequestRef.current) {
        setDetailMessage("Bible generated. The revision history is up to date.");
      }
    } catch (error) {
      if (
        mountedRef.current &&
        requestId === actionRequestRef.current &&
        selectedIdRef.current === seriesId
      ) {
        setDetailError(error instanceof Error ? error.message : "Generation failed");
      }
    } finally {
      actionBusyRef.current = null;
      if (mountedRef.current && requestId === actionRequestRef.current) setPendingAction(null);
    }
  }

  async function saveBible() {
    if (!selected || actionBusyRef.current) return;
    let body: unknown;
    try {
      body = JSON.parse(bibleJson);
    } catch {
      setDetailError("Invalid bible JSON");
      setDetailMessage(null);
      return;
    }

    const seriesId = selected.id;
    const requestId = ++actionRequestRef.current;
    actionBusyRef.current = "save";
    setPendingAction("save");
    setDetailError(null);
    setDetailMessage(null);
    try {
      const response = await studioMutation("series.saveBible", `/api/series/${seriesId}/bible`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readResponseData(response);
      if (!response.ok) throw new Error(responseError(data, "Failed to save bible"));
      if (!mountedRef.current || selectedIdRef.current !== seriesId) return;
      await open(seriesId, true);
      if (mountedRef.current && requestId === actionRequestRef.current) {
        setDetailMessage("Bible revision saved.");
      }
    } catch (error) {
      if (
        mountedRef.current &&
        requestId === actionRequestRef.current &&
        selectedIdRef.current === seriesId
      ) {
        setDetailError(error instanceof Error ? error.message : "Failed to save bible");
      }
    } finally {
      actionBusyRef.current = null;
      if (mountedRef.current && requestId === actionRequestRef.current) setPendingAction(null);
    }
  }

  async function activate(bibleId: string) {
    if (!selected || actionBusyRef.current) return;
    const seriesId = selected.id;
    const requestId = ++actionRequestRef.current;
    actionBusyRef.current = `activate:${bibleId}`;
    setPendingAction(`activate:${bibleId}`);
    setDetailError(null);
    setDetailMessage(null);
    try {
      const response = await studioMutation(
        "series.activateBible",
        `/api/series/bibles/${bibleId}/activate`,
        { method: "POST" },
      );
      const data = await readResponseData(response);
      if (!response.ok) throw new Error(responseError(data, "Failed to activate bible"));
      if (!mountedRef.current || selectedIdRef.current !== seriesId) return;
      await open(seriesId, true);
      if (mountedRef.current && requestId === actionRequestRef.current) {
        setDetailMessage("Bible revision activated.");
      }
    } catch (error) {
      if (
        mountedRef.current &&
        requestId === actionRequestRef.current &&
        selectedIdRef.current === seriesId
      ) {
        setDetailError(error instanceof Error ? error.message : "Failed to activate bible");
      }
    } finally {
      actionBusyRef.current = null;
      if (mountedRef.current && requestId === actionRequestRef.current) setPendingAction(null);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        eyebrow="Story development"
        title="Series"
        description="Choose a series, establish its canon and move through each production layer from story foundations to audience feedback."
      />

      <div className="flex min-w-0 flex-col gap-6">
        <SectionPanel
          title="Series library"
          description="Create or choose the production context you want to develop."
          className="min-w-0"
        >
          <div className="space-y-5">
            <form
              className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:flex-wrap sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                void create();
              }}
            >
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="series-name">Series name</Label>
                <Input
                  id="series-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setCreateMessage(null);
                  }}
                  placeholder="e.g. The Night Archive"
                  autoComplete="off"
                  aria-invalid={createError ? true : undefined}
                  aria-describedby={createError ? "series-create-error" : undefined}
                  disabled={createBusy}
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto" disabled={createBusy}>
                {createBusy ? "Creating series…" : "Create series"}
              </Button>
              {createError ? (
                <div id="series-create-error" className="sm:basis-full">
                  <InlineNotice title="Series was not created" variant="destructive">
                    {createError} Your name is still here so you can try again.
                  </InlineNotice>
                </div>
              ) : null}
              {createMessage ? (
                <div className="sm:basis-full">
                  <InlineNotice title="Series created" variant="success">
                    {createMessage}
                  </InlineNotice>
                </div>
              ) : null}
            </form>

            {listLoading ? <LoadingSkeleton rows={3} /> : null}

            {!listLoading && listError ? (
              <InlineNotice title="Series could not be loaded" variant="destructive">
                <span className="flex flex-wrap items-center gap-3">
                  <span>{listError}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void loadSeries()}
                  >
                    Retry
                  </Button>
                </span>
              </InlineNotice>
            ) : null}

            {!listLoading && !listError && seriesList.length === 0 ? (
              <EmptyState
                icon={LibraryBig}
                title="No series yet"
                description="Name your first series above to create its production workspace."
                compact
              />
            ) : null}

            {!listLoading && !listError && seriesList.length > 0 ? (
              <ul
                className="grid max-h-[24rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3"
                aria-label="Available series"
              >
                {seriesList.map((series) => {
                  const isSelected = selectedId === series.id;
                  return (
                    <li key={series.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setBibleDetails("");
                          void open(series.id);
                        }}
                        aria-pressed={isSelected}
                        aria-controls="series-detail"
                        className="flex min-h-20 w-full min-w-0 items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-left outline-none transition-[border-color,box-shadow] hover:border-foreground/25 hover:shadow-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:border-foreground aria-pressed:ring-1 aria-pressed:ring-foreground"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{series.name}</span>
                          <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">
                            {series.slug}
                          </span>
                        </span>
                        <StatusBadge status={series.status} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </SectionPanel>

        <section id="series-detail" aria-label="Selected series" className="min-w-0">
          {detailLoading ? (
            <SectionPanel
              title="Opening series"
              description="Loading canon and production sections."
            >
              <LoadingSkeleton rows={4} />
            </SectionPanel>
          ) : null}

          {!detailLoading && detailError && !selected ? (
            <SectionPanel
              title="Series unavailable"
              description="The library selection is preserved."
            >
              <InlineNotice title="Series details could not be loaded" variant="destructive">
                <span className="flex flex-wrap items-center gap-3">
                  <span>{detailError}</span>
                  {selectedId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void open(selectedId)}
                    >
                      Retry
                    </Button>
                  ) : null}
                </span>
              </InlineNotice>
            </SectionPanel>
          ) : null}

          {!detailLoading && !detailError && !selected ? (
            <SectionPanel
              title="Production context"
              description="One series anchors every downstream decision."
            >
              <EmptyState
                icon={BookOpen}
                title="Select or create a series"
                description="Choose a series from the library to review its canon, production plans and audience loop."
              />
            </SectionPanel>
          ) : null}

          {!detailLoading && selected ? (
            <SectionPanel
              title={selected.name}
              description={`Production workspace · ${selected.slug}`}
              actions={<StatusBadge status={selected.status} />}
              className="min-w-0"
            >
              <div className="min-w-0 space-y-5">
                {detailError ? (
                  <InlineNotice title="Action could not be completed" variant="destructive">
                    {detailError} No local input was cleared.
                  </InlineNotice>
                ) : null}
                {detailMessage ? (
                  <InlineNotice title="Series updated" variant="success">
                    {detailMessage}
                  </InlineNotice>
                ) : null}

                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium">Production setup</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Live summary of the selected series&apos; canonical inputs.
                    </p>
                  </div>
                  <ProductionSetupRail
                    hasActiveBible={bibles.some((bible) => bible.isActive)}
                    entityCount={entityCount}
                    planCount={planCount}
                  />
                </div>

                <Tabs key={selected.id} defaultValue="bible" className="min-w-0">
                  <TabsList aria-label="Series production sections">
                    <TabsTrigger value="bible">Bible</TabsTrigger>
                    <TabsTrigger value="entities">Entities</TabsTrigger>
                    <TabsTrigger value="story-state">Story State</TabsTrigger>
                    <TabsTrigger value="plans">Plans</TabsTrigger>
                    <TabsTrigger value="decisions">Decisions</TabsTrigger>
                    <TabsTrigger value="loops">Loops</TabsTrigger>
                    <TabsTrigger value="tiktok">TikTok</TabsTrigger>
                  </TabsList>

                  <TabsContent value="bible" className="min-w-0 space-y-6">
                    <div className="border-b pb-5">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold">Series bible</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          Review immutable revisions, activate the canonical version or add a manual
                          revision.
                        </p>
                      </div>
                      <div className="mt-4 space-y-3 rounded-lg border bg-muted/15 p-4">
                        <div className="space-y-2">
                          <Label htmlFor="bible-details">
                            Series details for AI{" "}
                            <span className="font-normal text-muted-foreground">(optional)</span>
                          </Label>
                          <Textarea
                            id="bible-details"
                            value={bibleDetails}
                            onChange={(event) => setBibleDetails(event.target.value)}
                            rows={4}
                            maxLength={4000}
                            placeholder="Describe the premise, genre, tone, target audience, visual references, characters, setting, episode length, narrative rules or any constraints the AI should follow."
                            aria-describedby="bible-details-help"
                            disabled={pendingAction !== null}
                          />
                        </div>
                        <div
                          id="bible-details-help"
                          className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
                        >
                          <p>
                            Included in this generation and recorded in its immutable prompt
                            snapshot.
                          </p>
                          <span className="tabular-nums">{bibleDetails.length}/4000</span>
                        </div>
                        <Button
                          type="button"
                          onClick={() => void generate()}
                          disabled={pendingAction !== null}
                        >
                          {pendingAction === "generate"
                            ? "Generating bible…"
                            : "Generate bible (AI)"}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold">Revision history</h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          The active revision is the canonical reference for production.
                        </p>
                      </div>
                      {bibles.length === 0 ? (
                        <EmptyState
                          icon={BookOpen}
                          title="No bible revisions"
                          description="Generate a first draft or save a manual JSON revision below."
                          compact
                        />
                      ) : (
                        <ol className="space-y-2">
                          {bibles.map((bible) => {
                            const isActivating = pendingAction === `activate:${bible.id}`;
                            return (
                              <li key={bible.id} className="min-w-0 rounded-lg border bg-muted/25">
                                <div className="flex min-w-0 flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-mono text-xs font-semibold">
                                        Revision {bible.version}
                                      </span>
                                      {bible.isActive ? (
                                        <Badge variant="success">active</Badge>
                                      ) : null}
                                    </div>
                                    <p className="mt-1 break-words text-sm font-medium">
                                      {bible.title ?? "Untitled bible"}
                                    </p>
                                    <p className="mt-1 font-mono text-[0.6875rem] text-muted-foreground">
                                      Source: {bible.source}
                                    </p>
                                  </div>
                                  {!bible.isActive ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => void activate(bible.id)}
                                      disabled={pendingAction !== null}
                                      className="shrink-0 self-start sm:self-center"
                                    >
                                      {isActivating ? "Activating…" : "Activate"}
                                    </Button>
                                  ) : null}
                                </div>
                                <details
                                  open={bible.isActive}
                                  className="border-t bg-background/70"
                                >
                                  <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring">
                                    Full revision details
                                  </summary>
                                  <div className="space-y-4 border-t p-4">
                                    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                      <BibleTextField label="Title" value={bible.title} />
                                      <BibleTextField label="Genre" value={bible.genre} />
                                      <BibleTextField label="Tone" value={bible.tone} />
                                      <BibleTextField label="Audience" value={bible.audience} />
                                      <BibleTextField label="Format" value={bible.format} />
                                      <BibleTextField label="Language" value={bible.language} />
                                      <BibleTextField
                                        label="Episode duration"
                                        value={bible.episodeDuration}
                                      />
                                    </dl>
                                    <dl className="grid gap-3">
                                      <BibleTextField label="Premise" value={bible.premise} />
                                      <BibleTextField
                                        label="Description"
                                        value={bible.description}
                                      />
                                      <BibleTextField
                                        label="Visual style"
                                        value={bible.visualStyle}
                                      />
                                    </dl>
                                    <div className="grid gap-4 xl:grid-cols-3">
                                      <BibleListField
                                        label="Narrative rules"
                                        values={bible.narrativeRules}
                                      />
                                      <BibleListField label="Canon" values={bible.canon} />
                                      <BibleListField
                                        label="Prohibitions"
                                        values={bible.prohibitions}
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setBibleJson(bibleRevisionJson(bible))}
                                      disabled={pendingAction !== null}
                                    >
                                      Edit as new revision
                                    </Button>
                                  </div>
                                </details>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>

                    <form
                      className="space-y-3 rounded-lg border bg-muted/15 p-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void saveBible();
                      }}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="bible-json">New revision (JSON)</Label>
                        <p
                          id="bible-json-help"
                          className="text-xs leading-relaxed text-muted-foreground"
                        >
                          Add the complete structured bible. Invalid input remains editable for
                          correction.
                        </p>
                        <Textarea
                          id="bible-json"
                          value={bibleJson}
                          onChange={(event) => setBibleJson(event.target.value)}
                          rows={10}
                          className="font-mono text-xs"
                          placeholder={
                            '{"title":"...","premise":"...","genre":"...","tone":"...","audience":"...","format":"...","language":"es","episodeDuration":"60s","narrativeRules":[],"visualStyle":"...","canon":[],"prohibitions":[],"description":"..."}'
                          }
                          aria-describedby="bible-json-help"
                          aria-invalid={detailError === "Invalid bible JSON" ? true : undefined}
                          disabled={pendingAction !== null}
                        />
                      </div>
                      <Button type="submit" variant="outline" disabled={pendingAction !== null}>
                        {pendingAction === "save" ? "Saving revision…" : "Save revision"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="entities" className="min-w-0 overflow-x-auto">
                    <SeriesEntities
                      seriesId={selected.id}
                      onEntitiesChanged={() => void loadSeriesSummary(selected.id)}
                    />
                  </TabsContent>
                  <TabsContent value="story-state" className="min-w-0 overflow-x-auto">
                    <SeriesStoryState seriesId={selected.id} />
                  </TabsContent>
                  <TabsContent value="plans" className="min-w-0 overflow-x-auto">
                    <SeriesPlans
                      seriesId={selected.id}
                      onPlansChanged={() => void loadSeriesSummary(selected.id)}
                    />
                  </TabsContent>
                  <TabsContent value="decisions" className="min-w-0 overflow-x-auto">
                    <SeriesDecisions seriesId={selected.id} />
                  </TabsContent>
                  <TabsContent value="loops" className="min-w-0 overflow-x-auto">
                    <SeriesLoops seriesId={selected.id} />
                  </TabsContent>
                  <TabsContent value="tiktok" className="min-w-0 overflow-x-auto">
                    <SeriesTikTok seriesId={selected.id} />
                  </TabsContent>
                </Tabs>
              </div>
            </SectionPanel>
          ) : null}
        </section>
      </div>
    </div>
  );
}
