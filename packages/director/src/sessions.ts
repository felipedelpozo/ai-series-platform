import { desc, eq } from "drizzle-orm";
import { directorSessions, type Db } from "@ai-series/db";

export type DirectorStatus = "idle" | "streaming" | "stopped" | "error";

export async function startDirectorSession(
  db: Db,
  input: {
    shotId: string;
    initialPrompt: string;
    aspectRatio?: string;
    resolution?: string;
    memory?: string;
  },
): Promise<string> {
  const [created] = await db
    .insert(directorSessions)
    .values({
      shotId: input.shotId,
      status: "idle",
      initialPrompt: input.initialPrompt,
      currentPrompt: input.initialPrompt,
      aspectRatio: input.aspectRatio ?? null,
      resolution: input.resolution ?? null,
      memory: input.memory ?? null,
      promptVersion: 1,
    })
    .returning({ id: directorSessions.id });
  return created.id;
}

export async function updateDirectorPrompt(
  db: Db,
  sessionId: string,
  prompt: string,
): Promise<number> {
  const [session] = await db
    .select()
    .from(directorSessions)
    .where(eq(directorSessions.id, sessionId));
  if (!session) throw new Error("Session not found");
  if (session.status === "stopped") throw new Error("Session is stopped");
  const nextVersion = session.promptVersion + 1;
  await db
    .update(directorSessions)
    .set({ currentPrompt: prompt, promptVersion: nextVersion, status: "streaming", updatedAt: new Date() })
    .where(eq(directorSessions.id, sessionId));
  return nextVersion;
}

export async function stopDirectorSession(db: Db, sessionId: string): Promise<void> {
  await db
    .update(directorSessions)
    .set({ status: "stopped", updatedAt: new Date() })
    .where(eq(directorSessions.id, sessionId));
}

export async function markDirectorError(db: Db, sessionId: string): Promise<void> {
  await db
    .update(directorSessions)
    .set({ status: "error", updatedAt: new Date() })
    .where(eq(directorSessions.id, sessionId));
}

export async function listDirectorSessions(db: Db, shotId: string) {
  return db
    .select()
    .from(directorSessions)
    .where(eq(directorSessions.shotId, shotId))
    .orderBy(desc(directorSessions.createdAt))
    .limit(100);
}
