import Link from "next/link";
import { FileText, Filter } from "lucide-react";
import { getDb } from "@ai-series/db";
import { listPromptTemplates, PURPOSES } from "@ai-series/prompts";
import { Button, Label } from "@ai-series/ui";
import { NewPromptForm } from "@/components/new-prompt-form";
import { EmptyState, PageHeader, SectionPanel, StatusBadge } from "@/components/ui";

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ purpose?: string }>;
}) {
  const { purpose } = await searchParams;
  const templates = await listPromptTemplates(getDb(), purpose);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Prompt registry"
        title="Prompt library"
        description="Manage the versioned instructions behind every production step, then inspect or refine the active template."
      />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <SectionPanel
          title="Templates"
          description={
            purpose
              ? `${templates.length} template${templates.length === 1 ? "" : "s"} for ${purpose}`
              : `${templates.length} template${templates.length === 1 ? "" : "s"} across all purposes`
          }
        >
          <form
            method="GET"
            className="mb-5 flex flex-col gap-2 border-b pb-5 sm:flex-row sm:items-end sm:justify-between"
          >
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Filter by the production step that consumes each instruction.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="purpose-filter">Purpose</Label>
                <select
                  id="purpose-filter"
                  name="purpose"
                  defaultValue={purpose ?? ""}
                  className="flex h-10 max-w-48 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-[color,box-shadow,border-color] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
                >
                  <option value="">All purposes</option>
                  {PURPOSES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" variant="outline">
                <Filter aria-hidden="true" />
                Filter
              </Button>
            </div>
          </form>

          {templates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={purpose ? "No templates match this purpose" : "No prompt templates yet"}
              description={
                purpose
                  ? "Choose another purpose or create a template for this production step."
                  : "Create the first reusable template to make generation instructions visible and versioned."
              }
              action={
                purpose ? (
                  <Button asChild variant="outline">
                    <Link href="/prompts">Clear filter</Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <a href="#new-prompt">Create a template</a>
                  </Button>
                )
              }
              compact
            />
          ) : (
            <ul className="grid min-w-0 gap-3 sm:grid-cols-2" aria-label="Prompt templates">
              {templates.map((template) => (
                <li key={template.id} className="min-w-0">
                  <Link
                    href={`/prompts/${template.id}`}
                    className="flex min-h-28 min-w-0 flex-col justify-between gap-4 rounded-md border bg-background p-4 outline-none transition-colors hover:border-foreground/20 hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{template.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {template.purpose}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <StatusBadge status={template.status} />
                      <span className="text-xs text-muted-foreground">Open editor</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>

        <div id="new-prompt" className="scroll-mt-24">
          <NewPromptForm purposes={PURPOSES} />
        </div>
      </div>
    </div>
  );
}
