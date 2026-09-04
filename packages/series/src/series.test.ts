import { describe, expect, it } from "bun:test";
import { BibleSchema } from "./series";

describe("series bible schema", () => {
  it("validates a complete bible", () => {
    const parsed = BibleSchema.parse({
      title: "T",
      premise: "P",
      genre: "G",
      tone: "T",
      audience: "A",
      format: "F",
      language: "es",
      episodeDuration: "60s",
      narrativeRules: ["keep continuity"],
      visualStyle: "noir",
      canon: ["the city never sleeps"],
      prohibitions: ["no time travel"],
      description: "D",
    });
    expect(parsed.canon).toEqual(["the city never sleeps"]);
  });

  it("rejects a bible missing required fields", () => {
    expect(() => BibleSchema.parse({ title: "T" })).toThrow();
  });
});
