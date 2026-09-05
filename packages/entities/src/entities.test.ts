import { describe, expect, it } from "bun:test";
import {
  CharacterSchema,
  EntityTypeSchema,
  LocationSchema,
  PropSchema,
  buildEntityPrompt,
} from "./entities";

describe("entity schemas", () => {
  it("accepts only canonical entity types", () => {
    expect(EntityTypeSchema.parse("character")).toBe("character");
    expect(EntityTypeSchema.safeParse("vehicle").success).toBe(false);
  });

  it("validates a character with defaults", () => {
    const c = CharacterSchema.parse({
      role: "hero",
      apparentAge: "30",
      appearance: "tall",
      distinctiveTraits: ["scar"],
      wardrobe: "coat",
      personality: "stoic",
      voice: "deep",
      state: "active",
      visualRules: ["blue tones"],
    });
    expect(c.distinctiveTraits).toEqual(["scar"]);
    expect(c.appearance).toBe("tall");
  });

  it("validates a location", () => {
    const l = LocationSchema.parse({
      description: "a city",
      zones: ["downtown"],
      lighting: "neon",
      era: "near future",
      restrictions: ["no daylight"],
      visualRules: ["rain"],
    });
    expect(l.zones).toEqual(["downtown"]);
  });

  it("validates a prop", () => {
    const p = PropSchema.parse({
      description: "an old key",
      material: "brass",
      scale: "small",
      state: "weathered",
      owner: "Rin",
      narrativeRelevance: "unlocks the vault",
    });
    expect(p.material).toBe("brass");
  });
});

describe("entity generation prompt", () => {
  it("keeps the base prompt unchanged without creator details", () => {
    expect(buildEntityPrompt("Create a character")).toBe("Create a character");
    expect(buildEntityPrompt("Create a character", "   ")).toBe("Create a character");
  });

  it("adds normalized creator details while preserving the output contract", () => {
    const prompt = buildEntityPrompt(
      "Create a location",
      "  An abandoned metro station beneath Madrid.  ",
    );

    expect(prompt).toContain("Creator-provided entity details:");
    expect(prompt).toContain(
      "<entity_details>\nAn abandoned metro station beneath Madrid.\n</entity_details>",
    );
    expect(prompt).toContain("preserving the required output contract");
  });
});
