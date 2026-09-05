import { describe, expect, it } from "bun:test";
import type { Db } from "@ai-series/db";
import {
  CharacterSchema,
  EntityTypeSchema,
  LocationSchema,
  PropSchema,
  appendEntityRevisionInWorkspace,
  buildEntityPrompt,
  createEntityInWorkspace,
} from "./entities";

const character = {
  role: "hero",
  apparentAge: "30",
  appearance: "tall",
  distinctiveTraits: ["scar"],
  wardrobe: "coat",
  personality: "stoic",
  voice: "deep",
  state: "active",
  visualRules: ["blue tones"],
};

describe("entity schemas", () => {
  it("accepts only canonical entity types", () => {
    expect(EntityTypeSchema.parse("character")).toBe("character");
    expect(EntityTypeSchema.safeParse("vehicle").success).toBe(false);
  });

  it("validates a character with defaults", () => {
    const c = CharacterSchema.parse(character);
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

  it("creates the entity and first immutable version with an explicit workspace", async () => {
    const inserted: Record<string, unknown>[] = [];
    let selectCount = 0;
    let insertCount = 0;
    const executor = {
      select: () => {
        selectCount += 1;
        return {
          from: () => ({
            where: () => ({
              limit: () => ({ for: async () => [{ id: "series-1" }] }),
            }),
          }),
        };
      },
      insert: () => {
        insertCount += 1;
        const current = insertCount;
        return {
          values: (value: Record<string, unknown>) => {
            inserted.push(value);
            return {
              returning: async () => [{ id: current === 1 ? "entity-1" : "entity-version-1" }],
            };
          },
        };
      },
      transaction: () => {
        throw new Error("primitive opened a nested transaction");
      },
    } as unknown as Db;

    const result = await createEntityInWorkspace(executor, {
      workspaceId: "workspace-2",
      seriesId: "series-1",
      type: "character",
      name: "  Rin  ",
      data: character,
    });

    expect(selectCount).toBe(1);
    expect(result).toEqual({
      entityId: "entity-1",
      versionId: "entity-version-1",
      version: 1,
    });
    expect(inserted[0]).toMatchObject({ seriesId: "series-1", name: "Rin" });
    expect(inserted[1]).toMatchObject({
      entityId: "entity-1",
      version: 1,
      isActive: true,
    });
  });

  it("appends a new entity version without mutating historical version data", async () => {
    let selectCount = 0;
    const updates: Record<string, unknown>[] = [];
    const inserted: Record<string, unknown>[] = [];
    const executor = {
      select: () => {
        selectCount += 1;
        if (selectCount === 1) {
          return {
            from: () => ({
              innerJoin: () => ({
                where: () => ({
                  limit: () => ({
                    for: async () => [
                      { id: "entity-1", name: "Rin", type: "character", status: "active" },
                    ],
                  }),
                }),
              }),
            }),
          };
        }
        if (selectCount === 2) {
          return {
            from: () => ({
              where: () => ({
                limit: async () => [
                  { id: "version-1", entityId: "entity-1", name: "Rin", data: character },
                ],
              }),
            }),
          };
        }
        return { from: () => ({ where: async () => [{ version: 1 }] }) };
      },
      update: () => ({
        set: (value: Record<string, unknown>) => {
          updates.push(value);
          return { where: async () => undefined };
        },
      }),
      insert: () => ({
        values: (value: Record<string, unknown>) => {
          inserted.push(value);
          return { returning: async () => [{ id: "version-2" }] };
        },
      }),
      transaction: () => {
        throw new Error("primitive opened a nested transaction");
      },
    } as unknown as Db;

    const result = await appendEntityRevisionInWorkspace(executor, {
      workspaceId: "workspace-1",
      entityId: "entity-1",
      name: "Rin Vega",
    });

    expect(result).toEqual({ entityId: "entity-1", versionId: "version-2", version: 2 });
    expect(updates[0]).toEqual({ isActive: false });
    expect(inserted[0]).toMatchObject({
      entityId: "entity-1",
      version: 2,
      name: "Rin Vega",
      data: character,
      isActive: true,
    });
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
