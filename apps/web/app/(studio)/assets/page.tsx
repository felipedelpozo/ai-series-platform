"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@ai-series/ui";
import {
  FileAudio,
  FileImage,
  FileVideo,
  ImageOff,
  Library,
  LockKeyhole,
  Trash2,
} from "lucide-react";
import {
  EmptyState,
  InlineNotice,
  LoadingSkeleton,
  PageHeader,
  SectionPanel,
  StatusBadge,
} from "@/components/ui";
import { studioMutation } from "@/lib/studio-mutation";

interface Asset {
  id: string;
  kind: string;
  source: string;
  status: string;
  url: string;
  mime: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  provider: string | null;
  model: string | null;
  createdAt: string;
}

interface Detail {
  asset: Asset;
  children: Asset[];
  generation: { id: string; model: string } | undefined;
}

const STATUSES = ["draft", "approved", "rejected", "locked"] as const;
const ALL_FILTER_VALUE = "all";

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());
}

function formatBytes(sizeBytes: number | null) {
  if (sizeBytes === null) return "Unknown";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: unknown };
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

function AssetFallback({
  kind,
  compact = false,
  isUnavailable = true,
}: {
  kind: string;
  compact?: boolean;
  isUnavailable?: boolean;
}) {
  const Icon = kind === "video" ? FileVideo : kind === "audio" ? FileAudio : FileImage;
  const label = isUnavailable
    ? `${formatLabel(kind)} preview unavailable`
    : `${formatLabel(kind)} asset`;

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/35 text-muted-foreground",
        compact ? "h-32" : "min-h-52",
      )}
      role="img"
      aria-label={label}
    >
      <Icon className={compact ? "size-5" : "size-7"} aria-hidden="true" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

function AssetMedia({ asset, compact = false }: { asset: Asset; compact?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const hasMediaError = failedUrl === asset.url;

  if (!asset.url || hasMediaError) return <AssetFallback kind={asset.kind} compact={compact} />;

  if (asset.kind === "image") {
    return (
      <img
        src={asset.url}
        alt={`Preview of asset ${asset.id}`}
        className={cn(
          "w-full rounded-lg border bg-muted object-contain",
          compact ? "h-32" : "max-h-80 min-h-52",
        )}
        loading="lazy"
        onError={() => setFailedUrl(asset.url)}
      />
    );
  }

  if (!compact && asset.kind === "video") {
    return (
      <video
        src={asset.url}
        aria-label={`Video preview for asset ${asset.id}`}
        controls
        preload="metadata"
        className="max-h-80 min-h-52 w-full rounded-lg border bg-black object-contain"
        onError={() => setFailedUrl(asset.url)}
      >
        Video preview unavailable.
      </video>
    );
  }

  if (!compact && asset.kind === "audio") {
    return (
      <div className="flex min-h-32 items-center rounded-lg border bg-muted/35 p-5">
        <audio
          src={asset.url}
          aria-label={`Audio preview for asset ${asset.id}`}
          controls
          preload="metadata"
          className="w-full min-w-0"
          onError={() => setFailedUrl(asset.url)}
        >
          Audio preview unavailable.
        </audio>
      </div>
    );
  }

  return <AssetFallback kind={asset.kind} compact={compact} isUnavailable={false} />;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const detailRequestRef = useRef<AbortController | null>(null);
  const mutationRequestRef = useRef(0);
  const selectedIdRef = useRef<string | null>(null);
  const filtersRef = useRef({ kind: "", status: "" });

  const loadAssets = useCallback(
    async (signal?: AbortSignal) => {
      await Promise.resolve();
      if (signal?.aborted) return;
      setIsListLoading(true);
      setListError(null);

      const params = new URLSearchParams();
      if (kind) params.set("kind", kind);
      if (status) params.set("status", status);

      try {
        const response = await fetch(`/api/assets?${params.toString()}`, { signal });
        if (!response.ok) throw new Error(await getErrorMessage(response, "Failed to load assets"));

        const data = (await response.json()) as { assets?: Asset[] };
        if (!Array.isArray(data.assets)) throw new Error("Assets response was not valid");
        setAssets(data.assets);
      } catch (caughtError) {
        if (caughtError instanceof DOMException && caughtError.name === "AbortError") return;
        setListError(caughtError instanceof Error ? caughtError.message : "Failed to load assets");
      } finally {
        if (!signal?.aborted) setIsListLoading(false);
      }
    },
    [kind, status],
  );

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void loadAssets(controller.signal));

    return () => controller.abort();
  }, [loadAssets]);

  useEffect(() => () => detailRequestRef.current?.abort(), []);

  function resetSelectedAsset() {
    detailRequestRef.current?.abort();
    selectedIdRef.current = null;
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    setMutationError(null);
    setIsDetailLoading(false);
  }

  function changeKindFilter(value: string) {
    resetSelectedAsset();
    const nextKind = value === ALL_FILTER_VALUE ? "" : value;
    filtersRef.current = { ...filtersRef.current, kind: nextKind };
    setKind(nextKind);
  }

  function changeStatusFilter(value: string) {
    resetSelectedAsset();
    const nextStatus = value === ALL_FILTER_VALUE ? "" : value;
    filtersRef.current = { ...filtersRef.current, status: nextStatus };
    setStatus(nextStatus);
  }

  async function open(id: string) {
    detailRequestRef.current?.abort();
    const controller = new AbortController();
    detailRequestRef.current = controller;
    selectedIdRef.current = id;
    setSelectedId(id);
    setDetail(null);
    setDetailError(null);
    setMutationError(null);
    setIsDetailLoading(true);

    try {
      const response = await fetch(`/api/assets/${id}`, { signal: controller.signal });
      if (!response.ok)
        throw new Error(await getErrorMessage(response, "Failed to load asset details"));
      setDetail((await response.json()) as Detail);
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") return;
      setDetailError(
        caughtError instanceof Error ? caughtError.message : "Failed to load asset details",
      );
    } finally {
      if (!controller.signal.aborted) setIsDetailLoading(false);
    }
  }

  async function changeStatus(next: string) {
    if (!detail || isMutating) return;
    const assetId = detail.asset.id;
    const filters = { ...filtersRef.current };
    const request = ++mutationRequestRef.current;
    setIsMutating(true);
    setMutationError(null);

    try {
      const response = await studioMutation("assets.status", `/api/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, "Failed to update status"));

      if (
        request !== mutationRequestRef.current ||
        selectedIdRef.current !== assetId ||
        filtersRef.current.kind !== filters.kind ||
        filtersRef.current.status !== filters.status
      ) {
        return;
      }
      resetSelectedAsset();
      await loadAssets();
    } catch (caughtError) {
      if (request === mutationRequestRef.current && selectedIdRef.current === assetId) {
        setMutationError(
          caughtError instanceof Error ? caughtError.message : "Failed to update status",
        );
      }
    } finally {
      if (request === mutationRequestRef.current) setIsMutating(false);
    }
  }

  async function remove() {
    if (!detail || isMutating) return;
    const assetId = detail.asset.id;
    const filters = { ...filtersRef.current };
    const request = ++mutationRequestRef.current;
    setIsMutating(true);
    setMutationError(null);

    try {
      const response = await studioMutation("assets.delete", `/api/assets/${assetId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, "Failed to delete asset"));

      if (
        request !== mutationRequestRef.current ||
        selectedIdRef.current !== assetId ||
        filtersRef.current.kind !== filters.kind ||
        filtersRef.current.status !== filters.status
      ) {
        return;
      }
      resetSelectedAsset();
      await loadAssets();
    } catch (caughtError) {
      if (request === mutationRequestRef.current && selectedIdRef.current === assetId) {
        setMutationError(
          caughtError instanceof Error ? caughtError.message : "Failed to delete asset",
        );
      }
    } finally {
      if (request === mutationRequestRef.current) setIsMutating(false);
    }
  }

  const hasActiveFilters = Boolean(kind || status);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        eyebrow="Media library"
        title="Assets"
        description="Review source media, inspect provenance and dimensions, then set the production status."
      />

      <section
        aria-labelledby="asset-filters-title"
        className="rounded-xl border bg-card p-4 shadow-xs"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 id="asset-filters-title" className="text-sm font-semibold">
              Filter the library
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Narrow the collection by media kind or production status.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[26rem]">
            <div className="space-y-2">
              <Label htmlFor="asset-kind-filter">Media kind</Label>
              <Select value={kind || ALL_FILTER_VALUE} onValueChange={changeKindFilter}>
                <SelectTrigger id="asset-kind-filter">
                  <SelectValue placeholder="All kinds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All kinds</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-status-filter">Production status</Label>
              <Select value={status || ALL_FILTER_VALUE} onValueChange={changeStatusFilter}>
                <SelectTrigger id="asset-status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All statuses</SelectItem>
                  {STATUSES.map((assetStatus) => (
                    <SelectItem key={assetStatus} value={assetStatus}>
                      {formatLabel(assetStatus)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <SectionPanel
          title="Asset collection"
          description={
            isListLoading
              ? "Loading media…"
              : `${assets.length} ${assets.length === 1 ? "asset" : "assets"}`
          }
        >
          {isListLoading ? <LoadingSkeleton rows={3} /> : null}

          {!isListLoading && listError ? (
            <InlineNotice title="Assets could not be loaded" variant="destructive">
              <span>{listError}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void loadAssets()}
              >
                Try again
              </Button>
            </InlineNotice>
          ) : null}

          {!isListLoading && !listError && assets.length === 0 ? (
            <EmptyState
              icon={hasActiveFilters ? ImageOff : Library}
              title={hasActiveFilters ? "No assets match these filters" : "No assets yet"}
              description={
                hasActiveFilters
                  ? "Adjust the media kind or production status to broaden the collection."
                  : "Generated and imported production media will appear here when available."
              }
              action={
                hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetSelectedAsset();
                      setKind("");
                      setStatus("");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : null}

          {!isListLoading && !listError && assets.length > 0 ? (
            <ul className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
              {assets.map((asset) => {
                const isSelected = selectedId === asset.id;
                return (
                  <li key={asset.id} className="min-w-0">
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`Select ${asset.kind} asset ${asset.id}`}
                      onClick={() => void open(asset.id)}
                      className={cn(
                        "group w-full min-w-0 rounded-xl border bg-card p-2 text-left shadow-xs outline-none transition-[border-color,box-shadow,background-color] hover:bg-accent/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        isSelected && "border-primary ring-2 ring-primary/20",
                      )}
                    >
                      <AssetMedia asset={asset} compact />
                      <div className="min-w-0 px-1 pb-1 pt-3">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">
                            {formatLabel(asset.kind)}
                          </span>
                          <StatusBadge status={asset.status} />
                        </div>
                        <p
                          className="mt-2 truncate font-mono text-[0.6875rem] text-muted-foreground"
                          title={asset.id}
                        >
                          {asset.id}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </SectionPanel>

        <SectionPanel
          title="Asset detail"
          description="Preview, metadata and production actions"
          className="min-w-0 xl:sticky xl:top-6"
        >
          <div aria-live="polite" className="min-w-0">
            {isDetailLoading ? <LoadingSkeleton rows={2} /> : null}

            {!isDetailLoading && detailError ? (
              <InlineNotice title="Asset details could not be loaded" variant="destructive">
                <span>{detailError}</span>
                {selectedId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void open(selectedId)}
                  >
                    Try again
                  </Button>
                ) : null}
              </InlineNotice>
            ) : null}

            {!isDetailLoading && !detailError && !detail ? (
              <EmptyState
                icon={FileImage}
                title="Select an asset"
                description="Choose an item in the collection to inspect its preview, provenance and available actions."
                compact
              />
            ) : null}

            {!isDetailLoading && !detailError && detail ? (
              <div className="min-w-0 space-y-5">
                <AssetMedia asset={detail.asset} />

                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{formatLabel(detail.asset.kind)} asset</p>
                    <p className="mt-1 break-all font-mono text-[0.6875rem] leading-relaxed text-muted-foreground">
                      {detail.asset.id}
                    </p>
                  </div>
                  <StatusBadge status={detail.asset.status} />
                </div>

                <dl className="grid min-w-0 grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-x-3 gap-y-3 border-y py-4 text-sm">
                  <dt className="text-muted-foreground">Source</dt>
                  <dd className="min-w-0 break-words text-right font-medium">
                    {detail.asset.source}
                  </dd>
                  <dt className="text-muted-foreground">Format</dt>
                  <dd className="min-w-0 break-words text-right font-medium">
                    {detail.asset.mime || "Unknown"}
                  </dd>
                  <dt className="text-muted-foreground">Dimensions</dt>
                  <dd className="text-right font-medium">
                    {detail.asset.width && detail.asset.height
                      ? `${detail.asset.width} × ${detail.asset.height}`
                      : "Unknown"}
                  </dd>
                  <dt className="text-muted-foreground">File size</dt>
                  <dd className="text-right font-medium">{formatBytes(detail.asset.sizeBytes)}</dd>
                  <dt className="text-muted-foreground">Provider</dt>
                  <dd className="min-w-0 break-words text-right font-medium">
                    {detail.asset.provider ?? "Unknown"}
                  </dd>
                  <dt className="text-muted-foreground">Model</dt>
                  <dd className="min-w-0 break-words text-right font-medium">
                    {detail.asset.model ?? "Unknown"}
                  </dd>
                </dl>

                {detail.generation ? (
                  <div className="rounded-lg bg-muted/45 p-3 text-xs leading-relaxed text-muted-foreground">
                    Generated by{" "}
                    <span className="font-medium text-foreground">{detail.generation.model}</span>
                  </div>
                ) : null}

                {mutationError ? (
                  <InlineNotice title="Asset action failed" variant="destructive">
                    {mutationError}
                  </InlineNotice>
                ) : null}

                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">Production status</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {detail.asset.status === "locked"
                        ? "This asset is locked and its status cannot be changed."
                        : "Choose the status that reflects the current editorial decision."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.filter(
                      (assetStatus) =>
                        assetStatus !== detail.asset.status && detail.asset.status !== "locked",
                    ).map((assetStatus) => (
                      <Button
                        key={assetStatus}
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isMutating}
                        onClick={() => void changeStatus(assetStatus)}
                      >
                        Set {formatLabel(assetStatus)}
                      </Button>
                    ))}
                    {detail.asset.status === "locked" ? (
                      <span className="inline-flex h-9 items-center gap-2 rounded-md border bg-muted px-3 text-xs font-medium text-muted-foreground">
                        <LockKeyhole className="size-4" aria-hidden="true" />
                        Status locked
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="border-t pt-5">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" size="sm" variant="destructive" disabled={isMutating}>
                        <Trash2 aria-hidden="true" />
                        Delete asset
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes the selected asset. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
                        <AlertDialogAction disabled={isMutating} onClick={() => void remove()}>
                          Delete asset
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : null}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
