import { describe, expect, test } from "bun:test";
import { canonicalResourceLink, buildGroundedAnswer, separateMixedIntent } from "./query";

const fp = "a".repeat(64);

describe("grounded canonical queries", () => {
  test("answers only from supplied authorized resources and includes exact sources", () => {
    const answer = buildGroundedAnswer("¿Cuál es el tono de Aurora?", [
      {
        resource: {
          type: "series",
          id: "11111111-1111-4111-8111-111111111111",
          label: "Aurora",
          href: "/series?seriesId=1",
        },
        baseFingerprint: fp,
        fields: { tone: "misterioso", status: "active" },
      },
      {
        resource: { type: "series", id: "22222222-2222-4222-8222-222222222222", label: "Cometa" },
        baseFingerprint: "b".repeat(64),
        fields: { tone: "comedia" },
      },
    ]);
    expect(answer.deterministic).toBe(true);
    expect(answer.text).toContain("misterioso");
    expect(answer.text).not.toContain("comedia");
    expect(answer.sources).toEqual([
      expect.objectContaining({ baseFingerprint: fp, fieldPaths: ["status", "tone"] }),
    ]);
  });

  test("refuses to claim grounding without an authorized source", () => {
    expect(() => buildGroundedAnswer("¿Qué hay?", [])).toThrow("authorized canonical source");
  });

  test("keeps query, proposal and paid boundaries separate", () => {
    const result = separateMixedIntent(
      "¿Cuál es el estado actual? Además cambia el título. Y también genera un vídeo.",
    );
    expect(result.queries).toHaveLength(1);
    expect(result.actionable.map((part) => part.classification)).toEqual([
      "canonical_mutation",
      "paid_job",
    ]);
    expect(result.requiresProposal).toBe(true);
    expect(result.requiresCostConfirmation).toBe(true);
  });

  test("keeps unsupported canonical resources out of an actionable contract", () => {
    const result = separateMixedIntent("¿Qué temporadas existen? Además crea una temporada nueva.");
    expect(result.queries[0]?.unsupportedResource).toBe("season");
    expect(result.actionable[0]?.unsupportedResource).toBe("season");
    expect(result.requiresProposal).toBe(true);
  });

  test("builds only canonical deep-link shapes", () => {
    expect(canonicalResourceLink({ type: "series", id: "series" })).toBe("/series?seriesId=series");
    expect(canonicalResourceLink({ type: "character", id: "entity", seriesId: "series" })).toBe(
      "/series?seriesId=series",
    );
    expect(canonicalResourceLink({ type: "shot", id: "shot", planId: "plan" })).toBe(
      "/studio/plan",
    );
  });
});
