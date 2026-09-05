import { describe, expect, it } from "bun:test";
import { BibleSchema, buildBiblePrompt } from "./series";

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

describe("series bible prompt", () => {
  it("keeps the base prompt unchanged without creator details", () => {
    expect(buildBiblePrompt("Create a bible")).toBe("Create a bible");
    expect(buildBiblePrompt("Create a bible", "   ")).toBe("Create a bible");
  });

  it("adds normalized creator details while preserving the output contract", () => {
    const prompt = buildBiblePrompt("Create a bible", "  A noir mystery in Madrid.  ");

    expect(prompt).toContain("Creator-provided series details:");
    expect(prompt).toContain("<series_details>\nA noir mystery in Madrid.\n</series_details>");
    expect(prompt).toContain("preserving the required output contract");
  });
});
