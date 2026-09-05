"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Boxes } from "lucide-react";
import { Button, Input, Label, Textarea } from "@ai-series/ui";
import {
  EmptyState,
  InlineNotice,
  LoadingSkeleton,
  SectionPanel,
  StatusBadge,
} from "@/components/ui";
import { studioMutation } from "@/lib/studio-mutation";

type Entity = { id: string; type: string; name: string };
type Version = {
  id: string;
  version: number;
  isActive: boolean;
  source: string;
  name: string;
  data: Record<string, unknown>;
};
type Sheet = { id: string; status: string; asset: { url: string } | null };

function fieldLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

function EntityField({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{fieldLabel(label)}</dt>
      <dd className="mt-1 text-sm">
        {Array.isArray(value) ? (
          value.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5">
              {value.map((item, index) => (
                <li key={`${index}-${String(item)}`}>{String(item)}</li>
              ))}
            </ul>
          ) : (
            "—"
          )
        ) : typeof value === "object" && value !== null ? (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-2 font-mono text-xs">
            {JSON.stringify(value, null, 2)}
          </pre>
        ) : (
          String(value ?? "—")
        )}
      </dd>
    </div>
  );
}

function EntityVersionData({ data }: { data: Record<string, unknown> }) {
  const fields = Object.entries(data);
  if (fields.length === 0) {
    return <p className="text-xs text-muted-foreground">No details in this version.</p>;
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {fields.map(([key, value]) => (
        <EntityField key={key} label={key} value={value} />
      ))}
    </dl>
  );
}

export function SeriesEntities({ seriesId }: { seriesId: string }) {
  const [type, setType] = useState("character");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [name, setName] = useState("");
  const [dataJson, setDataJson] = useState("{}");
  const [versions, setVersions] = useState<Record<string, Version[]>>({});
  const [sheets, setSheets] = useState<Record<string, Sheet[]>>({});
  const [entityDetails, setEntityDetails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRequestRef = useRef(0);
  const sheetActionRef = useRef(new Set<string>());
  const sheetAttemptRef = useRef(new Map<string, string>());

  const load = useCallback(async () => {
    const request = ++loadRequestRef.current;
    setLoading(true);
    try {
      const response = await fetch(`/api/entities?seriesId=${seriesId}&type=${type}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load entities");
      if (request !== loadRequestRef.current) return;
      setEntities(data.entities as Entity[]);
      setError(null);
    } catch (loadError) {
      if (request === loadRequestRef.current) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load entities");
      }
    } finally {
      if (request === loadRequestRef.current) setLoading(false);
    }
  }, [seriesId, type]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function create() {
    let data;
    try {
      data = JSON.parse(dataJson);
    } catch {
      setError("Invalid data JSON");
      return;
    }

    setBusyAction("create");
    setError(null);
    try {
      const res = await studioMutation("entities.create", "/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId, type, name, data }),
      });
      if (!res.ok) throw new Error("Failed to create entity");
      setName("");
      setDataJson("{}");
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create entity");
    } finally {
      setBusyAction(null);
    }
  }

  async function open(entityId: string) {
    setBusyAction(`open:${entityId}`);
    setError(null);
    try {
      const res = await fetch(`/api/entities/${entityId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load entity details");
      setVersions((prev) => ({ ...prev, [entityId]: data.versions }));

      const sheetRes = await fetch(`/api/entities/${entityId}/sheets`);
      const sheetData = await sheetRes.json();
      if (!sheetRes.ok) throw new Error(sheetData.error ?? "Failed to load entity sheets");
      setSheets((prev) => ({ ...prev, [entityId]: sheetData.sheets }));
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Failed to load entity details");
    } finally {
      setBusyAction(null);
    }
  }

  async function generate(entityId: string) {
    setBusyAction(`generate:${entityId}`);
    setError(null);
    try {
      const res = await studioMutation("entities.generate", `/api/entities/${entityId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details: entityDetails[entityId] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      await open(entityId);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Generation failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function activate(versionId: string, entityId: string) {
    setBusyAction(`activate:${versionId}`);
    setError(null);
    try {
      const res = await studioMutation(
        "entities.activateVersion",
        `/api/entities/versions/${versionId}/activate`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Failed to activate version");
      await open(entityId);
    } catch (activationError) {
      setError(
        activationError instanceof Error ? activationError.message : "Failed to activate version",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function generateSheet(entityId: string) {
    if (sheetActionRef.current.has(entityId)) return;
    sheetActionRef.current.add(entityId);
    setBusyAction(`sheet:${entityId}`);
    setError(null);
    const idempotencyKey = sheetAttemptRef.current.get(entityId) ?? crypto.randomUUID();
    sheetAttemptRef.current.set(entityId, idempotencyKey);
    try {
      const res = await studioMutation("entities.addSheet", `/api/entities/${entityId}/sheets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        sheetAttemptRef.current.delete(entityId);
        throw new Error(data.error ?? "Sheet generation failed");
      }
      sheetAttemptRef.current.delete(entityId);
      await open(entityId);
    } catch (sheetError) {
      setError(sheetError instanceof Error ? sheetError.message : "Sheet generation failed");
    } finally {
      sheetActionRef.current.delete(entityId);
      setBusyAction(null);
    }
  }

  async function sheetStatus(sheetId: string, status: string, entityId: string) {
    setBusyAction(`${status}:${sheetId}`);
    setError(null);
    try {
      const res = await studioMutation("entities.sheetStatus", `/api/sheets/${sheetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`Failed to mark sheet as ${status}`);
      await open(entityId);
    } catch (statusError) {
      setError(
        statusError instanceof Error ? statusError.message : "Failed to update sheet status",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function promote(sheetId: string, entityId: string) {
    setBusyAction(`promote:${sheetId}`);
    setError(null);
    try {
      const res = await studioMutation("entities.promoteSheet", `/api/sheets/${sheetId}/promote`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to promote sheet");
      await open(entityId);
    } catch (promoteError) {
      setError(promoteError instanceof Error ? promoteError.message : "Failed to promote sheet");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <SectionPanel
      title="Entities"
      description="Maintain the characters, locations and props that anchor visual continuity."
    >
      <div className="space-y-5" aria-busy={busyAction !== null}>
        <div className="grid gap-4 lg:grid-cols-[minmax(10rem,0.35fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label htmlFor="entity-type">Entity type</Label>
            <select
              id="entity-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
            >
              <option value="character">Characters</option>
              <option value="location">Locations</option>
              <option value="prop">Props</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="entity-name">Name</Label>
            <Input
              id="entity-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Entity name"
              disabled={busyAction !== null}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="entity-data">Data (JSON)</Label>
          <Textarea
            id="entity-data"
            value={dataJson}
            onChange={(event) => setDataJson(event.target.value)}
            rows={4}
            className="font-mono text-xs"
            aria-invalid={error === "Invalid data JSON"}
            disabled={busyAction !== null}
          />
          <p className="text-xs text-muted-foreground">
            Add only the canonical traits this entity needs to preserve.
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={create}
            disabled={busyAction !== null || name.trim().length === 0}
          >
            {busyAction === "create" ? "Creating…" : "Create entity"}
          </Button>
        </div>

        {error ? (
          <InlineNotice title="Entity action failed" variant="destructive">
            <div className="flex flex-wrap items-center gap-3">
              <span>{error}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          </InlineNotice>
        ) : null}

        {loading ? (
          <LoadingSkeleton rows={2} />
        ) : error ? null : entities.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={`No ${type}s yet`}
            description="Create the first entity to establish a reusable continuity reference for this series."
            compact
          />
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2" aria-label={`${type} entities`}>
            {entities.map((entity) => {
              const entityVersions = versions[entity.id] ?? [];
              const entitySheets = sheets[entity.id] ?? [];
              const isOpening = busyAction === `open:${entity.id}`;
              return (
                <li key={entity.id} className="min-w-0 rounded-xl border bg-card p-4 shadow-xs">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{entity.name}</p>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">{entity.type}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => open(entity.id)}
                        disabled={busyAction !== null}
                      >
                        {isOpening ? "Loading…" : "View details"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => generateSheet(entity.id)}
                        disabled={busyAction !== null}
                      >
                        {busyAction === `sheet:${entity.id}` ? "Generating…" : "Generate sheet"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 rounded-lg border bg-muted/20 p-3">
                    <div className="space-y-2">
                      <Label htmlFor={`entity-details-${entity.id}`}>
                        Details for AI{" "}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Textarea
                        id={`entity-details-${entity.id}`}
                        value={entityDetails[entity.id] ?? ""}
                        onChange={(event) =>
                          setEntityDetails((current) => ({
                            ...current,
                            [entity.id]: event.target.value,
                          }))
                        }
                        rows={3}
                        maxLength={4000}
                        placeholder={`Describe the ${entity.type}'s role, appearance, personality, environment, visual references, state or any constraints the AI should follow.`}
                        aria-describedby={`entity-details-${entity.id}-help`}
                        disabled={busyAction !== null}
                      />
                    </div>
                    <div
                      id={`entity-details-${entity.id}-help`}
                      className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
                    >
                      <p>Included in this generation and recorded in its prompt snapshot.</p>
                      <span className="tabular-nums">
                        {(entityDetails[entity.id] ?? "").length}/4000
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => generate(entity.id)}
                      disabled={busyAction !== null}
                    >
                      {busyAction === `generate:${entity.id}` ? "Generating…" : "Generate with AI"}
                    </Button>
                  </div>

                  {entityVersions.length > 0 ? (
                    <div className="mt-4 border-t pt-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Versions
                      </p>
                      <ul className="space-y-2">
                        {entityVersions.map((version) => (
                          <li key={version.id} className="min-w-0 rounded-lg border bg-muted/20">
                            <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-2 text-sm">
                              <span className="min-w-0 truncate text-muted-foreground">
                                v{version.version} · {version.source}
                              </span>
                              {version.isActive ? (
                                <StatusBadge status="active" />
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => activate(version.id, entity.id)}
                                  disabled={busyAction !== null}
                                >
                                  {busyAction === `activate:${version.id}`
                                    ? "Activating…"
                                    : "Activate"}
                                </Button>
                              )}
                            </div>
                            <details open={version.isActive} className="border-t bg-background/70">
                              <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring">
                                Full version details
                              </summary>
                              <div className="border-t p-3">
                                <EntityVersionData data={version.data} />
                              </div>
                            </details>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {entitySheets.length > 0 ? (
                    <div className="mt-4 border-t pt-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Reference sheets
                      </p>
                      <ul className="space-y-3">
                        {entitySheets.map((sheet) => (
                          <li
                            key={sheet.id}
                            className="flex min-w-0 flex-col gap-3 rounded-lg bg-muted/35 p-3"
                          >
                            {sheet.asset ? (
                              <a
                                href={sheet.asset.url}
                                target="_blank"
                                rel="noreferrer"
                                className="group relative block w-full overflow-hidden rounded-md border bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <img
                                  src={sheet.asset.url}
                                  alt={`${entity.name} reference sheet`}
                                  className="max-h-64 w-full object-contain"
                                />
                                <span className="absolute bottom-2 right-2 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                                  Open full size
                                </span>
                              </a>
                            ) : (
                              <div className="grid min-h-32 place-items-center rounded-md border border-dashed text-xs text-muted-foreground">
                                No preview
                              </div>
                            )}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <StatusBadge status={sheet.status} />
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => sheetStatus(sheet.id, "approved", entity.id)}
                                  disabled={busyAction !== null}
                                >
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => sheetStatus(sheet.id, "rejected", entity.id)}
                                  disabled={busyAction !== null}
                                >
                                  Reject
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => promote(sheet.id, entity.id)}
                                  disabled={busyAction !== null}
                                >
                                  Promote
                                </Button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <span className="sr-only" aria-live="polite">
          {busyAction ? "Entity action in progress" : ""}
        </span>
      </div>
    </SectionPanel>
  );
}
