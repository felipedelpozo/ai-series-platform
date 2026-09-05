import { describe, expect, test } from "bun:test";
import type { CanonicalChange } from "./contracts";
import { resolveSceneSetApplicationTarget, type CanonicalResultLink } from "./apply";

const existingPlanOperation = {
  type: "scene_set.replace_with_revision",
  planId: "plan-1",
  scenes: [],
  base: {
    resourceType: "episode_plan",
    resourceId: "plan-1",
    revisionId: "revision-1",
    version: 1,
    fingerprint: "a".repeat(64),
  },
} satisfies Extract<CanonicalChange, { type: "scene_set.replace_with_revision" }>;

describe("scene set application target", () => {
  test("requires a new canonical plan revision for an existing plan", () => {
    expect(resolveSceneSetApplicationTarget(existingPlanOperation, new Map())).toEqual({
      planId: "plan-1",
      mode: "replace_with_plan_revision",
    });
  });

  test("attaches scenes directly only to the plan created earlier in the same change set", () => {
    const operation = {
      type: "scene_set.replace_with_revision",
      planRef: "plan:new",
      scenes: [],
    } satisfies Extract<CanonicalChange, { type: "scene_set.replace_with_revision" }>;
    const plan: CanonicalResultLink = {
      resourceType: "episode_plan",
      resourceId: "plan-2",
      version: 1,
      href: "/studio/plan-2",
    };
    expect(resolveSceneSetApplicationTarget(operation, new Map([["plan:new", plan]]))).toEqual({
      planId: "plan-2",
      mode: "attach_to_proposed_plan",
    });
  });

  test("rejects a local reference that does not resolve to an EpisodePlan", () => {
    const operation = {
      type: "scene_set.replace_with_revision",
      planRef: "plan:new",
      scenes: [],
    } satisfies Extract<CanonicalChange, { type: "scene_set.replace_with_revision" }>;
    const wrongKind: CanonicalResultLink = {
      resourceType: "series",
      resourceId: "series-1",
      href: "/series?seriesId=series-1",
    };
    expect(
      resolveSceneSetApplicationTarget(operation, new Map([["plan:new", wrongKind]])),
    ).toBeNull();
  });
});
