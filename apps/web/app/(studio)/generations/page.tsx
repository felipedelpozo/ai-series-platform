import { desc } from "drizzle-orm";
import { generations, getDb } from "@ai-series/db";
import { GenerationLab } from "@/components/generation-lab";

export const dynamic = "force-dynamic";

export default async function GenerationsPage() {
  const rows = await getDb()
    .select()
    .from(generations)
    .orderBy(desc(generations.createdAt))
    .limit(50);

  return (
    <div className="flex h-full flex-col gap-4">
      <h2 className="text-2xl font-semibold">Generations</h2>
      <GenerationLab />

      <div className="mt-2">
        <h3 className="text-sm font-semibold">Recent</h3>
        {rows.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">No generations yet.</p>
        )}
        <ul className="mt-2 flex flex-col gap-1">
          {rows.map((generation) => (
            <li
              key={generation.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>
                {generation.purpose} · {generation.model}
              </span>
              <span className="text-xs text-muted-foreground">
                {generation.status}
                {generation.requestId ? ` · ${generation.requestId.slice(0, 8)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
