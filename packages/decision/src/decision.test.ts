import { describe, expect, it } from "bun:test";
import { decideFromSignals, classifySignal } from "./decision";
import type { SignalLike } from "./decision";

function signal(
  id: string,
  input: { comment?: string; liked?: boolean; reaction?: string; metadata?: Record<string, unknown> },
): SignalLike {
  return {
    id,
    comment: input.comment ?? null,
    liked: input.liked ?? false,
    reaction: input.reaction ?? null,
    metadata: input.metadata ?? null,
  };
}

describe("classifySignal", () => {
  it("classifies explicit option votes", () => {
    const s = signal("1", { metadata: { optionLabel: "A" } });
    expect(classifySignal(s).intent).toBe("vote");
    expect(classifySignal(s).optionLabel).toBe("A");
  });

  it("classifies spontaneous comments as suggestions", () => {
    const s = signal("2", { comment: "que vuelva el villano" });
    expect(classifySignal(s).intent).toBe("suggestion");
  });

  it("classifies likes without comment as reactions", () => {
    const s = signal("3", { liked: true });
    expect(classifySignal(s).intent).toBe("reaction");
  });
});

describe("decideFromSignals", () => {
  it("picks the highest-scoring explicit option", () => {
    const signals = [
      signal("1", { metadata: { optionLabel: "A" } }),
      signal("2", { metadata: { optionLabel: "A" } }),
      signal("3", { metadata: { optionLabel: "B" } }),
    ];
    const result = decideFromSignals(signals);
    expect(result.winnerLabel).toBe("A");
    expect(result.candidates).toHaveLength(2);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("caps repeated identical text so spam cannot dominate", () => {
    const signals = Array.from({ length: 30 }, (_, i) =>
      signal(String(i), { comment: "lo mismo repetido mil veces" }),
    );
    const result = decideFromSignals(signals);
    const winner = result.candidates[0]!;
    expect(winner.effectiveCount).toBeLessThan(winner.signalCount);
    expect(winner.effectiveCount).toBe(5);
  });

  it("clusters semantically similar suggestions", () => {
    const signals = [
      signal("1", { comment: "que el héroe se redima" }),
      signal("2", { comment: "quiero que el héroe se redima por favor" }),
      signal("3", { comment: "que aparezca una nave alienígena" }),
    ];
    const result = decideFromSignals(signals);
    const suggestionCandidates = result.candidates.filter((c) => c.intent === "suggestion");
    expect(suggestionCandidates).toHaveLength(2);
  });

  it("returns zero confidence when there are no signals", () => {
    const result = decideFromSignals([]);
    expect(result.winnerLabel).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.candidates).toHaveLength(0);
  });
});
