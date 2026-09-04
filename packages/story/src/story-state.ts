import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { storyStates, type Db } from "@ai-series/db";

export const StoryStateSchema = z.object({
  currentEpisode: z.number().int().min(1).default(1),
  characters: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        location: z.string().default(""),
        state: z.string().default(""),
        relationships: z.record(z.string(), z.number()).default({}),
      }),
    )
    .default([]),
  inventory: z.array(z.string()).default([]),
  facts: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  secretsKnown: z.array(z.string()).default([]),
  secretsUnknown: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([]),
  pastDecisions: z.array(z.string()).default([]),
  pendingConsequences: z.array(z.string()).default([]),
  canon: z.array(z.string()).default([]),
});
export type StoryState = z.infer<typeof StoryStateSchema>;

export async function recordStoryState(
  db: Db,
  input: { seriesId: string; kind: "before" | "after"; episode?: number; data: StoryState },
): Promise<string> {
  const parsed = StoryStateSchema.parse(input.data);
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ version: storyStates.version })
      .from(storyStates)
      .where(eq(storyStates.seriesId, input.seriesId));
    const next = Math.max(0, ...existing.map((v) => v.version)) + 1;
    await tx
      .update(storyStates)
      .set({ isCurrent: false })
      .where(eq(storyStates.seriesId, input.seriesId));
    const [created] = await tx
      .insert(storyStates)
      .values({
        seriesId: input.seriesId,
        version: next,
        kind: input.kind,
        episode: input.episode ?? null,
        data: parsed,
        isCurrent: true,
      })
      .returning({ id: storyStates.id });
    return created.id;
  });
}

export async function getCurrentStoryState(db: Db, seriesId: string) {
  const [state] = await db
    .select()
    .from(storyStates)
    .where(eq(storyStates.seriesId, seriesId))
    .orderBy(desc(storyStates.version))
    .limit(1);
  return state ?? null;
}

export async function getStoryStateHistory(db: Db, seriesId: string) {
  return db
    .select()
    .from(storyStates)
    .where(eq(storyStates.seriesId, seriesId))
    .orderBy(desc(storyStates.version))
    .limit(200);
}

function diffList(from: string[], to: string[]) {
  return {
    added: to.filter((x) => !from.includes(x)),
    removed: from.filter((x) => !to.includes(x)),
  };
}

export function diffStoryStates(from: StoryState, to: StoryState) {
  return {
    currentEpisode:
      from.currentEpisode !== to.currentEpisode
        ? { from: from.currentEpisode, to: to.currentEpisode }
        : null,
    inventory: diffList(from.inventory, to.inventory),
    facts: diffList(from.facts, to.facts),
    goals: diffList(from.goals, to.goals),
    secretsKnown: diffList(from.secretsKnown, to.secretsKnown),
    secretsUnknown: diffList(from.secretsUnknown, to.secretsUnknown),
    openQuestions: diffList(from.openQuestions, to.openQuestions),
    pastDecisions: diffList(from.pastDecisions, to.pastDecisions),
    pendingConsequences: diffList(from.pendingConsequences, to.pendingConsequences),
  };
}

export function checkCanonCompatibility(state: StoryState, canon: string[]): string[] {
  const contradictions: string[] = [];
  for (const rule of canon) {
    const words = rule.toLowerCase().trim().split(/\s+/);
    const negated = [
      `not ${rule.toLowerCase()}`,
      [...words.slice(0, -1), "not", words[words.length - 1]].join(" "),
      [...words.slice(0, -1), "no longer", words[words.length - 1]].join(" "),
    ];
    for (const fact of state.facts) {
      if (negated.includes(fact.toLowerCase())) {
        contradictions.push(fact);
      }
    }
  }
  return contradictions;
}
