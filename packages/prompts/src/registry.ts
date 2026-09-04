import { and, desc, eq } from "drizzle-orm";
import {
  promptSnapshots,
  promptTemplates,
  promptVersions,
  workspace,
  type Db,
  type PromptVariable,
} from "@ai-series/db";
import { renderTemplate } from "./render";

export type ScopeType = "global" | "workspace" | "series" | "episode" | "scene" | "shot";

export type CreateTemplateInput = {
  workspaceId?: string;
  purpose: string;
  name: string;
  description?: string;
  template: string;
  variables?: PromptVariable[];
  outputContract?: Record<string, unknown>;
  scopeType?: ScopeType;
  scopeId?: string | null;
};

export type EditTemplateInput = {
  name: string;
  description?: string;
  template: string;
  variables?: PromptVariable[];
  outputContract?: Record<string, unknown>;
};

async function resolveWorkspaceId(db: Db): Promise<string> {
  const [row] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(eq(workspace.slug, "default"));
  if (!row) {
    throw new Error("Default workspace not found; run migrations and seed first");
  }
  return row.id;
}

export async function createPromptTemplate(
  db: Db,
  input: CreateTemplateInput,
): Promise<{ id: string; versionId: string }> {
  const workspaceId = input.workspaceId ?? (await resolveWorkspaceId(db));
  const [template] = await db
    .insert(promptTemplates)
    .values({
      workspaceId,
      purpose: input.purpose,
      name: input.name,
      description: input.description ?? null,
      scopeType: input.scopeType ?? "global",
      scopeId: input.scopeId ?? null,
      status: "active",
    })
    .returning({ id: promptTemplates.id });

  const [version] = await db
    .insert(promptVersions)
    .values({
      templateId: template.id,
      version: 1,
      template: input.template,
      variables: input.variables ?? [],
      outputContract: input.outputContract ?? null,
      isActive: true,
    })
    .returning({ id: promptVersions.id });

  return { id: template.id, versionId: version.id };
}

export async function editPromptTemplate(
  db: Db,
  templateId: string,
  input: EditTemplateInput,
): Promise<{ versionId: string }> {
  return db.transaction(async (tx) => {
    const versions = await tx
      .select({ version: promptVersions.version })
      .from(promptVersions)
      .where(eq(promptVersions.templateId, templateId));
    const next = Math.max(0, ...versions.map((v) => v.version)) + 1;

    await tx
      .update(promptVersions)
      .set({ isActive: false })
      .where(and(eq(promptVersions.templateId, templateId), eq(promptVersions.isActive, true)));

    const [version] = await tx
      .insert(promptVersions)
      .values({
        templateId,
        version: next,
        template: input.template,
        variables: input.variables ?? [],
        outputContract: input.outputContract ?? null,
        isActive: true,
      })
      .returning({ id: promptVersions.id });

    await tx
      .update(promptTemplates)
      .set({ name: input.name, description: input.description ?? null, updatedAt: new Date() })
      .where(eq(promptTemplates.id, templateId));

    return { versionId: version.id };
  });
}

export async function activatePromptVersion(db: Db, versionId: string): Promise<void> {
  const [version] = await db
    .select()
    .from(promptVersions)
    .where(eq(promptVersions.id, versionId));
  if (!version) {
    throw new Error("Version not found");
  }
  await db.transaction(async (tx) => {
    await tx
      .update(promptVersions)
      .set({ isActive: false })
      .where(eq(promptVersions.templateId, version.templateId));
    await tx
      .update(promptVersions)
      .set({ isActive: true })
      .where(eq(promptVersions.id, versionId));
  });
}

export async function archivePromptTemplate(db: Db, templateId: string): Promise<void> {
  await db
    .update(promptTemplates)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(promptTemplates.id, templateId));
}

export async function clonePromptTemplate(
  db: Db,
  templateId: string,
): Promise<{ id: string }> {
  const [template] = await db
    .select()
    .from(promptTemplates)
    .where(eq(promptTemplates.id, templateId));
  if (!template) {
    throw new Error("Template not found");
  }
  const active = await db
    .select()
    .from(promptVersions)
    .where(and(eq(promptVersions.templateId, templateId), eq(promptVersions.isActive, true)));
  const source = active[0];
  const created = await createPromptTemplate(db, {
    workspaceId: template.workspaceId,
    purpose: template.purpose,
    name: `${template.name} (copy)`,
    description: template.description ?? undefined,
    template: source?.template ?? "",
    variables: source?.variables ?? [],
    outputContract: source?.outputContract ?? undefined,
    scopeType: template.scopeType as ScopeType,
    scopeId: template.scopeId,
  });
  return { id: created.id };
}

export async function listPromptTemplates(
  db: Db,
  purpose?: string,
): Promise<(typeof promptTemplates.$inferSelect)[]> {
  return db
    .select()
    .from(promptTemplates)
    .where(purpose ? eq(promptTemplates.purpose, purpose) : undefined)
    .orderBy(desc(promptTemplates.createdAt));
}

export async function getPromptDetail(db: Db, templateId: string) {
  const [template] = await db
    .select()
    .from(promptTemplates)
    .where(eq(promptTemplates.id, templateId));
  if (!template) {
    return null;
  }
  const versions = await db
    .select()
    .from(promptVersions)
    .where(eq(promptVersions.templateId, templateId))
    .orderBy(desc(promptVersions.version));
  return { template, versions };
}

export async function savePromptSnapshot(
  db: Db,
  input: {
    versionId: string;
    variables: Record<string, string>;
    model?: string;
    params?: Record<string, unknown>;
  },
): Promise<{ id: string }> {
  const [version] = await db
    .select()
    .from(promptVersions)
    .where(eq(promptVersions.id, input.versionId));
  if (!version) {
    throw new Error("Version not found");
  }
  const { rendered, missing } = renderTemplate(version.template, input.variables, version.variables);
  if (missing.length > 0) {
    throw new Error(`Missing required variables: ${missing.join(", ")}`);
  }
  const [snapshot] = await db
    .insert(promptSnapshots)
    .values({
      templateId: version.templateId,
      versionId: version.id,
      renderedText: rendered,
      variables: input.variables,
      model: input.model ?? null,
      params: input.params ?? null,
    })
    .returning({ id: promptSnapshots.id });
  return { id: snapshot.id };
}
