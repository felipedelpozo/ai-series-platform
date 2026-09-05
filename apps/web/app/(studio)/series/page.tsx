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

export default function SeriesPage() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Series | null>(null);
  const [bibles, setBibles] = useState<Bible[]>([]);
  const [bibleJson, setBibleJson] = useState("{}");
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

  const open = useCallback(async (id: string, preserveAction = false) => {
    const requestId = ++detailRequestRef.current;
    if (!preserveAction) {
      actionRequestRef.current += 1;
      setPendingAction(null);
    }
    selectedIdRef.current = id;
    setSelectedId(id);
    setSelected(null);
    setBibles([]);
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
      }
    } catch (error) {
      if (mountedRef.current && requestId === detailRequestRef.current) {
        setDetailError(error instanceof Error ? error.message : "Failed to load series details");
      }
    } finally {
      if (mountedRef.current && requestId === detailRequestRef.current) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const loadTimer = window.setTimeout(() => void loadSeries(), 0);
    return () => {
      window.clearTimeout(loadTimer);
      mountedRef.current = false;
      listRequestRef.current += 1;
      detailRequestRef.current += 1;
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

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] lg:items-start">
        <SectionPanel
          title="Series library"
          description="Select the production context you want to develop."
          className="min-w-0 lg:sticky lg:top-6"
        >
          <div className="space-y-5">
            <form
              className="space-y-3 border-b pb-5"
              onSubmit={(event) => {
                event.preventDefault();
                void create();
              }}
            >
              <div className="space-y-2">
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
              <Button type="submit" className="w-full" disabled={createBusy}>
                {createBusy ? "Creating series…" : "Create series"}
              </Button>
              {createError ? (
                <div id="series-create-error">
                  <InlineNotice title="Series was not created" variant="destructive">
                    {createError} Your name is still here so you can try again.
                  </InlineNotice>
                </div>
              ) : null}
              {createMessage ? (
                <InlineNotice title="Series created" variant="success">
                  {createMessage}
                </InlineNotice>
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
                className="max-h-[32rem] space-y-2 overflow-y-auto pr-1"
                aria-label="Available series"
              >
                {seriesList.map((series) => {
                  const isSelected = selectedId === series.id;
                  return (
                    <li key={series.id}>
                      <button
                        type="button"
                        onClick={() => void open(series.id)}
                        aria-pressed={isSelected}
                        aria-controls="series-detail"
                        className="flex min-h-14 w-full min-w-0 items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary/45 aria-pressed:bg-primary/8"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{series.name}</span>
                          <span className="block truncate font-mono text-[0.6875rem] text-muted-foreground">
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
                    <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold">Series bible</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          Review immutable revisions, activate the canonical version or add a manual
                          revision.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => void generate()}
                        disabled={pendingAction !== null}
                        className="shrink-0"
                      >
                        {pendingAction === "generate" ? "Generating bible…" : "Generate bible (AI)"}
                      </Button>
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
                              <li
                                key={bible.id}
                                className="flex min-w-0 flex-col gap-3 rounded-lg border bg-muted/25 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                              >
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
                    <SeriesEntities seriesId={selected.id} />
                  </TabsContent>
                  <TabsContent value="story-state" className="min-w-0 overflow-x-auto">
                    <SeriesStoryState seriesId={selected.id} />
                  </TabsContent>
                  <TabsContent value="plans" className="min-w-0 overflow-x-auto">
                    <SeriesPlans seriesId={selected.id} />
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
