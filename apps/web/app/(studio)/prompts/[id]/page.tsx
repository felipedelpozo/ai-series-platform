import { notFound } from "next/navigation";
import { getDb } from "@ai-series/db";
import { getPromptDetail } from "@ai-series/prompts";
import { PromptEditor } from "@/components/prompt-editor";

export default async function PromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPromptDetail(getDb(), id);
  if (!detail) {
    notFound();
  }

  return (
    <PromptEditor
      template={{
        id: detail.template.id,
        name: detail.template.name,
        description: detail.template.description,
        purpose: detail.template.purpose,
        status: detail.template.status,
      }}
      versions={detail.versions.map((version) => ({
        id: version.id,
        version: version.version,
        template: version.template,
        variables: version.variables,
        isActive: version.isActive,
      }))}
    />
  );
}
