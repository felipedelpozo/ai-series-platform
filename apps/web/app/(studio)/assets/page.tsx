"use client";

import { useEffect, useState } from "react";
import { Button } from "@ai-series/ui";

type Asset = {
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
};

type Detail = {
  asset: Asset;
  children: Asset[];
  generation: { id: string; model: string } | undefined;
};

const STATUSES = ["draft", "approved", "rejected", "locked"];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    const params = new URLSearchParams();
    if (kind) params.set("kind", kind);
    if (status) params.set("status", status);
    return fetch(`/api/assets?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setAssets(d.assets as Asset[]));
  }

  useEffect(() => {
    void refresh();
  }, [kind, status]);

  async function open(id: string) {
    const res = await fetch(`/api/assets/${id}`);
    if (res.ok) setDetail((await res.json()) as Detail);
  }

  async function changeStatus(next: string) {
    if (!detail) return;
    const res = await fetch(`/api/assets/${detail.asset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to update status");
      return;
    }
    setError(null);
    setDetail(null);
    void refresh();
  }

  async function remove() {
    if (!detail) return;
    const res = await fetch(`/api/assets/${detail.asset.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to delete");
      return;
    }
    setError(null);
    setDetail(null);
    void refresh();
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Assets</h2>
        <div className="flex gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="">All kinds</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-[1fr_360px] gap-4">
        <ul className="grid grid-cols-3 gap-3">
          {assets.length === 0 && (
            <li className="col-span-3 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No assets.
            </li>
          )}
          {assets.map((asset) => (
            <li key={asset.id}>
              <button
                onClick={() => open(asset.id)}
                className="w-full rounded-lg border p-2 text-left hover:bg-accent"
              >
                {asset.kind === "image" ? (
                  <img src={asset.url} alt={asset.id} className="h-28 w-full rounded-md object-cover" />
                ) : (
                  <div className="flex h-28 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                    {asset.kind}
                  </div>
                )}
                <p className="mt-1 truncate text-xs text-muted-foreground">{asset.status}</p>
                <p className="truncate text-xs">{asset.id.slice(0, 8)}…</p>
              </button>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border p-4">
          {!detail && (
            <p className="text-sm text-muted-foreground">Select an asset to view details.</p>
          )}
          {detail && (
            <div className="flex flex-col gap-2 text-sm">
              <h3 className="font-semibold">Asset</h3>
              {detail.asset.kind === "image" && (
                <img
                  src={detail.asset.url}
                  alt={detail.asset.id}
                  className="max-h-48 rounded-md border object-contain"
                />
              )}
              {detail.asset.kind === "video" && (
                <video src={detail.asset.url} controls className="max-h-48 rounded-md border" />
              )}
              <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                <dt className="text-muted-foreground">Kind</dt>
                <dd>{detail.asset.kind}</dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{detail.asset.status}</dd>
                <dt className="text-muted-foreground">Source</dt>
                <dd>{detail.asset.source}</dd>
                <dt className="text-muted-foreground">Model</dt>
                <dd>{detail.asset.model ?? "—"}</dd>
                <dt className="text-muted-foreground">Size</dt>
                <dd>{detail.asset.sizeBytes ? `${Math.round(detail.asset.sizeBytes / 1024)} KB` : "—"}</dd>
              </dl>
              {detail.generation && (
                <p className="text-xs text-muted-foreground">
                  Generated by {detail.generation.model}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {STATUSES.filter((s) => s !== detail.asset.status && detail.asset.status !== "locked").map(
                  (s) => (
                    <Button key={s} size="sm" variant="outline" onClick={() => changeStatus(s)}>
                      {s}
                    </Button>
                  ),
                )}
                <Button size="sm" variant="outline" onClick={remove}>
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
