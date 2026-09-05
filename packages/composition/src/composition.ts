import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { asc, eq } from "drizzle-orm";
import {
  assets,
  audioTracks,
  episodeExports,
  generationSteps,
  jobs,
  scenes,
  shots,
  workspace,
  type Db,
} from "@ai-series/db";

const execFileAsync = promisify(execFile);

function assetStoreDir(): string {
  return process.env.ASSET_STORE_DIR ?? ".media";
}

async function resolveWorkspaceId(db: Db): Promise<string> {
  const [row] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(eq(workspace.slug, "default"));
  if (!row) throw new Error("Default workspace not found");
  return row.id;
}

type Visual = { path: string; kind: string };

async function gatherMedia(db: Db, planId: string) {
  const sceneRows = await db
    .select()
    .from(scenes)
    .where(eq(scenes.planId, planId))
    .orderBy(asc(scenes.order));
  const visuals: Visual[] = [];
  const audios: string[] = [];
  const sourceAssetIds: string[] = [];
  for (const scene of sceneRows) {
    const shotRows = await db
      .select()
      .from(shots)
      .where(eq(shots.sceneId, scene.id))
      .orderBy(asc(shots.order));
    for (const shot of shotRows) {
      const steps = await db
        .select()
        .from(generationSteps)
        .where(eq(generationSteps.shotId, shot.id));
      const step =
        steps.find((s) => s.kind === "video" && s.status === "succeeded") ??
        steps.find((s) => s.kind === "keyframe" && s.status === "succeeded");
      if (step?.jobId) {
        const [job] = await db.select().from(jobs).where(eq(jobs.id, step.jobId));
        if (job?.generationId) {
          const [asset] = await db
            .select()
            .from(assets)
            .where(eq(assets.generationId, job.generationId));
          if (asset) {
            visuals.push({ path: join(assetStoreDir(), asset.id), kind: asset.kind });
            sourceAssetIds.push(asset.id);
          }
        }
      }
      const tracks = await db
        .select()
        .from(audioTracks)
        .where(eq(audioTracks.shotId, shot.id));
      for (const track of tracks) {
        if (track.assetId) audios.push(join(assetStoreDir(), track.assetId));
      }
    }
  }
  return { visuals, audios, sourceAssetIds };
}

export async function exportEpisode(
  db: Db,
  input: { planId: string },
): Promise<{ exportId: string; assetId: string }> {
  const { visuals, audios, sourceAssetIds } = await gatherMedia(db, input.planId);
  if (visuals.length === 0) throw new Error("No approved clips to compose");

  const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
  const outId = randomUUID();
  const outDir = assetStoreDir();
  await fs.mkdir(outDir, { recursive: true });
  const outPath = join(outDir, outId);

  const args: string[] = [];
  const filters: string[] = [];
  for (let i = 0; i < visuals.length; i++) {
    const visual = visuals[i]!;
    if (visual.kind === "image") {
      args.push("-loop", "1", "-t", "5", "-i", visual.path);
    } else {
      args.push("-i", visual.path);
    }
    filters.push(
      `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p[v${i}]`,
    );
  }
  if (audios.length > 0) {
    args.push("-i", audios[0]!);
  }
  const concatInputs = visuals.map((_, i) => `[v${i}]`).join("");
  filters.push(`${concatInputs}concat=n=${visuals.length}:v=1:a=0[vout]`);
  args.push("-filter_complex", filters.join(";"));
  args.push("-map", "[vout]");
  if (audios.length > 0) {
    args.push("-map", `${visuals.length}:a`);
  }
  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-c:a",
    "aac",
    "-shortest",
    "-movflags",
    "+faststart",
    "-f",
    "mp4",
    outPath,
  );

  await execFileAsync(ffmpeg, args);

  const [exportRow] = await db
    .insert(episodeExports)
    .values({ planId: input.planId, status: "pending" })
    .returning({ id: episodeExports.id });
  const workspaceId = await resolveWorkspaceId(db);
  await db.insert(assets).values({
    id: outId,
    workspaceId,
    parentId: sourceAssetIds[0] ?? null,
    kind: "video",
    source: "derived",
    url: `/api/assets/${outId}/content`,
    mime: "video/mp4",
    status: "approved",
  });
  await db
    .update(episodeExports)
    .set({ status: "ready", assetId: outId, updatedAt: new Date() })
    .where(eq(episodeExports.id, exportRow.id));
  return { exportId: exportRow.id, assetId: outId };
}
