import { eq } from "drizzle-orm";
import {
  engagementImports,
  tiktokAccounts,
  tiktokVideos,
  type Db,
} from "@ai-series/db";
import { importSignals } from "@ai-series/audience";

export type Capability = {
  id: string;
  label: string;
  mode: "connected" | "manual" | "unavailable";
  connected: boolean;
};

const CAPABILITY_DEFINITIONS = [
  { id: "account.link", label: "Link account", requiresApi: true },
  { id: "video.associate", label: "Associate video", requiresApi: false },
  { id: "engagement.import", label: "Import engagement", requiresApi: false },
  { id: "episode.publish", label: "Publish episode", requiresApi: true },
  { id: "window.automate", label: "Automate window", requiresApi: true },
] as const;

export function isTikTokApiConfigured(): boolean {
  return Boolean(
    process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET,
  );
}

export function getCapabilities(): Capability[] {
  const apiConfigured = isTikTokApiConfigured();
  return CAPABILITY_DEFINITIONS.map((definition) => {
    const connected = !definition.requiresApi || apiConfigured;
    const mode = definition.requiresApi
      ? apiConfigured
        ? "connected"
        : "unavailable"
      : "manual";
    return { id: definition.id, label: definition.label, mode, connected };
  });
}

export async function linkAccount(
  db: Db,
  input: { workspaceId: string; platformUsername?: string; providerAccountId?: string },
): Promise<{ status: "linked" | "unavailable"; reason?: string }> {
  if (!isTikTokApiConfigured()) {
    return { status: "unavailable", reason: "TikTok API credentials not configured" };
  }
  await db.insert(tiktokAccounts).values({
    workspaceId: input.workspaceId,
    platformUsername: input.platformUsername ?? null,
    providerAccountId: input.providerAccountId ?? null,
    status: "linked",
    capabilities: ["video.associate", "engagement.import", "episode.publish"],
    linkedAt: new Date(),
  });
  return { status: "linked" };
}

export async function associateVideo(
  db: Db,
  input: {
    seriesId: string;
    episodeNumber: number;
    url: string;
    providerVideoId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<string> {
  const [created] = await db
    .insert(tiktokVideos)
    .values({
      seriesId: input.seriesId,
      episodeNumber: input.episodeNumber,
      url: input.url,
      providerVideoId: input.providerVideoId ?? null,
      metadata: input.metadata ?? null,
      status: "associated",
    })
    .returning({ id: tiktokVideos.id });
  return created.id;
}

export type EngagementEvent = {
  id?: string;
  comment?: string;
  liked?: boolean;
  reaction?: string;
  metadata?: Record<string, unknown>;
  raw?: Record<string, unknown>;
};

export async function importEngagement(
  db: Db,
  input: {
    seriesId: string;
    episodeNumber: number;
    events: EngagementEvent[];
    source?: string;
    correlationId?: string;
  },
): Promise<{ importId: string; signalsImported: number }> {
  const [created] = await db
    .insert(engagementImports)
    .values({
      seriesId: input.seriesId,
      episodeNumber: input.episodeNumber,
      source: input.source ?? "manual",
      status: "imported",
      payload: { events: input.events },
      correlationId: input.correlationId ?? null,
    })
    .returning({ id: engagementImports.id });

  const signals = input.events.map((event, index) => ({
    platform: "tiktok",
    sourceId: event.id ?? `${created.id}-${index}`,
    raw: event.raw ?? {},
    comment: event.comment,
    liked: event.liked,
    reaction: event.reaction,
    metadata: event.metadata,
  }));
  const { imported } = await importSignals(db, {
    seriesId: input.seriesId,
    episodeNumber: input.episodeNumber,
    signals,
  });

  await db
    .update(engagementImports)
    .set({ signalCount: imported })
    .where(eq(engagementImports.id, created.id));

  return { importId: created.id, signalsImported: imported };
}

export async function publishEpisode(
  db: Db,
  _input: { seriesId: string; episodeNumber: number },
): Promise<{ status: "queued" | "unavailable"; reason?: string }> {
  const linked = await db
    .select()
    .from(tiktokAccounts)
    .where(eq(tiktokAccounts.status, "linked"))
    .limit(1);
  if (linked.length === 0) {
    return {
      status: "unavailable",
      reason: "publish requires a linked account (account.link unavailable)",
    };
  }
  return { status: "queued" };
}

export async function automateWindow(): Promise<{
  status: "available" | "unavailable";
  reason?: string;
}> {
  const capability = getCapabilities().find((c) => c.id === "window.automate");
  if (!capability?.connected) {
    return { status: "unavailable", reason: "window automation requires TikTok API access" };
  }
  return { status: "available" };
}

export async function getConnectionStatus(db: Db, seriesId?: string) {
  const capabilities = getCapabilities();
  const accounts = await db.select().from(tiktokAccounts);
  const videos = seriesId
    ? await db.select().from(tiktokVideos).where(eq(tiktokVideos.seriesId, seriesId))
    : [];
  const imports = seriesId
    ? await db.select().from(engagementImports).where(eq(engagementImports.seriesId, seriesId))
    : [];
  return { capabilities, accounts, videos, imports };
}

export function backoffMs(attempt: number, baseMs = 1000): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(baseMs * 2 ** exponent, 60_000);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: {
    maxAttempts?: number;
    baseMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  },
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 3;
  const baseMs = opts?.baseMs ?? 1000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const retry = opts?.shouldRetry?.(error) ?? true;
      if (!retry || attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, backoffMs(attempt, baseMs)));
    }
  }
  throw new Error("unreachable");
}
