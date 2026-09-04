import { promises as fs } from "node:fs";
import { join } from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { assets, generations, type Db } from "@ai-series/db";

export type AssetStatus = "draft" | "approved" | "rejected" | "locked";
export type AssetFilters = { kind?: string; source?: string; status?: string };

const ALLOWED_STATUSES: AssetStatus[] = ["draft", "approved", "rejected", "locked"];

export function canTransition(from: string, to: AssetStatus): boolean {
  return from !== "locked" && ALLOWED_STATUSES.includes(to);
}

export async function listAssets(db: Db, filters: AssetFilters = {}) {
  return db
    .select()
    .from(assets)
    .where(
      and(
        filters.kind ? eq(assets.kind, filters.kind) : undefined,
        filters.source ? eq(assets.source, filters.source) : undefined,
        filters.status ? eq(assets.status, filters.status) : undefined,
      ),
    )
    .orderBy(desc(assets.createdAt))
    .limit(200);
}

export async function getAssetDetail(db: Db, id: string) {
  const [asset] = await db.select().from(assets).where(eq(assets.id, id));
  if (!asset) {
    return null;
  }
  const children = await db.select().from(assets).where(eq(assets.parentId, id));
  const generation = asset.generationId
    ? (await db.select().from(generations).where(eq(generations.id, asset.generationId)))[0]
    : undefined;
  return { asset, children, generation };
}

export async function updateAssetStatus(db: Db, id: string, status: AssetStatus) {
  const [asset] = await db.select().from(assets).where(eq(assets.id, id));
  if (!asset) {
    throw new Error("Asset not found");
  }
  if (!canTransition(asset.status, status)) {
    throw new Error(`Cannot transition asset from ${asset.status} to ${status}`);
  }
  await db.update(assets).set({ status }).where(eq(assets.id, id));
  return { id, status };
}

export async function deleteAsset(
  db: Db,
  id: string,
  dir = process.env.ASSET_STORE_DIR ?? ".media",
): Promise<{ deleted: boolean; reason?: string }> {
  const [asset] = await db.select().from(assets).where(eq(assets.id, id));
  if (!asset) {
    return { deleted: false, reason: "not-found" };
  }
  const [child] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(eq(assets.parentId, id))
    .limit(1);
  if (child) {
    return { deleted: false, reason: "has-children" };
  }
  await db.delete(assets).where(eq(assets.id, id));
  try {
    await fs.unlink(join(dir, id));
  } catch {
    // file may not exist; the row is already deleted
  }
  return { deleted: true };
}
