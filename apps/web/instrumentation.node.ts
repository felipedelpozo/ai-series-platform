export async function registerNodeRuntime(): Promise<void> {
  const { loadEnv } = await import("@ai-series/config");
  loadEnv();

  try {
    const { getDb, ensureDefaultWorkspace } = await import("@ai-series/db");
    const { seedPrompts } = await import("@ai-series/prompts");
    const db = getDb();
    await ensureDefaultWorkspace(db);
    await seedPrompts(db);
  } catch (error) {
    console.warn("[seed] prompt seeding skipped:", error instanceof Error ? error.message : error);
  }
}
