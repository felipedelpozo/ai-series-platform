import { describe, expect, test } from "bun:test";
import {
  captureAuthorizedContext,
  type CanonicalBase,
  type CanonicalContextReader,
} from "./context";

const base: CanonicalBase = {
  resourceType: "series",
  resourceId: "series-1",
  version: 1,
  fingerprint: "a".repeat(64),
};

function reader(overrides: Partial<CanonicalContextReader> = {}): CanonicalContextReader {
  return {
    getMembership: async () => ({ role: "editor" }),
    loadSeries: async ({ seriesId }) => (seriesId === "series-1" ? { id: seriesId } : null),
    loadActiveBible: async () => ({ id: "bible-1", version: 2 }),
    loadActiveEntities: async () => [{ id: "entity-1", version: 3 }],
    loadStoryState: async () => ({ id: "story-1", version: 4 }),
    loadEpisodePlan: async ({ episodePlanId }) =>
      episodePlanId === "plan-1" ? { id: episodePlanId, seriesId: "series-1" } : null,
    loadResource: async ({ id }) => ({ id }),
    basesFor: async () => [base],
    ...overrides,
  };
}

describe("captureAuthorizedContext", () => {
  test("captures Bible, entities, StoryState and EpisodePlan under one authorized Series", async () => {
    const result = await captureAuthorizedContext(reader(), {
      workspaceId: "workspace-1",
      actorUserId: "user-1",
      selection: { seriesId: "series-1", episodePlanId: "plan-1", episodeNumber: 1 },
      now: new Date("2026-09-05T10:00:00.000Z"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.context).toMatchObject({
      bible: { id: "bible-1" },
      entities: [{ id: "entity-1" }],
      storyState: { id: "story-1" },
      episodePlan: { id: "plan-1" },
    });
    expect(result.snapshot.fingerprint).toHaveLength(64);
  });

  test("returns the same non-enumerating result for missing membership and foreign Series", async () => {
    const noMembership = await captureAuthorizedContext(
      reader({ getMembership: async () => null }),
      { workspaceId: "workspace-1", actorUserId: "user-1", selection: { seriesId: "series-1" } },
    );
    const foreignSeries = await captureAuthorizedContext(reader({ loadSeries: async () => null }), {
      workspaceId: "workspace-1",
      actorUserId: "user-1",
      selection: { seriesId: "foreign" },
    });
    expect(noMembership).toEqual(foreignSeries);
  });

  test("rejects EpisodePlan context without its Series boundary", async () => {
    expect(
      await captureAuthorizedContext(reader(), {
        workspaceId: "workspace-1",
        actorUserId: "user-1",
        selection: { episodePlanId: "plan-1" },
      }),
    ).toMatchObject({ ok: false, code: "invalid_context" });
  });
});
