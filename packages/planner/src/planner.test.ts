import { describe, expect, it } from "bun:test";
import { EpisodePlanSchema } from "./planner";

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
});
