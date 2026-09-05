import { describe, expect, it } from "bun:test";
import type { Db } from "@ai-series/db";
import {
  BibleSchema,
  appendBibleRevisionInWorkspace,
  buildBiblePrompt,
  createSeriesInWorkspace,
} from "./series";

const bible = {
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
};

describe("series bible schema", () => {
  it("validates a complete bible", () => {
    const parsed = BibleSchema.parse(bible);
    expect(parsed.canon).toEqual(["the city never sleeps"]);
  });

  it("rejects a bible missing required fields", () => {
    expect(() => BibleSchema.parse({ title: "T" })).toThrow();
  });

  it("creates a series in the explicit workspace without opening a transaction", async () => {
    let inserted: Record<string, unknown> | undefined;
    const executor = {
      insert: () => ({
        values: (value: Record<string, unknown>) => {
          inserted = value;
          return { returning: async () => [{ id: "series-1" }] };
        },
      }),
      transaction: () => {
        throw new Error("primitive opened a nested transaction");
      },
    } as unknown as Db;

    const id = await createSeriesInWorkspace(executor, {
      workspaceId: "workspace-2",
      name: "  Neon City  ",
    });

    expect(id).toBe("series-1");
    expect(inserted).toMatchObject({
      workspaceId: "workspace-2",
      name: "Neon City",
      slug: "neon-city",
    });
  });

  it("appends a Bible revision through the caller executor", async () => {
    let selectCount = 0;
    const inserted: Record<string, unknown>[] = [];
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
          inserted.push(value);
          return { returning: async () => [{ id: "bible-2" }] };
        },
      }),
      transaction: () => {
        throw new Error("primitive opened a nested transaction");
      },
    } as unknown as Db;

    const result = await appendBibleRevisionInWorkspace(executor, {
      workspaceId: "workspace-1",
      seriesId: "series-1",
      bible,
    });

    expect(result).toEqual({ id: "bible-2", version: 2 });
    expect(inserted[0]).toMatchObject({
      seriesId: "series-1",
      version: 2,
      isActive: true,
      title: "T",
    });
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
