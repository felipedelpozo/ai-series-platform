import { describe, expect, it } from "bun:test";
import { CharacterSchema, LocationSchema, PropSchema } from "./entities";

describe("entity schemas", () => {
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
