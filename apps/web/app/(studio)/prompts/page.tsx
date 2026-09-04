import Link from "next/link";
import { getDb } from "@ai-series/db";
import { listPromptTemplates, PURPOSES } from "@ai-series/prompts";
import { NewPromptForm } from "@/components/new-prompt-form";

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ purpose?: string }>;
}) {
  const { purpose } = await searchParams;
  const templates = await listPromptTemplates(getDb(), purpose);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Prompts</h2>
        <form method="GET" className="flex items-center gap-2">
          <label htmlFor="purpose" className="text-xs text-muted-foreground">
            Purpose
          </label>
          <select
            id="purpose"
            name="purpose"
            defaultValue={purpose ?? ""}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {PURPOSES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border px-3 py-1 text-sm hover:bg-accent"
          >
            Filter
          </button>
        </form>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4">
        <ul className="flex flex-col gap-2">
          {templates.length === 0 && (
            <li className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No templates.
            </li>
          )}
          {templates.map((template) => (
            <li key={template.id}>
              <Link
                href={`/prompts/${template.id}`}
                className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-accent"
              >
                <div>
                  <p className="font-medium">{template.name}</p>
                  <p className="text-xs text-muted-foreground">{template.purpose}</p>
                </div>
                <span className="text-xs text-muted-foreground">{template.status}</span>
              </Link>
            </li>
          ))}
        </ul>
        <NewPromptForm purposes={PURPOSES} />
      </div>
    </div>
  );
}
