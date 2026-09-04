import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { desc, eq } from "drizzle-orm";
import { assets, audioTracks, workspace, type Db } from "@ai-series/db";

async function resolveWorkspaceId(db: Db): Promise<string> {
  const [row] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(eq(workspace.slug, "default"));
  if (!row) throw new Error("Default workspace not found");
  return row.id;
}

export async function synthesizeSpeech(input: {
  text: string;
  voice?: string;
  model?: string;
}): Promise<{ buffer: Buffer; mime: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: input.model ?? "tts-1",
      voice: input.voice ?? "alloy",
      input: input.text,
    }),
  });
  if (!res.ok) throw new Error(`TTS failed: HTTP ${res.status}`);
  return { buffer: Buffer.from(await res.arrayBuffer()), mime: "audio/mpeg" };
}

export async function generateVoiceTrack(
  db: Db,
  input: { shotId: string; text: string; voice?: string },
): Promise<string> {
  const { buffer } = await synthesizeSpeech({ text: input.text, voice: input.voice });
  const dir = process.env.ASSET_STORE_DIR ?? ".media";
  await fs.mkdir(dir, { recursive: true });
  const assetId = randomUUID();
  await fs.writeFile(join(/* turbopackIgnore: true */ dir, assetId), buffer);
  const workspaceId = await resolveWorkspaceId(db);
  await db.insert(assets).values({
    id: assetId,
    workspaceId,
    kind: "audio",
    source: "generated",
    url: `/api/assets/${assetId}/content`,
    mime: "audio/mpeg",
    sizeBytes: buffer.length,
    provider: "openai",
    model: "tts-1",
    status: "approved",
  });
  const [track] = await db
    .insert(audioTracks)
    .values({
      shotId: input.shotId,
      kind: "voice",
      status: "ready",
      text: input.text,
      voice: input.voice ?? "alloy",
      assetId,
    })
    .returning({ id: audioTracks.id });
  return track.id;
}

export async function listAudioTracks(db: Db, shotId: string) {
  return db
    .select()
    .from(audioTracks)
    .where(eq(audioTracks.shotId, shotId))
    .orderBy(desc(audioTracks.createdAt))
    .limit(100);
}
