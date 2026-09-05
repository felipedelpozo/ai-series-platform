import { describe, expect, it } from "bun:test";
import type { Db } from "@ai-series/db";
import {
  SceneWithShotsSchema,
  ShotSchema,
  insertSceneShotSetInWorkspace,
  replaceEpisodeAggregateRevisionInWorkspace,
} from "./scenes";

const shot = {
  type: "close-up",
  subject: "Rin",
  action: "turns",
  composition: "centered",
  camera: "static",
  lens: "50mm",
  lighting: "low key",
  emotion: "tense",
  requiredReferences: ["c1"],
  imagePrompt: "a close-up of Rin",
  videoPrompt: "Rin turns slowly",
  continuityConstraints: ["red coat"],
};

const plan = {
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

const screenplayScene = {
  purpose: "Reveal the key",
  locationId: "location-1",
  characterIds: ["character-1"],
  propIds: ["prop-1"],
  action: "Rin opens her hand.",
  dialogue: "RIN: It was here all along.",
  estimatedDuration: "12s",
  entryContinuity: "Rin enters empty-handed.",
  exitContinuity: "Rin holds the key.",
  shots: [shot],
};

describe("shot schema", () => {
  it("validates a complete shot", () => {
    const parsed = ShotSchema.parse(shot);
    expect(parsed.type).toBe("close-up");
  });

  it("rejects a shot missing required fields", () => {
    expect(() => ShotSchema.parse({ type: "x" })).toThrow();
  });

  it("maps structured screenplay fields directly to the canonical Scene row", async () => {
    const inserted: Record<string, unknown>[] = [];
    let selectCount = 0;
    let insertCount = 0;
    const executor = {
      select: () => {
        selectCount += 1;
        if (selectCount === 1) {
          return {
            from: () => ({
              innerJoin: () => ({
                where: () => ({
                  limit: () => ({
                    for: async () => [{ id: "plan-2", seriesId: "series-1", episodeNumber: 1 }],
                  }),
                }),
              }),
            }),
          };
        }
        return { from: () => ({ where: () => ({ limit: async () => [] }) }) };
      },
      insert: () => {
        insertCount += 1;
        const current = insertCount;
        return {
          values: (value: Record<string, unknown>) => {
            inserted.push(value);
            return {
              returning: async () => [{ id: current === 1 ? "scene-1" : "shot-1" }],
            };
          },
        };
      },
      delete: () => {
        throw new Error("immutable primitive deleted historical rows");
      },
      update: () => {
        throw new Error("immutable primitive updated historical rows");
      },
      transaction: () => {
        throw new Error("primitive opened a nested transaction");
      },
    } as unknown as Db;

    const scene = SceneWithShotsSchema.parse(screenplayScene);
    const result = await insertSceneShotSetInWorkspace(executor, {
      workspaceId: "workspace-1",
      planId: "plan-2",
      scenes: [scene],
    });

    expect(result).toEqual({ sceneIds: ["scene-1"], shotIds: ["shot-1"] });
    expect(inserted[0]?.data).toEqual({
      purpose: "Reveal the key",
      locationId: "location-1",
      characterIds: ["character-1"],
      propIds: ["prop-1"],
      action: "Rin opens her hand.",
      dialogue: "RIN: It was here all along.",
      estimatedDuration: "12s",
      entryContinuity: "Rin enters empty-handed.",
      exitContinuity: "Rin holds the key.",
    });
    expect(inserted[1]).toMatchObject({ sceneId: "scene-1", order: 0, data: shot });
  });

  it("replaces an existing scene set by creating an exact new plan aggregate revision", async () => {
    let selectCount = 0;
    let insertCount = 0;
    const inserted: Record<string, unknown>[] = [];
    const executor = {
      select: () => {
        selectCount += 1;
        if (selectCount === 1) {
          return {
            from: () => ({
              innerJoin: () => ({
                where: () => ({
                  limit: async () => [{ seriesId: "series-1" }],
                }),
              }),
            }),
          };
        }
        if (selectCount === 2) {
          return {
            from: () => ({
              where: () => ({
                limit: () => ({ for: async () => [{ id: "series-1" }] }),
              }),
            }),
          };
        }
        if (selectCount === 3) {
          return {
            from: () => ({
              where: () => ({
                limit: () => ({
                  for: async () => [
                    {
                      id: "plan-1",
                      seriesId: "series-1",
                      episodeNumber: 1,
                      data: plan,
                      isActive: true,
                    },
                  ],
                }),
              }),
            }),
          };
        }
        if (selectCount === 4) {
          return {
            from: () => ({
              where: () => ({
                limit: () => ({ for: async () => [{ id: "series-1" }] }),
              }),
            }),
          };
        }
        if (selectCount === 5) {
          return { from: () => ({ where: async () => [{ version: 1 }] }) };
        }
        if (selectCount === 6) {
          return {
            from: () => ({
              innerJoin: () => ({
                where: () => ({
                  limit: () => ({
                    for: async () => [{ id: "plan-2", seriesId: "series-1", episodeNumber: 1 }],
                  }),
                }),
              }),
            }),
          };
        }
        return { from: () => ({ where: () => ({ limit: async () => [] }) }) };
      },
      update: () => ({ set: () => ({ where: async () => undefined }) }),
      insert: () => {
        insertCount += 1;
        const current = insertCount;
        return {
          values: (value: Record<string, unknown>) => {
            inserted.push(value);
            const id = current === 1 ? "plan-2" : current === 2 ? "scene-2" : "shot-2";
            return { returning: async () => [{ id }] };
          },
        };
      },
      delete: () => {
        throw new Error("replacement deleted historical rows");
      },
      transaction: () => {
        throw new Error("primitive opened a nested transaction");
      },
    } as unknown as Db;

    const result = await replaceEpisodeAggregateRevisionInWorkspace(executor, {
      workspaceId: "workspace-1",
      planId: "plan-1",
      scenes: [SceneWithShotsSchema.parse(screenplayScene)],
      source: "copilot",
    });

    expect(result).toEqual({
      planId: "plan-2",
      planVersion: 2,
      sceneIds: ["scene-2"],
      shotIds: ["shot-2"],
    });
    expect(inserted[0]).toMatchObject({
      seriesId: "series-1",
      episodeNumber: 1,
      version: 2,
      data: plan,
      source: "copilot",
      isActive: true,
    });
    expect(inserted[1]).toMatchObject({ planId: "plan-2", order: 0 });
  });
});
