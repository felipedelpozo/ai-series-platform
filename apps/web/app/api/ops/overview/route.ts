import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import {
  costByProviderModel,
  costBySeries,
  detectOrphanOutputs,
  getDurationStats,
  getJobHealth,
} from "@ai-series/ops";

export async function GET() {
  const db = getDb();
  const [health, durations, byProviderModel, bySeries, orphans] = await Promise.all([
    getJobHealth(db),
    getDurationStats(db),
    costByProviderModel(db),
    costBySeries(db),
    detectOrphanOutputs(db),
  ]);
  return NextResponse.json({
    health,
    durations,
    costByProviderModel: byProviderModel,
    costBySeries: bySeries,
    orphanCount: orphans.length,
  });
}
