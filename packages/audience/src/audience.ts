import { and, eq } from "drizzle-orm";
import { audienceSignals, interactionWindows, type Db } from "@ai-series/db";

export type SignalInput = {
  platform: string;
  sourceId: string;
  raw: Record<string, unknown>;
  comment?: string;
  liked?: boolean;
  reaction?: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
};

export function detectSpam(input: {
  comment?: string;
  reaction?: string;
  metadata?: Record<string, unknown>;
}): boolean {
  const optionLabel = input.metadata?.optionLabel;
  const optionId = input.metadata?.optionId;
  const hasExplicitOption =
    (typeof optionLabel === "string" && optionLabel.trim().length > 0) ||
    (typeof optionId === "string" && optionId.trim().length > 0);
  if (hasExplicitOption) return false;
  const text = `${input.comment ?? ""} ${input.reaction ?? ""}`.trim();
  if (!text) return true;
  if (/https?:\/\//.test(text)) return true;
  if (text.length > 500) return true;
  return false;
}

export async function importSignals(
  db: Db,
  input: { seriesId: string; episodeNumber: number; windowId?: string; signals: SignalInput[] },
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;
  for (const signal of input.signals) {
    const isSpam = detectSpam(signal);
    const [row] = await db
      .insert(audienceSignals)
      .values({
        seriesId: input.seriesId,
        episodeNumber: input.episodeNumber,
        windowId: input.windowId ?? null,
        platform: signal.platform,
        sourceId: signal.sourceId,
        raw: signal.raw,
        comment: signal.comment ?? null,
        liked: signal.liked ?? false,
        reaction: signal.reaction ?? null,
        replyTo: signal.replyTo ?? null,
        metadata: signal.metadata ?? null,
        isSpam,
      })
      .onConflictDoNothing({ target: [audienceSignals.platform, audienceSignals.sourceId] })
      .returning({ id: audienceSignals.id });
    if (row) imported++;
    else skipped++;
  }
  return { imported, skipped };
}

export async function openWindow(
  db: Db,
  input: { seriesId: string; episodeNumber: number },
): Promise<string> {
  const [created] = await db
    .insert(interactionWindows)
    .values({ seriesId: input.seriesId, episodeNumber: input.episodeNumber, status: "open" })
    .returning({ id: interactionWindows.id });
  return created.id;
}

export async function closeWindow(db: Db, windowId: string): Promise<void> {
  await db
    .update(interactionWindows)
    .set({ status: "closed", updatedAt: new Date() })
    .where(eq(interactionWindows.id, windowId));
}

export async function getSignalStats(db: Db, seriesId: string, episodeNumber: number) {
  const signals = await db
    .select()
    .from(audienceSignals)
    .where(and(eq(audienceSignals.seriesId, seriesId), eq(audienceSignals.episodeNumber, episodeNumber)));
  const total = signals.length;
  const spam = signals.filter((s) => s.isSpam).length;
  const likes = signals.filter((s) => s.liked).length;
  return { total, spam, likes, clean: total - spam };
}
