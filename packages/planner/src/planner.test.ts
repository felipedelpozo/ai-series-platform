import { describe, expect, it } from "bun:test";
import type { Db } from "@ai-series/db";
import {
  EpisodePlanSchema,
  appendEpisodePlanRevisionInWorkspace,
  appendEntitiesContext,
  buildEntitiesContext,
  buildEpisodePlanPrompt,
  sanitizePlanEntityIds,
} from "./planner";

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

describe("episode plan prompt", () => {
  it("keeps the base prompt unchanged without creator details", () => {
    expect(buildEpisodePlanPrompt("Create an episode plan")).toBe("Create an episode plan");
    expect(buildEpisodePlanPrompt("Create an episode plan", "   ")).toBe("Create an episode plan");
  });

  it("adds normalized creator details while preserving the output contract", () => {
    const prompt = buildEpisodePlanPrompt(
      "Create an episode plan",
      "  A heist in the abandoned metro, with a double cross at the end.  ",
    );

    expect(prompt).toContain("Creator-provided episode details:");
    expect(prompt).toContain(
      "<episode_details>\nA heist in the abandoned metro, with a double cross at the end.\n</episode_details>",
    );
    expect(prompt).toContain("preserving the required output contract");
  });
});

describe("episode plan entity context", () => {
  it("builds a grouped JSON context from active entities", () => {
    const context = buildEntitiesContext([
      { id: "c1", type: "character", name: "Alex", data: { role: "protagonist" } },
      { id: "l1", type: "location", name: "Facility", data: {} },
    ]);
    const parsed = JSON.parse(context);
    expect(parsed.characters).toEqual([{ id: "c1", name: "Alex", data: { role: "protagonist" } }]);
    expect(parsed.locations).toEqual([{ id: "l1", name: "Facility", data: {} }]);
    expect(parsed.props).toEqual([]);
  });

  it("ignores non-canonical historical entity types", () => {
    const context = buildEntitiesContext([
      { id: "bad", type: "vehicle", name: "Van", data: {} },
      { id: "c1", type: "character", name: "Alex", data: {} },
    ] as Parameters<typeof buildEntitiesContext>[0]);

    expect(JSON.parse(context).characters).toEqual([{ id: "c1", name: "Alex", data: {} }]);
  });

  it("appends entities context with ids-only instruction", () => {
    const prompt = appendEntitiesContext("Create a plan", "{}");
    expect(prompt).toContain("Available series entities");
    expect(prompt).toContain("<series_entities>");
    expect(prompt).toContain("Do not invent new ids");
  });

  it("sanitizes plan entity ids to known entities only", () => {
    const plan = EpisodePlanSchema.parse({
      ...valid,
      characterIds: ["c1", "ghost"],
      locationIds: ["l1", "ghost"],
      propIds: ["p1", "ghost"],
    });
    const sanitized = sanitizePlanEntityIds(plan, [
      { id: "c1", type: "character", name: "Alex", data: {} },
      { id: "l1", type: "location", name: "Facility", data: {} },
      { id: "p1", type: "prop", name: "Key", data: {} },
    ]);
    expect(sanitized.characterIds).toEqual(["c1"]);
    expect(sanitized.locationIds).toEqual(["l1"]);
    expect(sanitized.propIds).toEqual(["p1"]);
  });
});
