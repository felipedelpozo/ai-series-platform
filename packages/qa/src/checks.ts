export type FindingInput = {
  check: string;
  severity: "low" | "medium" | "high";
  evidence?: string;
  target?: string;
  repair?: string;
  shotId?: string;
};

export function checkDuplicateShots(
  shots: { id: string; data: Record<string, unknown> }[],
): FindingInput[] {
  const seen = new Map<string, string>();
  const findings: FindingInput[] = [];
  for (const shot of shots) {
    const key = `${String(shot.data.type ?? "")}|${String(shot.data.subject ?? "")}`;
    if (seen.has(key)) {
      findings.push({
        check: "duplicate-shot",
        severity: "medium",
        evidence: `duplicate shot (${key})`,
        target: shot.id,
        repair: "remove or regenerate the duplicate",
        shotId: shot.id,
      });
    } else {
      seen.set(key, shot.id);
    }
  }
  return findings;
}

export function checkMissingCliffhanger(plan: {
  data: Record<string, unknown>;
}): FindingInput[] {
  const cliffhanger = String(plan.data.cliffhanger ?? "").trim();
  return cliffhanger
    ? []
    : [
        {
          check: "missing-cliffhanger",
          severity: "high",
          evidence: "episode plan has no cliffhanger",
          target: "plan",
          repair: "add a cliffhanger to the plan",
        },
      ];
}

export function checkEmptyOutput(
  shots: { id: string }[],
  shotsWithKeyframe: Set<string>,
): FindingInput[] {
  return shots
    .filter((s) => !shotsWithKeyframe.has(s.id))
    .map((s) => ({
      check: "empty-output",
      severity: "high",
      evidence: "no keyframe generated",
      target: s.id,
      repair: "generate the keyframe",
      shotId: s.id,
    }));
}
