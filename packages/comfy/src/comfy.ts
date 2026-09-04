import { desc, eq } from "drizzle-orm";
import { comfyWorkflows, type Db } from "@ai-series/db";

export type ComfyExecutionAdapter = {
  execute(input: Record<string, unknown>): Promise<{ ok: boolean; error?: string }>;
};

export function createComfyAdapter(serverUrl?: string): ComfyExecutionAdapter | null {
  const url = serverUrl ?? process.env.COMFY_URL;
  if (!url) return null;
  return {
    async execute(input) {
      try {
        const res = await fetch(`${url}/prompt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: input }),
        });
        return { ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "comfy unreachable" };
      }
    },
  };
}

export async function registerWorkflow(
  db: Db,
  input: { name: string; version?: string; params?: Record<string, unknown> },
): Promise<string> {
  const [created] = await db
    .insert(comfyWorkflows)
    .values({ name: input.name, version: input.version ?? "1", params: input.params ?? {} })
    .returning({ id: comfyWorkflows.id });
  return created.id;
}

export async function listWorkflows(db: Db) {
  return db.select().from(comfyWorkflows).orderBy(desc(comfyWorkflows.createdAt)).limit(200);
}

export async function executeWorkflow(
  db: Db,
  workflowId: string,
  input: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const [workflow] = await db.select().from(comfyWorkflows).where(eq(comfyWorkflows.id, workflowId));
  if (!workflow) return { ok: false, error: "workflow not found" };
  const adapter = createComfyAdapter();
  if (!adapter) return { ok: false, error: "ComfyUI is not configured (COMFY_URL)" };
  return adapter.execute({ workflow: workflow.name, params: workflow.params, ...input });
}
