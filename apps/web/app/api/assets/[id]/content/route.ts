import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { assets, getDb } from "@ai-series/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [asset] = await getDb().select().from(assets).where(eq(assets.id, id));
  if (!asset) {
    return new NextResponse("Not found", { status: 404 });
  }
  const dir = process.env.ASSET_STORE_DIR ?? ".media";
  try {
    const data = await fs.readFile(join(/* turbopackIgnore: true */ dir, id));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": asset.mime ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
