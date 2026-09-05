import { describe, expect, it } from "bun:test";
import type { Db } from "@ai-series/db";
import { EpisodePlanSchema, appendEpisodePlanRevisionInWorkspace } from "./planner";

const valid = {
  hook: "A door opens",
  dramaticGoal: "find the key",
  beats: ["beat 1"],
  targetDuration: "60s",
  characterIds: ["c1"],
  locationIds: ["l1"],
  propIds: ["p1"],
  reveals: ["the truth"],
  requiredContinuity: ["Rin is here"],
  closing: "Rin leaves",
  cliffhanger: "the door closes",
  audienceQuestion: null,
  proposedStoryStateAfter: {
    currentEpisode: 2,
    characters: [],
    inventory: [],
    facts: ["found the key"],
    goals: [],
    secretsKnown: [],
    secretsUnknown: [],
    openQuestions: [],
    pastDecisions: [],
    pendingConsequences: [],
    canon: [],
  },
};

describe("episode plan schema", () => {
  it("validates a complete plan", () => {
    const plan = EpisodePlanSchema.parse(valid);
    expect(plan.dramaticGoal).toBe("find the key");
    expect(plan.proposedStoryStateAfter.facts).toEqual(["found the key"]);
  });

  it("rejects a plan missing required fields", () => {
    expect(() => EpisodePlanSchema.parse({ hook: "x" })).toThrow();
  });

  it("appends and activates a plan revision through the caller executor", async () => {
    const inserts: Record<string, unknown>[] = [];
    let selectCount = 0;
    const executor = {
      select: () => {
        selectCount += 1;
        if (selectCount === 1) {
          return {
            from: () => ({
              where: () => ({
                limit: () => ({ for: async () => [{ id: "series-1" }] }),
              }),
            }),
          };
        }
        return { from: () => ({ where: async () => [{ version: 1 }] }) };
      },
      update: () => ({ set: () => ({ where: async () => undefined }) }),
      insert: () => ({
        values: (value: Record<string, unknown>) => {
          inserts.push(value);
          return { returning: async () => [{ id: "plan-2" }] };
        },
      }),
      transaction: () => {
        throw new Error("primitive opened a nested transaction");
      },
    } as unknown as Db;

    const result = await appendEpisodePlanRevisionInWorkspace(executor, {
      workspaceId: "workspace-1",
      seriesId: "series-1",
      episodeNumber: 1,
      data: valid,
    });

    expect(result).toEqual({ id: "plan-2", version: 2 });
    expect(inserts[0]).toMatchObject({
      seriesId: "series-1",
      episodeNumber: 1,
      version: 2,
      isActive: true,
    });
  });
});
