import { describe, expect, it } from "bun:test";
import { StoryStateSchema, checkCanonCompatibility, diffStoryStates } from "./story-state";

describe("story state", () => {
  it("parses a state with defaults", () => {
    const state = StoryStateSchema.parse({});
    expect(state.currentEpisode).toBe(1);
    expect(state.facts).toEqual([]);
  });

  it("diffs list fields", () => {
    const a = StoryStateSchema.parse({ facts: ["x"], goals: [] });
    const b = StoryStateSchema.parse({ facts: ["x", "y"], goals: ["g"] });
    const diff = diffStoryStates(a, b);
    expect(diff.facts.added).toEqual(["y"]);
    expect(diff.facts.removed).toEqual([]);
    expect(diff.goals.added).toEqual(["g"]);
  });

  it("flags canon contradictions", () => {
    const state = StoryStateSchema.parse({ facts: ["the city is not safe", "the city is safe"] });
    const contradictions = checkCanonCompatibility(state, ["the city is safe"]);
    expect(contradictions).toEqual(["the city is not safe"]);
  });
});
