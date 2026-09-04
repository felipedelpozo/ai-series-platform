import { describe, expect, it } from "bun:test";
import { StoryStateSchema } from "@ai-series/story";
import { computeNextStoryState } from "./loop";

describe("computeNextStoryState", () => {
  it("advances the episode and records the audience decision", () => {
    const current = StoryStateSchema.parse({
      currentEpisode: 1,
      facts: ["el héroe vive en Madrid"],
      canon: ["el héroe vive en Madrid"],
    });
    const next = computeNextStoryState(current, { label: "A" }, 2);
    expect(next.currentEpisode).toBe(2);
    expect(next.pastDecisions).toEqual(["A"]);
    expect(next.facts).toEqual(["el héroe vive en Madrid"]);
  });

  it("appends decisions without mutating the input state", () => {
    const current = StoryStateSchema.parse({ pastDecisions: ["prev"] });
    const next = computeNextStoryState(current, { label: "B" }, 2);
    expect(current.pastDecisions).toEqual(["prev"]);
    expect(next.pastDecisions).toEqual(["prev", "B"]);
  });

  it("preserves characters, relationships and canon across the transition", () => {
    const current = StoryStateSchema.parse({
      currentEpisode: 1,
      characters: [{ id: "c1", name: "Lía", location: "casa", state: "alerta", relationships: [{ character: "c2", trust: 0.5 }] }],
      canon: ["Lía existe"],
    });
    const next = computeNextStoryState(current, { label: "A" }, 2);
    expect(next.characters).toEqual(current.characters);
    expect(next.canon).toEqual(["Lía existe"]);
  });
});
