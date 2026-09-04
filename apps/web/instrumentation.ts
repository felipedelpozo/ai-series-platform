import { config } from "dotenv";
import { join } from "node:path";

config({ path: join(process.cwd(), "..", "..", ".env") });

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { loadEnv } = await import("@ai-series/config");
    loadEnv();

    try {
      const { getDb, ensureDefaultWorkspace } = await import("@ai-series/db");
      const { seedPrompts } = await import("@ai-series/prompts");
      const db = getDb();
      await ensureDefaultWorkspace(db);
      await seedPrompts(db);
    } catch (error) {
      console.warn(
        "[seed] prompt seeding skipped:",
        error instanceof Error ? error.message : error,
      );
    }
  }
}
