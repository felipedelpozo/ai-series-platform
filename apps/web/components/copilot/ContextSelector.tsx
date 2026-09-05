"use client";

import Link from "next/link";
import {
  Badge,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ai-series/ui";
import { ChevronRight, Clapperboard, Layers3, LockKeyhole } from "lucide-react";
import type { CopilotContext, CopilotRole } from "@/lib/copilot-loader";
import type { CopilotEpisodeOption, CopilotResourceOption } from "@/lib/copilot-loader";

export function ContextSelector({
  context,
  role,
  workspaces,
  series,
  episodes,
  resources,
  disabled,
  loadingOptions,
  onWorkspaceChange,
  onSeriesChange,
  onEpisodeChange,
  onResourceChange,
}: {
  context: CopilotContext;
  role: CopilotRole;
  workspaces: { id: string; name: string; role: CopilotRole }[];
  series: { id: string; name: string; workspaceId?: string }[];
  episodes: CopilotEpisodeOption[];
  resources: CopilotResourceOption[];
  disabled?: boolean;
  loadingOptions?: boolean;
  onWorkspaceChange: (workspaceId: string) => void;
  onSeriesChange: (seriesId: string | undefined) => void;
  onEpisodeChange: (episodePlanId: string | undefined) => void;
  onResourceChange: (resource: CopilotResourceOption | undefined) => void;
}) {
  return (
    <section aria-label="Active copilot context" className="border-b bg-background px-4 py-3">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
          <span className="inline-flex min-w-0 items-center gap-1.5 font-medium">
            <Layers3 className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="max-w-44 truncate">{context.workspaceName || "Workspace"}</span>
          </span>
          {context.seriesName ? (
            <>
              <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="max-w-44 truncate">{context.seriesName}</span>
            </>
          ) : null}
          {context.episodeNumber ? (
            <>
              <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span>Episode {context.episodeNumber}</span>
            </>
          ) : null}
          {context.resource ? (
            <>
              <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="max-w-44 truncate">
                {context.resource.label ?? `${context.resource.type} ${context.resource.id}`}
              </span>
            </>
          ) : null}
          <Badge variant={role === "viewer" ? "muted" : "success"} className="ml-1">
            {role === "viewer" ? <LockKeyhole aria-hidden="true" /> : null}
            {role === "viewer" ? "Read-only · viewer" : role}
          </Badge>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-40 space-y-1">
            <Label htmlFor="copilot-workspace-context" className="text-xs">
              Workspace
            </Label>
            <Select
              value={context.workspaceId}
              disabled={disabled || workspaces.length < 2}
              onValueChange={onWorkspaceChange}
            >
              <SelectTrigger id="copilot-workspace-context" aria-label="Workspace context">
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-40 space-y-1">
            <Label htmlFor="copilot-series-context" className="text-xs">
              Series
            </Label>
            <Select
              value={context.seriesId ?? "workspace"}
              disabled={disabled}
              onValueChange={(value) => onSeriesChange(value === "workspace" ? undefined : value)}
            >
              <SelectTrigger id="copilot-series-context" aria-label="Series context">
                <SelectValue placeholder="Workspace-wide" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="workspace">Workspace-wide</SelectItem>
                {series.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-40 space-y-1">
            <Label htmlFor="copilot-episode-context" className="text-xs">
              Episode
            </Label>
            <Select
              value={context.episodePlanId ?? "series"}
              disabled={disabled || loadingOptions || !context.seriesId}
              onValueChange={(value) => onEpisodeChange(value === "series" ? undefined : value)}
            >
              <SelectTrigger id="copilot-episode-context" aria-label="Episode context">
                <SelectValue placeholder={loadingOptions ? "Loading…" : "Whole Series"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="series">Whole Series</SelectItem>
                {episodes.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    Episode {item.episodeNumber}
                    {item.version ? ` · v${item.version}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-40 space-y-1">
            <Label htmlFor="copilot-resource-context" className="text-xs">
              Resource
            </Label>
            <Select
              value={context.resource ? `${context.resource.type}:${context.resource.id}` : "all"}
              disabled={disabled || loadingOptions || !context.seriesId}
              onValueChange={(value) =>
                onResourceChange(
                  value === "all"
                    ? undefined
                    : resources.find((item) => `${item.type}:${item.id}` === value),
                )
              }
            >
              <SelectTrigger id="copilot-resource-context" aria-label="Resource context">
                <SelectValue placeholder={loadingOptions ? "Loading…" : "All resources"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All resources</SelectItem>
                {resources.map((item) => (
                  <SelectItem key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end xl:col-span-4 xl:justify-end">
            <Link
              href={
                context.seriesId
                  ? `/series?seriesId=${encodeURIComponent(context.seriesId)}`
                  : "/series"
              }
              className="inline-flex min-h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Clapperboard className="size-4" aria-hidden="true" />
              Series Workspace
            </Link>
          </div>
        </div>
      </div>
      <p className="mt-2 font-mono text-[0.625rem] text-muted-foreground">
        New proposals are pinned to this context. Existing revisions never retarget silently.
      </p>
    </section>
  );
}
